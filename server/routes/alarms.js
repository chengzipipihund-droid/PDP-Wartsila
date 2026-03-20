// ── Alarm routes ─────────────────────────────────────────────────────────────
import { Router } from 'express'
import { state, withSuggestions } from '../state.js'
import { alarmStats, childToRoot, rootToChildren, seededRand, parseMinutes } from '../data/stats.js'
import { SUGGESTIONS } from '../data/suggestions.js'
import { broadcast } from '../websocket.js'

const router = Router()

// ── Seed data for fabricated history-log voice notes ────────────────────────
const SEED_TRANSCRIPTS = [
  'Open box. Check for loose terminals due to vibration. Tighten screws.',
  'Inspect for burnt insulation or grounding on the sensor cable.',
  'Pressure differential noted. Applying emergency isolation procedure.',
  'Verified temperature returning to normal range after corrective action.',
  'Conducted visual inspection. No visible damage found on affected unit.',
  'Applied lubrication. Confirmed normal pressure restored.',
  'Switched to standby unit. Monitoring values for the next 30 minutes.',
  'Sensor recalibrated. Alarm condition cleared.',
]
const SEED_CREW = [
  'Chief Engineer - Erik Larsson',
  'Second Engineer - Jonas Müller',
  'Third Engineer - Lukas Fischer',
  'Electrician - Piotr Kowalski',
  'Motorman - Henrik Nilsson',
]

// GET /api/alarms
router.get('/', (req, res) => {
  res.json(state.alarms.map(withSuggestions))
})

// POST /api/alarms/clear-all
router.post('/clear-all', (req, res) => {
  state.alarms = []
  state.sessionLogs = {}
  broadcast({ type: 'CLEAR_ALL' })
  res.json({ ok: true })
})

// GET /api/alarms/database
router.get('/database', (req, res) => {
  res.json(state.alarms.map(a => ({
    id:             a.id,
    description:    a.description,
    severity:       a.severity,
    type:           a.type,
    responsibility: a.responsibility,
    state:          a.state,
    ...(alarmStats[a.id] ?? { occurrences: 5, avgResolveTime: '1h 00min' }),
  })))
})

// GET /api/alarms/user/:person
router.get('/user/:person', (req, res) => {
  res.json(state.alarms.filter(a => a.person.includes(req.params.person)))
})

// POST /api/alarms/acknowledge
router.post('/acknowledge', (req, res) => {
  const { ids, person, responsibility } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' })
  }
  const now          = new Date().toISOString()
  const finalPerson  = person         || 'Captain - Mikael Strand'
  const finalResp    = responsibility || 'Bridge'
  const parts        = finalPerson.split(' - ')
  const role         = parts[0]?.trim() ?? 'Unknown'
  const name         = parts.slice(1).join(' - ').trim() || 'Unknown'
  const ackText      = `Acknowledged by ${name} - ${role} - ${finalResp}`

  let count = 0
  ids.forEach(id => {
    const alarmId = Number(id)
    const idx     = state.alarms.findIndex(a => a.id === alarmId)
    if (idx === -1) return
    state.alarms[idx] = { ...state.alarms[idx], state: 'inactive', person: finalPerson, responsibility: finalResp }
    broadcast({ type: 'UPDATE', data: withSuggestions(state.alarms[idx]) })

    if (!state.sessionLogs[alarmId]) state.sessionLogs[alarmId] = []
    state.sessionLogs[alarmId].push({
      id: state.sessionLogSeq++,
      alarmId,
      openedAt: now,
      suggestionTitle: ackText,
      suggestionConfidence: null,
      voiceNoteIds: [],
      type: 'acknowledge',
    })
    broadcast({ type: 'SESSION_LOG_UPDATE', alarmId, entries: state.sessionLogs[alarmId] })
    count++
  })
  res.json({ acknowledged: count })
})

