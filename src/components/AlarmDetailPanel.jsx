import { useState, useEffect, useRef } from 'react'
import RedActive      from '@imgs/red-active.svg'
import MagentaActive  from '@imgs/magenta-active.svg'
import YellowActive   from '@imgs/yellow-active.svg'
import GreenActive    from '@imgs/green-active.svg'
import BlueActive     from '@imgs/blue-active.svg'
import RedInactive    from '@imgs/red-inactive.svg'
import MagentaInactive from '@imgs/magenta-inactive.svg'
import YellowInactive from '@imgs/yellow-inactive.svg'
import GreenInactive  from '@imgs/green-inactive.svg'
import BlueInactive   from '@imgs/blue-inactive.svg'
import RobotLogo      from '@imgs/robot-logo.svg'
import SensorIcon     from '@imgs/sensor-icon.svg'
import StepIcon       from '@imgs/step-icon.svg'

const SEVERITY_ICON = {
  red:     { active: RedActive,     inactive: RedInactive },
  magenta: { active: MagentaActive, inactive: MagentaInactive },
  yellow:  { active: YellowActive,  inactive: YellowInactive },
  green:   { active: GreenActive,   inactive: GreenInactive },
  blue:    { active: BlueActive,    inactive: BlueInactive },
}

// ── Simulated sensor reading card data (by severity) ────────
const SENSOR_DATA = {
  red:     { name: 'ME Lube Oil Pressure Sensor',              value: '1.2 bar ↓', normal: 'normal: 2.5–4.0 bar', normalShort: '2.5–4.0 bar' },
  magenta: { name: 'Auxiliary Engine Coolant Temperature',     value: '102 °C ↑',  normal: 'normal: 70–90 °C',   normalShort: '70–90 °C'    },
  yellow:  { name: 'Fuel Oil Viscosity Sensor',                value: '38 cSt ↑',  normal: 'normal: 10–20 cSt',  normalShort: '10–20 cSt'   },
  green:   { name: 'Air Compressor Discharge Temperature',     value: '78 °C ↑',   normal: 'normal: 40–70 °C',   normalShort: '40–70 °C'    },
  blue:    { name: 'Bilge Level Sensor – Frame 60',            value: '340 mm ↑',  normal: 'normal: < 100 mm',  normalShort: '< 100 mm'   },
}

// ── Simulated ECR log entries (auto-generated from alarm) ───
function buildLog(alarm) {
  const app  = alarm.appearance ? new Date(alarm.appearance) : null
  const fmt  = (d) => d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
  const plus = (d, mins) => d ? new Date(d.getTime() + mins * 60000) : null

  const appTime  = app

  const entries = [
    { time: fmt(appTime), text: `Appearance and assign to ${alarm.person?.split(' - ').pop() ?? 'crew'} – ${alarm.responsibility}`, done: true },
  ]

  if (alarm.restore) {
    const rst = new Date(alarm.restore)
    entries.push({ time: fmt(rst), text: 'Alarm restored – system returned to normal range', done: true })
  }

  return entries
}

// ── Simulated Bridge suggested steps ────────────────────────

// ── Voice Note playback card ─────────────────────────────────
function VoiceNotePlayer({ voiceNoteId }) {
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(null)
  const audioRef = useRef(null)
  const fmtDur = (s) => s == null ? null : s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`

  useEffect(() => {
    fetch(`/api/voice-notes/${voiceNoteId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.duration != null) setDuration(data.duration) })
      .catch(() => {})
  }, [voiceNoteId])

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play().catch(() => {}); setPlaying(true) }
  }
  return (
    <div className="flex items-center gap-3 bg-white border border-[#C8CDD1] rounded-lg px-3 py-2">
      <audio
        ref={audioRef}
        src={`/api/voice-notes/${voiceNoteId}/audio`}
        preload="metadata"
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={e => { if (isFinite(e.target.duration)) setDuration(e.target.duration) }}
      />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-[#E9E9E9] flex items-center justify-center flex-shrink-0 hover:bg-[#DADADA] transition-colors text-sm"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#333333]">
          Voice note{duration != null ? <span className="text-[#9B9B9B]"> · {fmtDur(duration)}</span> : null}
        </div>
      </div>
    </div>
  )
}

