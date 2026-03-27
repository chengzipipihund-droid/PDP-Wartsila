// ── Session log routes ───────────────────────────────────────────────────────
import { Router } from 'express'
import { state } from '../state.js'
import { broadcast } from '../../websocket.js'

const router = Router({ mergeParams: true })  // access :id from parent

// Preserve string IDs (e.g. 'AI_A1') and parse numeric IDs to numbers
const parseAlarmId = (raw) => /^\d+$/.test(raw) ? parseInt(raw, 10) : raw

// GET /api/alarms/:id/session-log
router.get('/session-log', (req, res) => {
  const alarmId = parseAlarmId(req.params.id)
  res.json(state.sessionLogs[alarmId] ?? [])
})

// POST /api/alarms/:id/session-log
router.post('/session-log', (req, res) => {
  const alarmId = parseAlarmId(req.params.id)
  const { suggestionTitle, suggestionConfidence, openedAt } = req.body
  const entry = {
    id:                   state.sessionLogSeq++,
    alarmId,
    openedAt:             openedAt ?? new Date().toISOString(),
    suggestionTitle:      suggestionTitle      ?? '',
    suggestionConfidence: suggestionConfidence ?? 0,
    voiceNoteIds:         [],
  }
  if (!state.sessionLogs[alarmId]) state.sessionLogs[alarmId] = []
  state.sessionLogs[alarmId].push(entry)
  broadcast({ type: 'SESSION_LOG_UPDATE', alarmId, entries: state.sessionLogs[alarmId] })
  res.status(201).json(entry)
})

// POST /api/alarms/:id/mark-done
router.post('/mark-done', (req, res) => {
  const alarmId = parseAlarmId(req.params.id)
  const { suggestionTitle, suggestionConfidence, operator, voiceNoteIds } = req.body

  if (!state.successOverrides[alarmId]) state.successOverrides[alarmId] = {}
  state.successOverrides[alarmId][suggestionTitle] = (state.successOverrides[alarmId][suggestionTitle] ?? 0) + 1

  if (!state.sessionLogs[alarmId]) state.sessionLogs[alarmId] = []
  const entry = {
    id:                   state.sessionLogSeq++,
    alarmId,
    openedAt:             new Date().toISOString(),
    suggestionTitle:      suggestionTitle      ?? '',
    suggestionConfidence: suggestionConfidence ?? 0,
    voiceNoteIds:         Array.isArray(voiceNoteIds) ? voiceNoteIds : [],
    eventType:            'done',
    operator:             operator ?? null,
  }
  state.sessionLogs[alarmId].push(entry)
  broadcast({ type: 'SESSION_LOG_UPDATE', alarmId, entries: state.sessionLogs[alarmId] })
  res.status(201).json({ entry, count: state.successOverrides[alarmId][suggestionTitle] })
})

// POST /api/alarms/:id/mark-not-feasible
router.post('/mark-not-feasible', (req, res) => {
  const alarmId = parseAlarmId(req.params.id)
  const { suggestionTitle, suggestionConfidence, operator, voiceNoteIds } = req.body

  if (!state.notFeasibleOverrides[alarmId]) state.notFeasibleOverrides[alarmId] = {}
  state.notFeasibleOverrides[alarmId][suggestionTitle] = (state.notFeasibleOverrides[alarmId][suggestionTitle] ?? 0) + 1

  if (!state.sessionLogs[alarmId]) state.sessionLogs[alarmId] = []
  const entry = {
    id:                   state.sessionLogSeq++,
    alarmId,
    openedAt:             new Date().toISOString(),
    suggestionTitle:      suggestionTitle      ?? '',
    suggestionConfidence: suggestionConfidence ?? 0,
    voiceNoteIds:         Array.isArray(voiceNoteIds) ? voiceNoteIds : [],
    eventType:            'not_feasible',
    operator:             operator ?? null,
  }
  state.sessionLogs[alarmId].push(entry)
  broadcast({ type: 'SESSION_LOG_UPDATE', alarmId, entries: state.sessionLogs[alarmId] })
  broadcast({ type: 'NOT_FEASIBLE_UPDATE', alarmId, overrides: state.notFeasibleOverrides[alarmId] })
  res.status(201).json({ entry, count: state.notFeasibleOverrides[alarmId][suggestionTitle] })
})

// DELETE /api/alarms/:id/session-log/:entryId
router.delete('/session-log/:entryId', (req, res) => {
  const alarmId = parseAlarmId(req.params.id)
  const entryId = parseInt(req.params.entryId)
  if (state.sessionLogs[alarmId]) {
    state.sessionLogs[alarmId] = state.sessionLogs[alarmId].filter(e => e.id !== entryId)
    broadcast({ type: 'SESSION_LOG_UPDATE', alarmId, entries: state.sessionLogs[alarmId] })
  }
  res.status(204).send()
})

// PATCH /api/alarms/:id/session-log/:entryId
router.patch('/session-log/:entryId', (req, res) => {
  const alarmId = parseAlarmId(req.params.id)
  const entryId = parseInt(req.params.entryId)
  const entries = state.sessionLogs[alarmId] ?? []
  const idx     = entries.findIndex(e => e.id === entryId)
  if (idx === -1) return res.status(404).json({ error: 'Entry not found' })

  const { voiceNoteId, ...rest } = req.body
  if (voiceNoteId != null) {
    entries[idx].voiceNoteIds = [...(entries[idx].voiceNoteIds ?? []), voiceNoteId]
  }
  entries[idx] = { ...entries[idx], ...rest }
  broadcast({ type: 'SESSION_LOG_UPDATE', alarmId, entries })
  res.json(entries[idx])
})

export default router
