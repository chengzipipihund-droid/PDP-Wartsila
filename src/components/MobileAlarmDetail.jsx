import { useState, useRef, useEffect } from 'react'
import MobileStepDetail  from './MobileStepDetail'
import MobileLogModal    from './MobileLogModal'
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

const SEV_ICON = {
  red:     { active: RedActive,     inactive: RedInactive },
  magenta: { active: MagentaActive, inactive: MagentaInactive },
  yellow:  { active: YellowActive,  inactive: YellowInactive },
  green:   { active: GreenActive,   inactive: GreenInactive },
  blue:    { active: BlueActive,    inactive: BlueInactive },
}

const SENSOR_DATA = {
  red:     { name: 'ME Lube Oil Pressure Sensor',          value: '1.2 bar ↓', normal: 'normal: 2.5–4.0 bar' },
  magenta: { name: 'Auxiliary Engine Coolant Temperature', value: '102 °C ↑',  normal: 'normal: 70–90 °C'   },
  yellow:  { name: 'Fuel Oil Viscosity Sensor',            value: '38 cSt ↑',  normal: 'normal: 10–20 cSt'  },
  green:   { name: 'Air Compressor Discharge Temperature', value: '78 °C ↑',   normal: 'normal: 40–70 °C'   },
  blue:    { name: 'Bilge Level Sensor – Frame 60',        value: '340 mm ↑',  normal: 'normal: < 100 mm'   },
}

