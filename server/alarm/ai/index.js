/**
 * server/ai/index.js
 *
 * Entry point for the AI subsystem.
 * Call setupAI(app, wss) from server/index.js — that's the only change needed.
 *
 * Exposes:
 *   POST /api/ai/simulate-anomaly   trigger a demo anomaly sequence
 *   POST /api/ai/reset              reset for a new episode
 *   GET  /api/ai/active-alarms      currently triggered alarms
 *   GET  /api/ai/group-result       grouping + suggestions from PDF+AI
 *   POST /api/ai/reasoning          confidence + reasoning for one suggestion
 */

import { sensorSimulator } from './sensorSimulator.js'
import { AlarmSequencer   } from './alarmSequencer.js'
import { generateReasoning } from './aiClient.js'
import { state, withSuggestions } from '../state.js'
import alarmsData from '../data/alarms.js'
import { broadcast, setNewClientHook } from '../../websocket.js'

/**
 * @param {import('express').Express}   app
 * @param {import('ws').WebSocketServer} wss
 */
export function setupAI (app, wss) {
  // ── Shared in-memory store for this episode ────────────────────────────────
  const store = {
    activeAIAlarms : [],   // alarms triggered so far in this episode
    aiGroupResult  : null, // result from analyseWithPDF()
  }

  // ── Wire sequencer (listens to sensorSimulator events) ────────────────────
  new AlarmSequencer(wss, store)

  // Register catch-up hook: replay current AI state to newly connected clients ──
  setNewClientHook(() => {
    const msgs = []
    const alarms = store.activeAIAlarms ?? []
    const total  = alarms.length
    // Replay each triggered AI alarm
    alarms.forEach((alarm, index) => {
      msgs.push({ type: 'AI_ALARM_TRIGGERED', alarm, index, total })
    })
    // Replay analysis result
    const result = store.aiGroupResult
    if (result) {
      msgs.push({
        type    : 'AI_ANALYSIS_READY',
        result,
        alarmIds: alarms.map(a => a.id),
        // Tell the client the episode is already complete — collapse group immediately
        catchUp : store.aiSuggestionsReady === true,
      })
      // Replay per-suggestion reasoning
      const reasonings = store.aiReasonings ?? {}
      ;(result.suggestions ?? []).forEach(s => {
        const r = reasonings[s.id]
        if (r) {
          msgs.push({
            type        : 'AI_REASONING_READY',
            suggestionId: s.id,
            rootCauseId : result.rootCauseId,
            confidence  : r.confidence,
            reasoning   : r.reasoning,
            sensorData  : r.sensorData,
          })
        }
      })
      if (store.aiSuggestionsReady) msgs.push({ type: 'AI_SUGGESTIONS_READY' })
    }
    // Replay sensor status
    msgs.push({
      type: 'SENSOR_STATUS',
      status: {
        connected: sensorSimulator.serialReady,
        message: sensorSimulator.serialReady ? 'Connected' : 'Disconnected',
      },
    })
    return msgs
  })

  // ── Start sensor polling (no-op if already running) ───────────────────────
  sensorSimulator.start()

  // Broadcast live sensor readings to connected clients (for UI display)
  sensorSimulator.on('reading', ({ temp, timestamp }) => {
    broadcast({ type: 'SENSOR_READING', temp, timestamp })
  })

  // Broadcast sensor connection status (connected/disconnected)
  sensorSimulator.on('serial-status', (status) => {
    broadcast({ type: 'SENSOR_STATUS', status })
  })

  // ── Routes ────────────────────────────────────────────────────────────────

  /**
   * POST /api/ai/simulate-anomaly
   * Manually inject an anomaly — use this button in the demo.
   * Body: { temp?: number }   (default 97°C)
   */
  app.post('/api/ai/simulate-anomaly', (req, res) => {
    const temp = Number(req.body?.temp) || 97
    sensorSimulator.injectAnomaly(temp)
    res.json({ ok: true, message: `Anomaly injected at ${temp}°C` })
  })

  /**
   * POST /api/ai/clear-episode
   * Clears only the current AI episode (no alarm restore).
   * Used by "Simulate Anomaly" to start fresh without restoring the 50 alarms.
   */
  app.post('/api/ai/clear-episode', (req, res) => {
    sensorSimulator.reset()
    store.activeAIAlarms     = []
    store.aiGroupResult      = null
    store.aiReasonings       = {}
    store.aiSuggestionsReady = false
    state.aiAlarms           = []
    // Clear all alarms from state and notify all clients → blank slate before AI alarms fire
    state.alarms = []
    state.sessionLogs = {}
    broadcast({ type: 'CLEAR_ALL' })
    res.json({ ok: true, message: 'Episode cleared' })
  })

  /**
   * POST /api/ai/reset
   * Clears the current episode AND restores all 50 original alarms.
   */
  app.post('/api/ai/reset', (req, res) => {
    sensorSimulator.reset()
    store.activeAIAlarms     = []
    store.aiGroupResult      = null
    store.aiReasonings       = {}
    store.aiSuggestionsReady = false
    state.aiAlarms           = []
    // Restore the original 50 alarms
    state.alarms = alarmsData.map(a => ({ ...a }))
    // Clear session logs for AI alarms
    Object.keys(state.sessionLogs).forEach(id => {
      if (String(id).startsWith('AI_')) delete state.sessionLogs[id]
    })
    // Broadcast full reset to all connected clients
    broadcast({ type: 'FULL_RESET', data: state.alarms.map(withSuggestions) })
    res.json({ ok: true, message: 'Full reset complete' })
  })

  /**
   * GET /api/ai/active-alarms
   * Returns the alarms triggered in the current episode.
   *
   * Response:
   * {
   *   alarms: AlarmEntry[]
   * }
   */
  app.get('/api/ai/active-alarms', (req, res) => {
    res.json({ alarms: store.activeAIAlarms })
  })

  /**
   * GET /api/ai/group-result
   * Returns the PDF+AI grouping and suggestions.
   * Will be null until all 4 alarms have fired and AI analysis completes.
   *
   * Response: PDFAnalysisResult | { pending: true }
   */
  app.get('/api/ai/group-result', (req, res) => {
    if (!store.aiGroupResult) {
      return res.json({ pending: true })
    }
    res.json(store.aiGroupResult)
  })

  /**
   * POST /api/ai/reasoning
   * Returns confidence, reasoning, and fabricated sensor data for one suggestion.
   * Called when the user opens a specific suggestion in the detail panel.
   *
   * Body:
   * {
   *   suggestionId: string   // "s1" | "s2" | "s3"
   * }
   *
   * Response: ReasoningResult | { error: string }
   */
  app.post('/api/ai/reasoning', async (req, res) => {
    const { suggestionId } = req.body || {}

    if (!suggestionId) {
      return res.status(400).json({ error: 'suggestionId is required' })
    }
    if (!store.aiGroupResult) {
      return res.status(404).json({ error: 'No AI analysis result yet — alarms may still be firing' })
    }
    if (store.activeAIAlarms.length === 0) {
      return res.status(404).json({ error: 'No active alarms in current episode' })
    }

    const suggestion = store.aiGroupResult.suggestions.find(s => s.id === suggestionId)
    if (!suggestion) {
      return res.status(404).json({ error: `Suggestion ${suggestionId} not found` })
    }

    try {
      const rootCauseAlarm = store.activeAIAlarms.find(a => a.id === store.aiGroupResult.rootCauseId)
        || store.activeAIAlarms.find(a => a.isRootCause)
        || store.activeAIAlarms[0]
      const result = await generateReasoning(rootCauseAlarm, suggestion)
      res.json(result)
    } catch (err) {
      console.error('[ai/index] reasoning failed:', err.message)

      // Graceful fallback — return stub so UI doesn't break
      res.json({
        confidence  : 70,
        reasoning   : 'AI reasoning is temporarily unavailable. This action is recommended based on standard maintenance procedures for the detected alarm pattern.',
        sensorData  : [],
        _fallback   : true,
      })
    }
  })

  console.log('[AI] Subsystem initialised — routes mounted at /api/ai/*')
}

export function getSensorSimulator() { return sensorSimulator }
