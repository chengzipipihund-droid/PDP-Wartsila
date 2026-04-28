/**
 * alarmSequencer.js
 *
 * Listens for 'anomaly' from sensorSimulator.
 * Fires 4 alarms in sequence, each 5 seconds apart.
 * The first alarm is the root cause.
 *
 * Also kicks off the PDF+AI analysis immediately when the
 * first alarm fires, so results are ready by the time the
 * user opens the detail panel.
 */

import { sensorSimulator } from './sensorSimulator.js'
import { analyseWithPDF, generateReasoning } from './aiClient.js'
import { state } from '../state.js'

// ─── The 4 alarms to trigger (in order) ─────────────────────────────────────
// Root cause first: pump malfunction → low flow → bearing overheat → shaft vibration
const ALARM_SEQUENCE = [
  { id: 'AI_A1', description: 'Shaft Lubrication Oil Low Pressure Alarm',             severity: 'critical' },
  { id: 'AI_A2', description: 'Shaft Lubrication Oil Low Flow Alarm',                  severity: 'critical' },
  { id: 'AI_A3', description: 'Propeller Shaft Support Bearing High Temperature Alarm', severity: 'high'     },
  { id: 'AI_A4', description: 'Propeller Shaft High Vibration Alarm',                  severity: 'high'     },
]

const INTERVAL_MS = 1000  
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AlarmSequencer manages one "episode":
 *   anomaly detected → fire alarms sequentially → AI analysis
 *
 * wss  : WebSocket server (to push alarms to frontend)
 * store: shared in-memory state ({ activeAIAlarms, aiGroupResult })
 */
export class AlarmSequencer {
  constructor (wss, store) {
    this.wss              = wss
    this.store            = store
    this._abortController = null
    this._bind()
  }

  cancel () {
    if (this._abortController) {
      this._abortController.abort()
      this._abortController = null
      console.log('[AlarmSequencer] AI inference cancelled')
    }
  }

  _bind () {
    sensorSimulator.on('anomaly', ({ temp, timestamp, reason }) => {
      console.log('[AlarmSequencer] Anomaly received, starting alarm sequence')
      this._startSequence(temp, timestamp, reason)
    })

    sensorSimulator.on('normal', () => {
      console.log('[AlarmSequencer] Sensor normalised')
      // Optionally auto-clear alarms here if needed
    })
  }

  _startSequence (temp, timestamp, reason) {
    // Clear any previous episode
    this.store.activeAIAlarms  = []
    this.store.aiGroupResult   = null
    this.store.aiReasonings    = {}
    this.store.aiSuggestionsReady = false
    state.aiAlarms = []  // clear shared state too

    const triggeredAlarms = []

    ALARM_SEQUENCE.forEach((alarm, index) => {
      setTimeout(() => {
        const entry = {
          ...alarm,
          triggeredAt    : new Date(Date.now() + index * INTERVAL_MS).toISOString(),
          isRootCause    : index === 0,   // first alarm is root cause
          sensorTemp     : temp,
          anomalyReason  : reason,
          responsibility : 'ECR',
          person         : 'Chief Engineer - Erik Larsson',
        }

        this.store.activeAIAlarms.push(entry)
        triggeredAlarms.push(entry)
        state.aiAlarms.push(entry)  // expose via shared state for voice note lookups

        console.log(`[AlarmSequencer] Fired alarm ${index + 1}/${ALARM_SEQUENCE.length}: ${alarm.id}`)

        // Push to all connected WebSocket clients
        this._broadcast({
          type    : 'AI_ALARM_TRIGGERED',
          alarm   : entry,
          total   : ALARM_SEQUENCE.length,
          index,
        })

        // When the last alarm fires, kick off AI analysis
        if (index === ALARM_SEQUENCE.length - 1) {
          console.log('[AlarmSequencer] All alarms fired, starting AI analysis...')
          this._runAnalysis(triggeredAlarms)
        }
      }, index * INTERVAL_MS)
    })
  }