export default function MobileAlarmDetail({ alarm, onBack }) {
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [showLog, setShowLog] = useState(false)
  const [sessionLog, setSessionLog] = useState([])
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set())
  const [confidenceAdjust, setConfidenceAdjust]         = useState({})
  const currentLogIdRef   = useRef(null)
  const currentServerIdRef = useRef(null)

  // Load acknowledge entries already recorded on the server (e.g. acknowledged before opening detail)
  useEffect(() => {
    fetch(`/api/alarms/${alarm.id}/session-log`)
      .then(r => r.json())
      .then(entries => {
        const ackEntries = entries
          .filter(e => e.type === 'acknowledge')
          .map(e => ({
            id: e.id,
            openedAt: new Date(e.openedAt),
            suggestion: { title: e.suggestionTitle, confidence: null },
            voiceNotes: [],
            isAcknowledge: true,
          }))
        if (ackEntries.length > 0) {
          setSessionLog(prev => [...ackEntries, ...prev])
        }
      })
      .catch(() => {})
  }, [alarm.id])

  function openSuggestion(s) {
    const localId  = Date.now()
    const openedAt = new Date()
    currentLogIdRef.current    = localId
    currentServerIdRef.current = null

    setSessionLog(prev => [
      ...prev.filter(e => e.voiceNotes?.length > 0 || e.isDone || e.isNotFeasible || e.isAcknowledge),
      { id: localId, openedAt, suggestion: s, voiceNotes: [] },
    ])
    setSelectedSuggestion(s)

    // Sync to server
    fetch(`/api/alarms/${alarm.id}/session-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestionTitle:      s.title,
        suggestionConfidence: s.confidence,
        openedAt:             openedAt.toISOString(),
      }),
    })
      .then(r => r.json())
      .then(entry => { currentServerIdRef.current = entry.id })
      .catch(() => {})
  }

  function handleBack() {
    setSessionLog(prev => prev.filter(e => e.voiceNotes?.length > 0 || e.isDone || e.isNotFeasible || e.isAcknowledge))
    setSelectedSuggestion(null)
    const srvId = currentServerIdRef.current
    if (srvId) {
      fetch(`/api/alarms/${alarm.id}/session-log/${srvId}`, { method: 'DELETE' }).catch(() => {})
      currentServerIdRef.current = null
    }
  }

  async function handleMarkDone() {
    const s = selectedSuggestion
    if (!s) return
    setSessionLog(prev => [
      ...prev.filter(e => e.voiceNotes?.length > 0 || e.isDone || e.isNotFeasible || e.isAcknowledge),
      {
        id: Date.now(),
        openedAt: new Date(),
        suggestion: s,
        voiceNotes: [],
        isDone: true,
        operator: alarm.person ?? null,
      }
    ])
    setSelectedSuggestion(null)
    setDismissedSuggestions(prev => new Set([...prev, s.title]))
    // Nudge confidence of remaining suggestions (same as Not Feasible)
    setConfidenceAdjust(prev => {
      const updated = { ...prev }
      ;(alarm.suggestions ?? []).forEach(sx => {
        if (sx.title === s.title || dismissedSuggestions.has(sx.title)) return
        const delta = Math.round((Math.random() - 0.5) * 6)
        updated[sx.title] = (updated[sx.title] ?? 0) + delta
      })
      return updated
    })
    const srvId = currentServerIdRef.current
    currentServerIdRef.current = null
    if (srvId) {
      fetch(`/api/alarms/${alarm.id}/session-log/${srvId}`, { method: 'DELETE' }).catch(() => {})
    }
    try {
      await fetch(`/api/alarms/${alarm.id}/mark-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionTitle: s.title, suggestionConfidence: s.confidence, operator: alarm.person ?? null }),
      })
    } catch (e) { console.error('mark-done failed', e) }
  }

  async function handleNotFeasible() {
    const s = selectedSuggestion
    if (!s) return
    // Navigate back immediately, keeping a not-feasible entry in local log
    setSessionLog(prev => [
      ...prev.filter(e => e.voiceNotes?.length > 0 || e.isDone || e.isNotFeasible || e.isAcknowledge),
      {
        id: Date.now(),
        openedAt: new Date(),
        suggestion: s,
        voiceNotes: [],
        isNotFeasible: true,
        operator: alarm.person ?? null,
      }
    ])
    setSelectedSuggestion(null)
    // Dismiss from list
    setDismissedSuggestions(prev => new Set([...prev, s.title]))
    // Nudge confidence of remaining suggestions
    setConfidenceAdjust(prev => {
      const updated = { ...prev }
      ;(alarm.suggestions ?? []).forEach(sx => {
        if (sx.title === s.title || dismissedSuggestions.has(sx.title)) return
        const delta = Math.round((Math.random() - 0.5) * 6)
        updated[sx.title] = (updated[sx.title] ?? 0) + delta
      })
      return updated
    })
    // Delete the opened session log entry
    const srvId = currentServerIdRef.current
    currentServerIdRef.current = null
    if (srvId) {
      fetch(`/api/alarms/${alarm.id}/session-log/${srvId}`, { method: 'DELETE' }).catch(() => {})
    }
    // Log not-feasible event
    try {
      await fetch(`/api/alarms/${alarm.id}/mark-not-feasible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionTitle: s.title, suggestionConfidence: s.confidence, operator: alarm.person ?? null }),
      })
    } catch (e) { console.error('mark-not-feasible failed', e) }
  }

  function handleVoiceNoteSaved(data) {
    // data: { blobUrl, duration, savedAt, voiceNoteServerId }
    setSessionLog(prev => prev.map(e =>
      e.id === currentLogIdRef.current ? { ...e, voiceNotes: [...(e.voiceNotes ?? []), data] } : e
    ))

    // Attach voice note id on server entry → triggers broadcast to desktop
    const srvId = currentServerIdRef.current
    if (srvId && data.voiceNoteServerId) {
      fetch(`/api/alarms/${alarm.id}/session-log/${srvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceNoteId: data.voiceNoteServerId }),
      }).catch(() => {})
    }
  }

  const icon   = SEV_ICON[alarm.severity]?.[alarm.state]
  const sensor = SENSOR_DATA[alarm.severity]

  if (selectedSuggestion) {
    const adjConf = Math.min(99, Math.max(1, selectedSuggestion.confidence + (confidenceAdjust[selectedSuggestion.title] ?? 0)))
    return (
      <MobileStepDetail
        alarm={alarm}
        suggestion={selectedSuggestion}
        adjConf={adjConf}
        onBack={handleBack}
        onNotFeasible={handleNotFeasible}
        onMarkDone={handleMarkDone}
        onVoiceNoteSaved={handleVoiceNoteSaved}
        sessionLog={sessionLog}
        onSelectSuggestion={openSuggestion}
      />
    )
  }

  const visible = (alarm.suggestions ?? [])
    .filter(s => s.confidence > 50 && !dismissedSuggestions.has(s.title))
    .sort((a, b) => b.confidence - a.confidence)

  return (
    <div className="flex flex-col bg-[#F2F2F2]" style={{ position:'fixed', inset:0, maxWidth:480, margin:'0 auto', overflow:'hidden' }}>

      {showLog && <MobileLogModal alarm={alarm} sessionLog={sessionLog} onClose={() => setShowLog(false)} onSelectSuggestion={(s) => { setShowLog(false); openSuggestion(s) }} />}

      {/* ── Dark header ──────────────────────────────────── */}
      <header style={{ background: '#3B3D3F' }} className="flex-shrink-0">
        {/* Back row */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-1">
          <button
            onClick={onBack}
            className="text-[#9B9B9B] hover:text-white transition-colors text-lg leading-none flex-shrink-0 pr-1"
            aria-label="Back"
          >
            ←
          </button>
          <span className="text-xs text-[#9B9B9B] uppercase tracking-wide flex-1">Alarm Detail</span>
          <button
            onClick={() => setShowLog(true)}
            className="flex-shrink-0 text-xs rounded px-3 py-1 hover:bg-[#6A6C6E] transition-colors" style={{ background: '#5A5C5E', color: '#D0D0D0' }}
          >
            Log
          </button>
        </div>

        {/* Icon + Title */}
        <div className="flex items-start gap-3 px-4 pt-2 pb-5">
          {icon && (
            <img src={icon} alt={alarm.severity} className="w-6 h-6 flex-shrink-0 mt-0.5" />
          )}
          <h1 className="text-base font-bold text-white leading-snug flex-1">
            {alarm.description}
          </h1>
        </div>
      </header>

      {/* ── Scrollable body ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ WebkitOverflowScrolling:'touch', overscrollBehavior:'contain' }}>

        {/* Sensor reading card */}
        {sensor && (
          <div className="rounded-lg bg-[#E9E9E9] flex items-center justify-between px-4 py-3 gap-3 mb-4">
            <span className="text-xs text-[#333333] leading-snug flex-1">{sensor.name}</span>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-red-600">{sensor.value}</div>
              <div className="text-[10px] text-[#9B9B9B]">{sensor.normal}</div>
            </div>
          </div>
        )}

        {/* Section title */}
        <p className="text-sm font-semibold text-[#9B9B9B] mb-3">Suggested Steps</p>

        {/* Suggestion blocks */}
        {visible.length === 0 ? (
          <p className="text-xs text-[#9B9B9B]">No high-confidence suggestions available.</p>
        ) : (
          visible.map((s, i) => {
            const adjConf   = Math.min(99, Math.max(1, s.confidence + (confidenceAdjust[s.title] ?? 0)))
            const isHigh    = adjConf >= 75
            const confColor = isHigh ? '#22c55e' : '#f97316'
            const confLabel = isHigh ? 'High' : 'Medium'
            return (
              <div
                key={i}
                className="mb-3 bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 cursor-pointer active:bg-[#DADADA] hover:bg-[#E0E0E0] transition-colors"
                onClick={() => openSuggestion(s)}
              >
                {/* Option / Confidence row */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#9B9B9B]">Option {i + 1}</span>
                  <span className="text-[11px] font-semibold" style={{ color: confColor }}>
                    Confidence: {adjConf}% ({confLabel})
                  </span>
                </div>
                {/* Bold title */}
                <p className="text-sm font-bold text-[#111111] mb-3">{s.title}</p>
                {/* Robot + reasoning */}
                <div className="flex gap-2 items-start">
                  <img src={RobotLogo} alt="AI" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#555555] leading-relaxed">{s.reasoning}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