// ── Date header formatter ────────────────────────────────────
function fmtDateHeader(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Build unique person options from all alarms ─────────────
function buildPersonOptions(allAlarms) {
  const seen = new Map()
  ;(allAlarms ?? []).forEach(a => {
    const parts = a.person?.split(' - ')
    if (parts?.length >= 2) {
      const key = a.person
      if (!seen.has(key)) seen.set(key, { label: `${parts[1]} – ${parts[0]} – ${a.responsibility}`, value: key })
    }
  })
  return Array.from(seen.values())
}

// ── Desktop Log Panel (overlay inside the right panel) ────────
function DesktopLogPanel({ alarm, sessionLog = [], onClose, onSelectSuggestion }) {
  const logEntries = buildLog(alarm)
  const dateLabel  = fmtDateHeader(alarm.appearance)
  const isHigh   = (conf) => conf >= 75
  const confColor = (conf) => isHigh(conf) ? '#22c55e' : '#f97316'

  return (
    <div className="absolute inset-0 z-10 flex flex-col" style={{ background: '#F2F2F2' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-[#E0E0E0]">
        <span className="text-sm font-semibold text-[#333333]">Log</span>
        <button
          onClick={onClose}
          className="text-[#9B9B9B] hover:text-[#333] transition-colors text-lg leading-none"
          aria-label="Close log"
        >✕</button>
      </div>
      <p className="text-xs font-semibold text-[#555555] px-5 pt-3 pb-1 flex-shrink-0">{dateLabel}</p>

      {/* Scrollable timeline */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2">
        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[#C8CDD1]" />
          <div className="space-y-4">
            {logEntries.map((entry, i) => (
              <div key={i} className="flex gap-3 items-start relative">
                <div
                  className={`w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 z-10 flex items-center justify-center ${
                    entry.done ? 'bg-white border-[#C8CDD1]' : 'bg-[#E8E8E8] border-[#C8CDD1]'
                  }`}
                  style={{ marginTop: 1 }}
                >
                  {entry.done && <div className="w-2 h-2 rounded-full bg-[#9B9B9B]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[#9B9B9B] mr-2">{entry.time}</span>
                  {!entry.done ? (
                    <div className="mt-1 flex items-center justify-between bg-white border border-[#C8CDD1] rounded px-3 py-2">
                      <span className="text-xs text-[#333333]">{entry.text}</span>
                      <span className="text-[#9B9B9B] ml-2 text-xs">▾</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#333333]">{entry.text}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Session log entries */}
            {sessionLog.map((entry) => {
              const openedStr = new Date(entry.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              const conf = entry.suggestionConfidence
              return (
                <div key={entry.id} className="flex gap-3 items-start relative">
                  <div
                    className="w-[22px] h-[22px] rounded-full border-2 border-[#C8CDD1] bg-white flex-shrink-0 z-10 flex items-center justify-center"
                    style={{ marginTop: 1 }}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#9B9B9B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[#9B9B9B] block mb-1">{openedStr}</span>
                    {entry.type === 'acknowledge' ? (
                      <span className="text-xs text-[#333333]">{entry.suggestionTitle}</span>
                    ) : (
                      <div
                        className="bg-white border border-[#C8CDD1] rounded-lg px-3 py-2 cursor-pointer hover:bg-[#F7F7F7] active:bg-[#F0F0F0] transition-colors"
                        onClick={() => { onSelectSuggestion?.(entry); onClose() }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#333333] leading-snug flex-1">{entry.suggestionTitle}</span>
                          <span className="text-[#9B9B9B] text-sm">›</span>
                        </div>
                        {conf != null && (
                          <span className="text-[10px] font-semibold" style={{ color: confColor(conf) }}>
                            Confidence: {conf}% ({isHigh(conf) ? 'High' : 'Medium'})
                          </span>
                        )}
                        {(entry.voiceNoteIds ?? []).map(id => (
                          <div key={id} className="mt-2" onClick={e => e.stopPropagation()}>
                            <VoiceNotePlayer voiceNoteId={id} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────
export default function AlarmDetailPanel({ alarm, onClose, allAlarms, sessionLog = [], onSessionLogUpdate }) {
  const [resolved, setResolved]               = useState(alarm.state === 'inactive')
  const [assignee, setAssignee]               = useState(alarm.person ?? '')
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [showLog, setShowLog]                 = useState(false)
  const currentServerIdRef                    = useRef(null)
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set())
  const [confidenceAdjust, setConfidenceAdjust]         = useState({})

  // Keep local assignee in sync when the alarm prop updates from WS
  useState(() => { setAssignee(alarm.person ?? '') })

  // Open a suggestion and record it in the server session log
  const openSuggestion = async (s) => {
    setSelectedSuggestion(s)
    try {
      const res = await fetch(`/api/alarms/${alarm.id}/session-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionTitle: s.title, suggestionConfidence: s.confidence }),
      })
      if (res.ok) {
        const saved = await res.json()
        currentServerIdRef.current = saved.id
      }
    } catch (e) { console.error('session-log POST failed', e) }
  }

  // Mark a suggestion as not feasible (called from detail view)
  const handleMarkNotFeasible = async () => {
    const s = selectedSuggestion
    if (!s) return
    // Navigate back first for instant feel
    const sid = currentServerIdRef.current
    currentServerIdRef.current = null
    setSelectedSuggestion(null)
    // Dismiss from list
    setDismissedSuggestions(prev => new Set([...prev, s.title]))
    // Nudge other suggestions' confidence slightly
    setConfidenceAdjust(prev => {
      const updated = { ...prev }
      ;(alarm.suggestions ?? []).forEach(sx => {
        if (sx.title === s.title || dismissedSuggestions.has(sx.title)) return
        const delta = Math.round((Math.random() - 0.5) * 6) // ±3%
        updated[sx.title] = (updated[sx.title] ?? 0) + delta
      })
      return updated
    })
    // Delete the "opened" session log entry, then add a not-feasible entry
    if (sid) {
      try { await fetch(`/api/alarms/${alarm.id}/session-log/${sid}`, { method: 'DELETE' }) }
      catch (e) { console.error('session-log DELETE failed', e) }
    }
    try {
      await fetch(`/api/alarms/${alarm.id}/mark-not-feasible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionTitle: s.title, suggestionConfidence: s.confidence, operator: alarm.person ?? null }),
      })
    } catch (err) { console.error('mark-not-feasible failed', err) }
  }

  // Mark a suggestion as done (called from detail view)
  const handleMarkDone = async () => {
    const s = selectedSuggestion
    if (!s) return
    const sid = currentServerIdRef.current
    currentServerIdRef.current = null
    setSelectedSuggestion(null)
    setDismissedSuggestions(prev => new Set([...prev, s.title]))
    setConfidenceAdjust(prev => {
      const updated = { ...prev }
      ;(alarm.suggestions ?? []).forEach(sx => {
        if (sx.title === s.title || dismissedSuggestions.has(sx.title)) return
        const delta = Math.round((Math.random() - 0.5) * 6)
        updated[sx.title] = (updated[sx.title] ?? 0) + delta
      })
      return updated
    })
    if (sid) {
      try { await fetch(`/api/alarms/${alarm.id}/session-log/${sid}`, { method: 'DELETE' }) }
      catch (e) { console.error('session-log DELETE failed', e) }
    }
    try {
      await fetch(`/api/alarms/${alarm.id}/mark-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionTitle: s.title, suggestionConfidence: s.confidence, operator: alarm.person ?? null }),
      })
    } catch (err) { console.error('mark-done failed', err) }
  }

  // Go back to list and remove the log entry (no voice note on desktop)
  const handleBack = async () => {
    const sid = currentServerIdRef.current
    currentServerIdRef.current = null
    setSelectedSuggestion(null)
    if (sid) {
      try { await fetch(`/api/alarms/${alarm.id}/session-log/${sid}`, { method: 'DELETE' }) }
      catch (e) { console.error('session-log DELETE failed', e) }
    }
  }

  if (!alarm) return null

  const isECR        = alarm.responsibility === 'ECR'
  const severityImg  = SEVERITY_ICON[alarm.severity]?.[alarm.state]
  const sensor       = SENSOR_DATA[alarm.severity]
  const logEntries   = buildLog(alarm)
  const dateLabel    = fmtDateHeader(alarm.appearance)
  const personOptions = buildPersonOptions(allAlarms)

  // Derive responsibility from allAlarms for the selected person
  const respForPerson = (personVal) => {
    const match = (allAlarms ?? []).find(a => a.person === personVal)
    return match?.responsibility ?? alarm.responsibility
  }

  // Commit assign change to server (PUT) – WS broadcast updates the row
  const handleAssignChange = async (newPerson) => {
    setAssignee(newPerson)
    const newResp = respForPerson(newPerson)
    try {
      await fetch(`/api/alarms/${alarm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: newPerson, responsibility: newResp }),
      })
    } catch (e) {
      console.error('Failed to update alarm assignment:', e)
    }
  }

  // Scroll-aware top: panel starts just below header, grows to fill screen as header scrolls away
  const [panelTop, setPanelTop] = useState(48)
  useEffect(() => {
    const onScroll = () => setPanelTop(Math.max(0, 48 - window.scrollY))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* ── Backdrop (starts below header) ────────────── */}
      <div
        className="fixed right-0 left-0 bottom-0 z-40"
        style={{ top: panelTop }}
        onClick={onClose}
      />

      {/* ── Panel (starts below header, fills when scrolled) ── */}
      <div
        className="fixed right-0 z-50 flex flex-col bg-[#F2F2F2] shadow-2xl"
        style={{ width: 380, top: panelTop, bottom: 48, overflowY: 'auto' }}
      >
      {/* ── Dark header: icon + title + assign + resolved ── */}
      <div className="flex-shrink-0" style={{ background: '#3B3D3F' }}>
        {/* Title row */}
        <div className="flex items-start gap-2 px-5 pt-5 pb-3">
          {severityImg && (
            <img src={severityImg} alt={alarm.severity} className="w-6 h-6 flex-shrink-0 mt-0.5" />
          )}
          <h2 className="text-sm font-bold text-white leading-snug flex-1">
            {alarm.description}
          </h2>
          <button
            onClick={onClose}
            className="text-[#9B9B9B] hover:text-white transition-colors text-lg leading-none flex-shrink-0 ml-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Assign to + Resolved row */}
        <div className="flex items-center gap-2 px-5 pb-4">
          <span className="text-xs text-[#D8D8D8] flex-shrink-0">Assign to</span>
          <select
            value={assignee}
            onChange={e => handleAssignChange(e.target.value)}
            className="text-xs border border-[#5A5D5F] rounded px-2 py-1.5 bg-[#4A4D4F] text-white focus:outline-none focus:border-[#9B9B9B]"
            style={{ width: 160 }}
          >
            {personOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex-1" />
          <button
            onClick={() => setResolved(v => !v)}
            className={`text-xs px-3 py-1.5 rounded border font-medium flex-shrink-0 transition-colors ${
              resolved
                ? 'bg-green-700 border-green-500 text-white'
                : 'bg-transparent border-[#5A5D5F] text-white hover:bg-[#4A4D4F]'
            }`}
          >
            {resolved ? 'Resolved ✓' : 'Resolved'}
          </button>
        </div>
      </div>

      {/* ── Sensor reading card ────────────────────────────── */}
      {sensor && !selectedSuggestion && (
        <div className="mx-5 mt-4 mb-4 rounded-lg bg-[#E9E9E9] flex items-center justify-between px-4 py-3 gap-3">
          <span className="text-xs text-[#333333] leading-snug flex-1">{sensor.name}</span>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-red-600">{sensor.value}</div>
            <div className="text-[10px] text-[#9B9B9B]">{sensor.normal}</div>
          </div>
        </div>
      )}

      {/* ── ECR Log ────────────────────────────────────────── */}
      {isECR && (
        <div className="px-5 flex-1 pt-1">
          <p className="text-sm font-semibold text-[#9B9B9B] mb-1">
            Log
          </p>

          {/* Date above timeline */}
          <p className="text-xs font-semibold text-[#555555] mb-3">{dateLabel}</p>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[#C8CDD1]" />

            <div className="space-y-4">
              {logEntries.map((entry, i) => (
                <div key={i} className="flex gap-3 items-start relative">
                  <div
                    className={`w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 z-10 flex items-center justify-center ${
                      entry.done ? 'bg-white border-[#C8CDD1]' : 'bg-[#E8E8E8] border-[#C8CDD1]'
                    }`}
                    style={{ marginTop: 1 }}
                  >
                    {entry.done && <div className="w-2 h-2 rounded-full bg-[#9B9B9B]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[#9B9B9B] mr-2">{entry.time}</span>
                    {!entry.done ? (
                      <div className="mt-1 flex items-center justify-between bg-white border border-[#C8CDD1] rounded px-3 py-2">
                        <span className="text-xs text-[#333333]">{entry.text}</span>
                        <span className="text-[#9B9B9B] ml-2 text-xs">▾</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#333333]">{entry.text}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* ── Session log entries ── */}
              {sessionLog.map((entry) => {
                const openedStr = new Date(entry.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                const isNF   = entry.eventType === 'not_feasible'
                const isDone = entry.eventType === 'done'
                return (
                  <div key={entry.id} className="flex gap-3 items-start relative">
                    <div
                      className={`w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 z-10 flex items-center justify-center ${isNF ? 'border-red-300 bg-red-50' : isDone ? 'border-[#3B3D3F] bg-[#3B3D3F]' : 'border-[#C8CDD1] bg-white'}`}
                      style={{ marginTop: 1 }}
                    >
                      {isNF
                        ? <svg className="w-2.5 h-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        : isDone
                          ? <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          : <div className="w-2 h-2 rounded-full bg-[#9B9B9B]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-[#9B9B9B] block mb-1">{openedStr}</span>
                      {isNF ? (
                        <div className="bg-white border border-[#C8CDD1] rounded-lg px-3 py-2.5">
                          <p className="text-xs font-semibold text-[#111] leading-snug mb-1.5">{entry.suggestionTitle}</p>
                          <span className="text-[11px] text-[#9B9B9B] block mb-0.5">{openedStr}</span>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[11px] font-medium text-red-500">Mark as Not Feasible</span>
                          </div>
                          {entry.operator && <p className="text-[11px] text-[#9B9B9B]">by {entry.operator}</p>}
                        </div>
                      ) : isDone ? (
                        <div className="bg-white border border-[#C8CDD1] rounded-lg px-3 py-2.5">
                          <p className="text-xs font-semibold text-[#111] leading-snug mb-1.5">{entry.suggestionTitle}</p>
                          <span className="text-[11px] text-[#9B9B9B] block mb-0.5">{openedStr}</span>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3 h-3 text-[#333] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-[11px] font-medium text-[#333]">Mark as Done</span>
                          </div>
                          {entry.operator && <p className="text-[11px] text-[#9B9B9B]">by {entry.operator}</p>}
                        </div>
                      ) : (
                        <div className="bg-white border border-[#C8CDD1] rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#333333] leading-snug flex-1">{entry.suggestionTitle}</span>
                          </div>
                          {(entry.voiceNoteIds ?? []).map(id => (
                            <div key={id} className="mt-2">
                              <VoiceNotePlayer voiceNoteId={id} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Bridge Suggested Steps ─────────────────────────── */}
      {!isECR && !selectedSuggestion && (
        <div className="flex-1 pt-1 pb-2">
          {/* Header row with Log button */}
          <div className="flex items-center justify-between px-5 pb-3">
            <p className="text-sm font-semibold text-[#9B9B9B]">Suggested Steps</p>
            <button
              onClick={() => setShowLog(true)}
              className="text-xs font-medium px-3 py-1 rounded border"
              style={{ background: '#FFFFFF', color: '#555555', borderColor: '#C8CDD1' }}
            >Log</button>
          </div>
          <div className="mx-5 mb-3 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
          <div className="px-5">
          {(() => {
            const visible = (alarm.suggestions ?? [])
              .filter(s => s.confidence > 50 && !dismissedSuggestions.has(s.title))
              .sort((a, b) => b.confidence - a.confidence)
            if (visible.length === 0) return (
              <p className="text-xs text-[#9B9B9B]">No high-confidence suggestions available.</p>
            )
            return visible.map((s, i) => {
              const adjConf    = Math.min(99, Math.max(1, s.confidence + (confidenceAdjust[s.title] ?? 0)))
              const isHighConf = adjConf >= 75
              const confColor  = isHighConf ? '#22c55e' : '#f97316'
              const confLabel  = isHighConf ? 'High' : 'Medium'
              return (
                <div
                  key={i}
                  className="mb-3 bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 cursor-pointer hover:bg-[#E0E0E0] active:bg-[#DADADA] transition-colors"
                  onClick={() => openSuggestion(s)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#9B9B9B]">Option {i + 1}</span>
                    <span className="text-[11px] font-semibold" style={{ color: confColor }}>
                      Confidence: {adjConf}% ({confLabel})
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#111111] mb-3">{s.title}</p>
                  <div className="flex gap-2 items-start">
                    <img src={RobotLogo} alt="AI" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#555555] leading-snug flex-1">{s.reasoning}</p>
                  </div>
                </div>
              )
            })
          })()}
          </div>
        </div>
      )}

      {/* ── Bridge Suggestion Detail ────────────────────────── */}
      {!isECR && selectedSuggestion && (() => {
        const s        = selectedSuggestion
        const isHigh   = s.confidence >= 75
        const confColor = isHigh ? '#22c55e' : '#f97316'
        const confLabel = isHigh ? 'High' : 'Medium'
        return (
          <div className="flex-1 pb-4">
            {/* Back row */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E0E0E0]">
              <button
                onClick={handleBack}
                className="text-[#9B9B9B] hover:text-[#333] transition-colors text-lg leading-none flex-shrink-0"
                aria-label="Back"
              >
                ←
              </button>
              <span className="text-xs text-[#9B9B9B] uppercase tracking-wide flex-1">Suggested Steps</span>
              <button
                onClick={handleMarkNotFeasible}
                className="text-xs font-medium px-3 py-1 rounded border border-[#C8CDD1] bg-white text-[#555] hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
              >Not Feasible</button>
              <button
                onClick={handleMarkDone}
                className="text-xs font-medium px-3 py-1 rounded border border-[#C8CDD1] bg-white text-[#555] hover:bg-[#F0F0F0] transition-colors"
              >✓ Mark as Done</button>
              <button
                onClick={() => setShowLog(true)}
                className="text-xs font-medium px-3 py-1 rounded border"
                style={{ background: '#FFFFFF', color: '#555555', borderColor: '#C8CDD1' }}
              >Log</button>
            </div>

            <div className="px-5 pt-3">
              {/* Primary sensor card */}
              {sensor && (
                <div className="rounded-lg bg-[#E9E9E9] flex items-center justify-between px-4 py-3 gap-3 mb-3">
                  <span className="text-xs text-[#333333] leading-snug flex-1">{sensor.name}</span>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-red-600">{sensor.value}</div>
                    <div className="text-[10px] text-[#9B9B9B]">{sensor.normal}</div>
                  </div>
                </div>
              )}

              {/* Title + confidence */}
              <p className="text-sm font-bold text-[#111111] mb-0.5 leading-snug">{s.title}</p>
              <p className="text-xs font-semibold mb-3" style={{ color: confColor }}>
                Confidence: {Math.min(99, Math.max(1, s.confidence + (confidenceAdjust[s.title] ?? 0)))}% ({confLabel})
              </p>

              {/* Sensor Correlation */}
              {(s.sensors ?? []).length > 0 && (
                <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={SensorIcon} alt="" className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">Sensor Correlation</span>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#CCCCCC]">
                        <th className="text-left text-[#9B9B9B] font-medium pb-1.5 pr-2">Sensor</th>
                        <th className="text-right text-[#9B9B9B] font-medium pb-1.5 pr-2">Current</th>
                        <th className="text-right text-[#9B9B9B] font-medium pb-1.5">Normal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.sensors.map((sen, i) => (
                        <tr key={i} className={i < s.sensors.length - 1 ? 'border-b border-[#CCCCCC]/50' : ''}>
                          <td className="py-1.5 pr-2 text-[#333333] leading-snug">{sen.name}</td>
                          <td className="py-1.5 pr-2 text-right text-[#333333] whitespace-nowrap">{sen.current}</td>
                          <td className="py-1.5 text-right text-[#555555] whitespace-nowrap">{sen.normal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AI Reasoning */}
              <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <img src={RobotLogo} alt="AI" className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">AI Reasoning</span>
                </div>
                <p className="text-xs text-[#555555] leading-relaxed">{s.reasoning}</p>
              </div>

              {/* Step Details */}
              {(s.steps ?? []).length > 0 && (
                <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={StepIcon} alt="" className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">Step Details</span>
                  </div>
                  <ol className="space-y-2.5">
                    {s.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-xs font-bold text-[#9B9B9B] flex-shrink-0 mt-0.5 w-14">Step {i + 1} –</span>
                        <span className="text-xs text-[#333333] leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Bottom padding ─────────────────────────────────── */}
      <div className="h-6" />

      {/* ── Log overlay ───────────────────────────────────── */}
      {!isECR && showLog && (
        <DesktopLogPanel
          alarm={alarm}
          sessionLog={sessionLog}
          onClose={() => setShowLog(false)}
          onSelectSuggestion={(entry) => {
            const found = (alarm.suggestions ?? []).find(s => s.title === entry.suggestionTitle)
            if (found) openSuggestion(found)
          }}
        />
      )}
    </div>
    </>
  )
}