  async _runAnalysis (alarms) {
    this._abortController = new AbortController()
    const { signal } = this._abortController

    try {
      const result = await analyseWithPDF(alarms, (token) => {
        this._broadcast({ type: 'AI_THINKING_TOKEN', token })
      }, signal)

      if (signal.aborted) return

      this.store.aiGroupResult = result

      console.log('[AlarmSequencer] AI analysis complete, broadcasting result')
      this._broadcast({
        type     : 'AI_ANALYSIS_READY',
        result,
        alarmIds : ALARM_SEQUENCE.map(a => a.id),
      })

      // ── Phase 2: confidence + reasoning per suggestion ────────────────────
      const rootCauseAlarm = alarms.find(a => a.isRootCause) ?? alarms[0]
      const suggestions = result.suggestions ?? []

      suggestions.forEach((suggestion, i) => {
        this._broadcast({
          type            : 'AI_SUGGESTION_THINKING_START',
          suggestionId    : suggestion.id,
          suggestionTitle : suggestion.title,
          index           : i,
          total           : suggestions.length,
          rootCauseId     : result.rootCauseId,
        })
      })

      console.log('[AlarmSequencer] Generating reasoning for all', suggestions.length, 'suggestions (parallel)')

      const reasoningPromises = suggestions.map((suggestion, i) => {
        const startTime = Date.now()
        console.log(`[AlarmSequencer] START reasoning #${i + 1} (${suggestion.id})`)

        return generateReasoning(rootCauseAlarm, suggestion, (token) => {
          this._broadcast({ type: 'AI_THINKING_TOKEN', token, phase: 2, suggestionId: suggestion.id })
        }, signal)
        .then(reasoning => {
          if (signal.aborted) return
          const elapsed = Date.now() - startTime
          console.log(`[AlarmSequencer] FINISH reasoning #${i + 1} (${suggestion.id}) after ${elapsed}ms`)
          this._broadcast({
            type        : 'AI_REASONING_READY',
            suggestionId: suggestion.id,
            rootCauseId : result.rootCauseId,
            confidence  : reasoning.confidence,
            reasoning   : reasoning.reasoning,
            sensorData  : reasoning.sensorData,
          })
          if (!this.store.aiReasonings) this.store.aiReasonings = {}
          this.store.aiReasonings[suggestion.id] = {
            confidence : reasoning.confidence,
            reasoning  : reasoning.reasoning,
            sensorData : reasoning.sensorData,
          }
          console.log('[AlarmSequencer] Reasoning ready for', suggestion.id, '| confidence:', reasoning.confidence)
        })
        .catch(err => {
          if (signal.aborted) return  // silently swallow abort errors
          console.error('[AlarmSequencer] generateReasoning failed for', suggestion.id, ':', err.message)
          this._broadcast({
            type        : 'AI_REASONING_READY',
            suggestionId: suggestion.id,
            rootCauseId : result.rootCauseId,
            confidence  : null,
            reasoning   : null,
            sensorData  : [],
          })
        })
      })

      await Promise.all(reasoningPromises)

      if (signal.aborted) return

      this._broadcast({ type: 'AI_SUGGESTIONS_READY' })
      console.log('[AlarmSequencer] All suggestions ready')
      this.store.aiSuggestionsReady = true
    } catch (err) {
      if (signal.aborted) {
        console.log('[AlarmSequencer] AI inference aborted cleanly')
        return
      }
      console.error('[AlarmSequencer] AI analysis failed:', err.message)
      this._broadcast({
        type  : 'AI_ANALYSIS_FAILED',
        error : err.message,
      })
    }
  }

  _broadcast (payload) {
    const msg = JSON.stringify(payload)
    this.wss.clients.forEach(client => {
      if (client.readyState === 1 /* OPEN */) {
        client.send(msg)
      }
    })
  }
}