// GET /api/alarms/:id/database-detail
router.get('/:id/database-detail', (req, res) => {
  const id    = parseInt(req.params.id)
  const alarm = state.alarms.find(a => a.id === id)
  if (!alarm) return res.status(404).json({ error: 'Not found' })

  const stats = alarmStats[id] ?? { occurrences: 5, avgResolveTime: '1h 00min' }

  const resolve = (ids) => ids
    .map(rid => { const a = state.alarms.find(x => x.id === rid); return a ? { id: rid, description: a.description } : null })
    .filter(Boolean)

  let rootCauseAlarm = null
  let upstreamIds    = []
  let downstreamIds  = []

  if (rootToChildren[id] !== undefined) {
    downstreamIds = rootToChildren[id]
  } else if (childToRoot[id] !== undefined) {
    const rootId   = childToRoot[id]
    rootCauseAlarm = state.alarms.find(a => a.id === rootId) ?? null
    upstreamIds    = [rootId]
  }

  const avgMin = parseMinutes(stats.avgResolveTime)
  const rand   = seededRand(id * 997)

  const historyLogs = []

  // Real log entry
  historyLogs.push({
    logId:          id * 1000,
    startTime:      alarm.appearance ?? new Date().toISOString(),
    endTime:        alarm.state === 'active' ? null : (alarm.restore ?? null),
    responsibility: alarm.responsibility,
  })

  // One seeded fabricated log (when occurrences > 1)
  if (stats.occurrences > 1) {
    const daysAgo = 7 + rand() * 23
    const start   = new Date(Date.now() - daysAgo * 86400000)
    const durMin  = Math.max(5, Math.round(avgMin * (0.6 + rand() * 0.8)))
    const end     = new Date(start.getTime() + durMin * 60000)
    historyLogs.push({
      logId:          id * 1000 + 1,
      startTime:      start.toISOString(),
      endTime:        end.toISOString(),
      responsibility: ['ECR', 'Bridge'][Math.floor(rand() * 2)],
    })
  }

  historyLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))

  const alarmWithSugg = withSuggestions(alarm)

  // Seeded voice notes for the fabricated past log
  const seedVoiceNotes = []
  if (stats.occurrences > 1 && historyLogs.length > 1) {
    const fabricatedLog = historyLogs.find(l => l.logId === id * 1000 + 1)
    if (fabricatedLog) {
      const svr  = seededRand((id * 1000 + 1) * 8191)
      svr()
      const hasSug = (alarmWithSugg.suggestions?.length ?? 0) > 0
      if (hasSug) svr()
      const voiceMin = 25 + Math.floor(svr() * 8)
      const hasVoice = svr() > 0.5
      if (hasVoice) {
        const sr2       = seededRand(id * 3571)
        const transcript = SEED_TRANSCRIPTS[Math.floor(sr2() * SEED_TRANSCRIPTS.length)]
        const operator   = SEED_CREW[Math.floor(sr2() * SEED_CREW.length)]
        const duration   = 20 + Math.floor(sr2() * 140)
        const suggTitle  = alarmWithSugg.suggestions?.[0]?.title ?? ''
        seedVoiceNotes.push({
          id:             `seed-${id * 1000 + 1}`,
          alarmId:        id,
          suggestionTitle: suggTitle,
          timestamp:      new Date(new Date(fabricatedLog.startTime).getTime() + voiceMin * 60000).toISOString(),
          duration,
          operator,
          transcript,
          seeded: true,
        })
      }
    }
  }

  const rand2   = seededRand(id * 1237)
  const actions = (alarmWithSugg.suggestions ?? []).slice(0, 5).map(sug => ({
    name:             sug.title,
    successCount:     Math.floor(rand2() * (stats.occurrences + 1)) + ((state.successOverrides[id] ?? {})[sug.title] ?? 0),
    notFeasibleCount: Math.floor(rand2() * Math.ceil(stats.occurrences / 4)) + ((state.notFeasibleOverrides[id] ?? {})[sug.title] ?? 0),
  }))

  const suggestions = (alarmWithSugg.suggestions ?? []).map(s => ({
    title:      s.title,
    confidence: s.confidence,
    reasoning:  s.reasoning,
    sensors:    s.sensors ?? [],
    steps:      s.steps   ?? [],
  }))

  res.json({
    id,
    description:    alarm.description,
    severity:       alarm.severity,
    person:         alarm.person         ?? null,
    responsibility: alarm.responsibility ?? null,
    failureTree: {
      rootCause:  rootCauseAlarm ? { id: rootCauseAlarm.id, description: rootCauseAlarm.description } : null,
      upstream:   resolve(upstreamIds),
      downstream: resolve(downstreamIds),
    },
    historyLogs,
    actions,
    suggestions,
    seedVoiceNotes,
  })
})

// PUT /api/alarms/:id
router.put('/:id', (req, res) => {
  const idx = state.alarms.findIndex(a => a.id === parseInt(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Alarm not found' })
  state.alarms[idx] = { ...state.alarms[idx], ...req.body }
  broadcast({ type: 'UPDATE', data: withSuggestions(state.alarms[idx]) })
  res.json(state.alarms[idx])
})

// POST /api/alarms
router.post('/', (req, res) => {
  const newAlarm = { id: state.alarms.length + 1, ...req.body, appearance: new Date().toISOString() }
  state.alarms.push(newAlarm)
  broadcast({ type: 'NEW', data: newAlarm })
  res.status(201).json(newAlarm)
})

export default router
