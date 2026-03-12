// ── Voice note routes ────────────────────────────────────────────────────────
import { Router } from 'express'
import { state } from '../state.js'
import { broadcast } from '../websocket.js'

const router = Router()

// Preserve string IDs (e.g. 'AI_A1') and parse numeric IDs to numbers
const parseAlarmId = (raw) => /^\d+$/.test(raw) ? parseInt(raw, 10) : raw

const noteMeta = (n) => ({
  id: n.id, alarmId: n.alarmId, suggestionTitle: n.suggestionTitle,
  timestamp: n.timestamp, duration: n.duration, operator: n.operator, transcript: n.transcript,
})

// POST /api/alarms/:id/voice-notes
router.post('/alarms/:id/voice-notes', (req, res) => {
  const alarmId = parseAlarmId(req.params.id)
  // Check both regular alarms and AI episode alarms
  const alarm   = state.alarms.find(a => a.id === alarmId)
             ?? state.aiAlarms.find(a => a.id === alarmId)
  if (!alarm) return res.status(404).json({ error: 'Alarm not found' })

  const { suggestionTitle, timestamp, duration, mimeType, audio, operator, transcript } = req.body
  if (!audio) return res.status(400).json({ error: 'No audio data provided' })

  const note = {
    id:             state.voiceNoteSeq++,
    alarmId,
    suggestionTitle: suggestionTitle ?? '',
    timestamp:       timestamp ?? new Date().toISOString(),
    duration:        duration  ?? 0,
    mimeType:        mimeType  ?? 'audio/webm',
    operator:        operator  ?? (alarm.person ?? ''),
    transcript:      transcript ?? '',
    audio,
  }
  state.voiceNotes.push(note)

  console.log(`🎙 Voice note saved: alarm=${alarmId}, id=${note.id}, duration=${note.duration}s`)

  broadcast({
    type: 'VOICE_NOTE_UPDATE',
    alarmId,
    notes: state.voiceNotes.filter(n => n.alarmId === alarmId).map(noteMeta),
  })
  res.status(201).json(noteMeta(note))
})

// GET /api/alarms/:id/voice-notes
router.get('/alarms/:id/voice-notes', (req, res) => {
  const alarmId = parseAlarmId(req.params.id)
  res.json(
    state.voiceNotes
      .filter(n => n.alarmId === alarmId)
      .map(n => ({ ...noteMeta(n), mimeType: n.mimeType, audio: n.audio }))
  )
})

// GET /api/voice-notes  — all notes, no audio binary
router.get('/voice-notes', (req, res) => {
  res.json(state.voiceNotes.map(n => ({
    id: n.id, alarmId: n.alarmId, suggestionTitle: n.suggestionTitle,
    timestamp: n.timestamp, duration: n.duration, mimeType: n.mimeType,
  })))
})

// GET /api/voice-notes/:id  — single note metadata
router.get('/voice-notes/:id', (req, res) => {
  const note = state.voiceNotes.find(n => n.id === parseInt(req.params.id))
  if (!note) return res.status(404).json({ error: 'Not found' })
  res.json({
    id: note.id, alarmId: note.alarmId, suggestionTitle: note.suggestionTitle,
    timestamp: note.timestamp, duration: note.duration, mimeType: note.mimeType,
  })
})

// GET /api/voice-notes/:id/audio  — binary audio
router.get('/voice-notes/:id/audio', (req, res) => {
  const note = state.voiceNotes.find(n => n.id === parseInt(req.params.id))
  if (!note) return res.status(404).send()
  const buf = Buffer.from(note.audio, 'base64')
  res.set('Content-Type', note.mimeType ?? 'audio/webm')
  res.send(buf)
})

export default router
