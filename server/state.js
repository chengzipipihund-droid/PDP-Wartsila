// ── Shared mutable state ─────────────────────────────────────────────────────
// All modules import this object and mutate its properties in place.
// Using a single object avoids ES-module live-binding pitfalls on reassignment.

import alarmsData from './data/alarms.js'
import { SUGGESTIONS } from './data/suggestions.js'

export const state = {
  alarms:               [],                  // TEMP: emptied for AI testing — restore with: alarmsData
  aiAlarms:             [],                  // AI episode alarms (not in state.alarms)
  voiceNotes:           [],
  voiceNoteSeq:         1,
  sessionLogs:          {},   // { [alarmId]: entry[] }
  sessionLogSeq:        1,
  notFeasibleOverrides: {},   // { [alarmId]: { [title]: count } }
  successOverrides:     {},   // { [alarmId]: { [title]: count } }
}

export function withSuggestions(alarm) {
  return { ...alarm, suggestions: SUGGESTIONS[alarm.id] ?? [] }
}
