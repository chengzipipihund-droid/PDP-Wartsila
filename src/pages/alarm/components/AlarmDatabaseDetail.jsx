import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import WartsilaLogo    from '@imgs/wartsila_logo.svg'
import RedActive       from '@imgs/red-active.svg'
import MagentaActive   from '@imgs/magenta-active.svg'
import YellowActive    from '@imgs/yellow-active.svg'
import GreenActive     from '@imgs/green-active.svg'
import BlueActive      from '@imgs/blue-active.svg'
import RootCauseIcon   from '@imgs/root-cause-icon.svg'
import UpstreamIcon    from '@imgs/upstream-icon.svg'
import DownstreamIcon  from '@imgs/downstream-icon.svg'
import BridgeGreyIcon  from '@imgs/Bridge-grey.svg'
import ECRGreyIcon     from '@imgs/ECR-grey.svg'
import SensorIcon      from '@imgs/sensor-icon.svg'
import StepIcon        from '@imgs/step-icon.svg'
import RobotLogo       from '@imgs/robot-logo.svg'
import EditIcon        from '@imgs/edit-icon.svg'
import NotIcon         from '@imgs/not-icon.svg'
import VoiceIcon       from '@imgs/voice-icon.svg'

const SEV_ACTIVE = {
  red: RedActive, magenta: MagentaActive, yellow: YellowActive,
  green: GreenActive, blue: BlueActive,
}

// Format ISO timestamp → "DD MMM YYYY  HH:MM"
function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
    + '  ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
}

// HH:MM only
function fmtHHMM(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
}

// DD/MM/YYYY
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' })
}

// Duration from two ISO timestamps → "Xh Ym" or "Ym" or "—"
function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—'
  const ms = new Date(endIso) - new Date(startIso)
  if (ms <= 0) return '—'
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Simple seeded PRNG
function seededRandFE(seed) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

function addMin(iso, min) {
  return new Date(new Date(iso).getTime() + min * 60000).toISOString()
}

// ── Playable voice note card ──────────────────────────────────────────────────
function VoiceNotePlayer({ voiceNoteId, compact = false }) {
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
  if (compact) return (
    <>
      <audio ref={audioRef} src={`/api/voice-notes/${voiceNoteId}/audio`} preload="metadata" onEnded={() => setPlaying(false)} onLoadedMetadata={e => { if (isFinite(e.target.duration)) setDuration(e.target.duration) }} />
      <button
        onClick={toggle}
        className="w-6 h-6 rounded-full bg-[#E9E9E9] flex items-center justify-center hover:bg-[#DADADA] transition-colors text-[10px]"
        aria-label={playing ? 'Pause' : 'Play'}
      >{playing ? '⏸' : '▶'}</button>
    </>
  )
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
      >{playing ? '⏸' : '▶'}</button>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#333333]">
          Voice note{duration != null ? <span className="text-[#9B9B9B]"> · {fmtDur(duration)}</span> : null}
        </div>
      </div>
    </div>
  )
}

// ── Log Timeline sub-view ─────────────────────────────────────────────────────
function LogTimeline({ log, detail, liveSessionEntries, onBack }) {
  // The "real" log has logId = alarmId * 1000 — use live WS-backed data from App state.
  // Fabricated past logs use a seeded random timeline.
  const isRealLog = log.logId === detail.id * 1000

  // liveSessionEntries comes from App.jsx sessionLogs (updated by WS SESSION_LOG_UPDATE).
  // If it hasn't arrived yet (undefined), fall back to a one-time fetch.
  const [fetchedEntries, setFetchedEntries] = useState(null)

  useEffect(() => {
    if (!isRealLog) return
    if (liveSessionEntries !== undefined) return  // already have live data
    fetch(`/api/alarms/${detail.id}/session-log`)
      .then(r => r.json())
      .then(d => setFetchedEntries(d))
      .catch(() => setFetchedEntries([]))
  }, [detail.id, isRealLog, liveSessionEntries])

  const sessionEntries = isRealLog
    ? (liveSessionEntries ?? fetchedEntries)  // prefer live prop, fallback to fetched
    : []

  const events = useMemo(() => {
    if (sessionEntries === null) return [] // still loading

    if (isRealLog) {
      // Mirror AlarmDetailPanel's buildLog() exactly
      const personName = detail.person?.split(' - ').pop() ?? 'crew'
      const ev = []
      ev.push({
        time: log.startTime,
        type: 'text',
        text: `Appearance and assign to ${personName} – ${log.responsibility}`,
      })
      // Real recorded session entries (suggestions opened or marked not-feasible)
      for (const entry of sessionEntries) {
        if (entry.eventType === 'not_feasible') {
          ev.push({
            time: entry.openedAt,
            type: 'not_feasible',
            suggestionTitle: entry.suggestionTitle,
            operator: entry.operator,
          })
        } else {
          const fullSug = detail.suggestions?.find(s => s.title === entry.suggestionTitle) ?? {
            title: entry.suggestionTitle,
            confidence: entry.suggestionConfidence ?? 0,
            sensors: [], steps: [], reasoning: '',
          }
          ev.push({
            time: entry.openedAt,
            type: 'suggestion',
            suggestion: fullSug,
            voiceNoteIds: entry.voiceNoteIds ?? [],
          })
        }
      }
      if (log.endTime) {
        ev.push({ time: log.endTime, type: 'text', text: 'Alarm restored – system returned to normal range' })
      }
      return ev
    } else {
      // Seeded fabricated past log
      const rand = seededRandFE(log.logId * 8191)
      const ev = []
      ev.push({ time: log.startTime, type: 'text', text: 'Acknowledged' })
      const assignMin = 2 + Math.floor(rand() * 3)
      const personName = detail.person?.split(' - ').pop() ?? detail.responsibility ?? 'crew'
      ev.push({ time: addMin(log.startTime, assignMin), type: 'text', text: `Assigned to ${personName} – ${log.responsibility}` })
      const sug = detail.suggestions?.[0]
      if (sug) {
        const sugMin = 10 + Math.floor(rand() * 11)
        ev.push({ time: addMin(log.startTime, sugMin), type: 'suggestion', suggestion: sug })
      } else { rand() }
      const voiceMin = 25 + Math.floor(rand() * 8)
      if (rand() > 0.5) {
        ev.push({ time: addMin(log.startTime, voiceMin), type: 'voice' })
      }
      if (log.endTime) {
        ev.push({ time: log.endTime, type: 'text', text: 'Alarm Resolved', sub: 'sensor auto detect' })
      }
      return ev
    }
  }, [isRealLog, sessionEntries, log, detail])

  const confColor = c => c >= 75 ? '#22c55e' : '#f97316'

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto">
      {/* Breadcrumb + title */}
      <div className="bg-white rounded-lg shadow-sm px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-[#888] mb-2">
          <button onClick={onBack} className="hover:text-[#333] transition-colors">{detail.description}</button>
          <span>›</span>
          <span className="text-[#333] font-medium">History Logs</span>
        </div>
        <h2 className="text-base font-semibold text-[#3B3D3F]">Log #{log.logId}</h2>
        <p className="text-xs text-[#888] mt-0.5">{fmtDate(log.startTime)}</p>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow-sm px-6 py-5">
        {sessionEntries === null ? (
          <div className="flex items-center justify-center h-24 text-[#888] text-sm gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Loading…
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[10px] top-2 bottom-2 w-px bg-[#D8D8D8]" />
            <div className="space-y-6">
              {events.map((ev, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-[22px] flex-shrink-0 flex justify-center pt-0.5 z-10">
                    <div className="w-[18px] h-[18px] rounded-full bg-white border-2 border-[#C8CDD1] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#9B9B9B]" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[#9B9B9B] block mb-1">{fmtHHMM(ev.time)}</span>

                    {ev.type === 'text' && (
                      <div>
                        <span className="text-sm text-[#333]">{ev.text}</span>
                        {ev.sub && <span className="text-xs text-[#9B9B9B] block">({ev.sub})</span>}
                      </div>
                    )}

                    {ev.type === 'voice' && (
                      <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#F7F7F7]">
                        <div className="w-7 h-7 rounded-full bg-[#E0E0E0] flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-[#666]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm-1 19.93V23h2v-2.07A8.001 8.001 0 0 0 20 13h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#333]">Voice Note</p>
                          <p className="text-[11px] text-[#9B9B9B]">AI transcription – engineer notes on actions taken</p>
                        </div>
                      </div>
                    )}

                    {ev.type === 'not_feasible' && (() => {
                      const nfTime = fmtHHMM(ev.time)
                      return (
                        <div className="border border-[#D8D8D8] rounded-lg px-4 py-3 bg-white">
                          <p className="text-sm font-semibold text-[#111] leading-snug mb-2">{ev.suggestionTitle}</p>
                          <span className="text-[11px] text-[#9B9B9B] block mb-0.5">{nfTime}</span>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs font-medium text-red-500">Mark as Not Feasible</span>
                          </div>
                          {ev.operator && <p className="text-[11px] text-[#9B9B9B]">by {ev.operator}</p>}
                        </div>
                      )
                    })()}

                    {ev.type === 'done' && (() => {
                      const doneTime = fmtHHMM(ev.time)
                      return (
                        <div className="border border-[#D8D8D8] rounded-lg px-4 py-3 bg-white">
                          <p className="text-sm font-semibold text-[#111] leading-snug mb-2">{ev.suggestionTitle}</p>
                          <span className="text-[11px] text-[#9B9B9B] block mb-0.5">{doneTime}</span>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3.5 h-3.5 text-[#333] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-xs font-medium text-[#333]">Mark as Done</span>
                          </div>
                          {ev.operator && <p className="text-[11px] text-[#9B9B9B]">by {ev.operator}</p>}
                        </div>
                      )
                    })()}

                    {ev.type === 'suggestion' && (
                      <div className="border border-[#D8D8D8] rounded-lg p-4 bg-white">
                        <div className="flex items-center gap-2 mb-3">
                          <img src={RobotLogo} alt="" className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-semibold text-[#333]">{ev.suggestion.title}</span>
                          <span className="ml-auto text-[11px] font-semibold" style={{ color: confColor(ev.suggestion.confidence) }}>
                            {ev.suggestion.confidence}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {ev.suggestion.sensors?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <img src={SensorIcon} alt="" className="w-4 h-4" />
                                <span className="text-[11px] font-semibold text-[#555]">Sensor Correlation</span>
                              </div>
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="text-[#9B9B9B]">
                                    <th className="text-left font-normal pb-1">Sensor</th>
                                    <th className="text-left font-normal pb-1">Current</th>
                                    <th className="text-left font-normal pb-1">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ev.suggestion.sensors.map((s, si) => (
                                    <tr key={si} className="border-t border-gray-100">
                                      <td className="py-1 pr-2 text-[#555]">{s.name}</td>
                                      <td className="py-1 pr-2 text-[#333] font-medium">{s.current}</td>
                                      <td className="py-1 text-[#9B9B9B]">{s.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <svg className="w-4 h-4 text-[#9B9B9B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                              </svg>
                              <span className="text-[11px] font-semibold text-[#555]">Reasoning</span>
                            </div>
                            <p className="text-[11px] text-[#555] leading-relaxed">{ev.suggestion.reasoning}</p>
                          </div>
                          {ev.suggestion.steps?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <img src={StepIcon} alt="" className="w-4 h-4" />
                                <span className="text-[11px] font-semibold text-[#555]">Steps</span>
                              </div>
                              <ol className="space-y-1">
                                {ev.suggestion.steps.map((step, si) => (
                                  <li key={si} className="text-[11px] text-[#555] leading-relaxed">
                                    <span className="font-semibold text-[#9B9B9B]">Step {si + 1} – </span>{step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                        {/* Real voice notes attached to this session entry */}
                        {(ev.voiceNoteIds ?? []).map(id => (
                          <div key={id} className="mt-3 pt-3 border-t border-gray-100">
                            <VoiceNotePlayer voiceNoteId={id} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isRealLog && events.length === 1 && (
                <p className="text-xs text-[#9B9B9B] pl-9 italic">No suggestions have been opened for this alarm yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Action Detail sub-view ────────────────────────────────────────────────────
function ActionDetail({ action, detail, voiceNotes, onBack }) {
  const suggestion  = detail.suggestions?.find(s => s.title === action.name)
  const [localSteps, setLocalSteps] = useState(() => suggestion?.steps ?? [])
  const [editingIdx, setEditingIdx] = useState(null)
  const [editValue,  setEditValue]  = useState('')

  // Combine seeded + live voice notes for this action, sorted by time
  const notesForAction = useMemo(() => {
    const all = [
      ...(detail.seedVoiceNotes ?? []).filter(v => v.suggestionTitle === action.name),
      ...voiceNotes.filter(v => v.suggestionTitle === action.name),
    ]
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [detail.seedVoiceNotes, voiceNotes, action.name])

  const fmtDur = (s) => {
    if (!s) return '–'
    if (s < 60) return `${Math.round(s)}"`
    return `${Math.floor(s / 60)}'${String(Math.floor(s % 60)).padStart(2, '0')}"`
  }
  const fmtDT = (iso) => {
    if (!iso) return '–'
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${date} ${time}`
  }
  const fmtOp = (op) => {
    if (!op) return { name: '–', role: '' }
    const parts = op.split(' - ')
    return parts.length >= 2 ? { name: parts[1], role: parts[0] } : { name: op, role: '' }
  }

  const startEdit = (idx) => { setEditingIdx(idx); setEditValue(localSteps[idx]) }
  const commitEdit = () => {
    if (editingIdx === null) return
    const next = [...localSteps]; next[editingIdx] = editValue
    setLocalSteps(next); setEditingIdx(null)
  }
  const deleteStep = (idx) => setLocalSteps(prev => prev.filter((_, i) => i !== idx))

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="bg-white rounded-lg shadow-sm px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-[#888] mb-2">
          <button onClick={onBack} className="hover:text-[#333] transition-colors">{detail.description}</button>
          <span>›</span>
          <button onClick={onBack} className="hover:text-[#333] transition-colors">Actions</button>
          <span>›</span>
          <span className="text-[#333] font-medium truncate">{action.name}</span>
        </div>
        <h2 className="text-base font-semibold text-[#3B3D3F]">{action.name}</h2>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-[#9B9B9B]">
            Times executed successfully: <span className="font-semibold text-[#555]">{action.successCount}</span>
          </span>
          <span className="text-xs text-[#9B9B9B]">
            Marked not feasible: <span className="font-semibold text-[#555]">{action.notFeasibleCount}</span>
          </span>
        </div>
      </div>

      {/* Operation Steps */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          <img src={StepIcon} alt="steps" className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold text-[#3B3D3F]">Operation Steps</span>
        </div>
        <div className="divide-y divide-gray-100">
          {localSteps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3 px-5 py-3">
              {editingIdx === idx ? (
                <input
                  autoFocus
                  className="flex-1 text-sm text-[#333] border border-[#C8CDD1] rounded px-2 py-1 outline-none focus:border-[#3B3D3F]"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingIdx(null) }}
                />
              ) : (
                <span className="flex-1 text-sm text-[#555]">
                  <span className="text-[#9B9B9B] font-semibold mr-1">Step {idx + 1} –</span>{step}
                </span>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => deleteStep(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 transition-colors group"
                  title="Delete step"
                >
                  <img src={NotIcon} alt="delete" className="w-4 h-4 opacity-40 group-hover:opacity-80" />
                </button>
                <button
                  onClick={() => startEdit(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F0F0F0] transition-colors group"
                  title="Edit step"
                >
                  <img src={EditIcon} alt="edit" className="w-4 h-4 opacity-40 group-hover:opacity-80" />
                </button>
              </div>
            </div>
          ))}
          {localSteps.length === 0 && (
            <p className="px-5 py-4 text-sm text-[#9B9B9B] italic">No steps defined.</p>
          )}
        </div>
      </div>

      {/* Voice Notes */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          <img src={VoiceIcon} alt="voice notes" className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold text-[#3B3D3F]">Voice Notes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[#9B9B9B] font-medium px-5 py-3 whitespace-nowrap">Voice Note</th>
                <th className="text-left text-[#9B9B9B] font-medium px-5 py-3">Transcript</th>
                <th className="text-left text-[#9B9B9B] font-medium px-5 py-3 whitespace-nowrap">Operator</th>
                <th className="text-left text-[#9B9B9B] font-medium px-5 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {notesForAction.map((note, i) => {
                const { name, role } = fmtOp(note.operator)
                return (
                  <tr key={note.id ?? i} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {note.seeded ? (
                          <img src={VoiceIcon} alt="voice" className="w-4 h-4 opacity-50" />
                        ) : (
                          <VoiceNotePlayer voiceNoteId={note.id} compact />
                        )}
                        <span className="text-[#555] tabular-nums">{fmtDur(note.duration)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#555] max-w-xs">
                      {note.transcript || <span className="text-[#C0C0C0] italic">—</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="font-medium text-[#333]">{name}</div>
                      {role && <div className="text-[10px] text-[#9B9B9B]">{role}</div>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap tabular-nums text-[#555]">{fmtDT(note.timestamp)}</td>
                    <td className="px-4 py-3">
                      <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F0F0F0] transition-colors group">
                        <img src={EditIcon} alt="edit" className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {notesForAction.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[#9B9B9B] italic text-xs">
                    No voice notes recorded for this action yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Chip style for alarm link buttons
function AlarmChip({ alarm, onClick }) {
  if (!alarm) return <span className="text-[#888] text-xs">None</span>
  return (
    <button
      onClick={() => onClick(alarm.id)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
      style={{ background: '#EAEAEA', color: '#1A1A1A' }}
      onMouseEnter={e => e.currentTarget.style.background = '#D8D8D8'}
      onMouseLeave={e => e.currentTarget.style.background = '#EAEAEA'}
    >
      <span className="text-[#555] font-mono">#{alarm.id}</span>
      <span>{alarm.description}</span>
    </button>
  )
}

// ── Interactive Failure Tree SVG Diagram ─────────────────────────────────────
const NW = 164, NH = 54, Y_GAP = 80, X_GAP = 18

function wrapText(str, maxChars = 21) {
  if (str.length <= maxChars) return [str]
  const words = str.split(' ')
  let line1 = '', line2 = ''
  for (const w of words) {
    const candidate = line1 ? line1 + ' ' + w : w
    if (candidate.length <= maxChars) { line1 = candidate }
    else if (!line2) { line2 = w }
    else { line2 = (line2 + ' ' + w).slice(0, maxChars - 1) + '…'; break }
  }
  return line2 ? [line1, line2] : [line1]
}

const SEV_COLORS = {
  red: '#EF4444', magenta: '#D946EF', yellow: '#EAB308',
  green: '#22C55E', blue: '#3B82F6',
}

function FailureTreeDiagram({ currentAlarm, failureTree, onNavigate }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 400, h: 300 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef(null)

  // Observe container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.offsetWidth, h: el.offsetHeight })
    })
    ro.observe(el)
    setSize({ w: el.offsetWidth, h: el.offsetHeight })
    return () => ro.disconnect()
  }, [])

  // Reset pan/zoom when alarm changes
  useEffect(() => { setPan({ x: 0, y: 0 }); setZoom(1) }, [currentAlarm.id])

  // Build nodes & edges from failureTree
  const nodes = []
  const edges = []

  // Current alarm always at origin
  nodes.push({
    id: currentAlarm.id,
    label: currentAlarm.description,
    severity: currentAlarm.severity,
    x: 0, y: 0,
    isCurrent: true,
  })

  // Root cause: above
  if (failureTree.rootCause) {
    nodes.push({
      id: failureTree.rootCause.id,
      label: failureTree.rootCause.description,
      x: 0, y: -(NH + Y_GAP),
      isCurrent: false,
    })
    edges.push({ from: failureTree.rootCause.id, to: currentAlarm.id })
  }

  // Downstream: below, spread horizontally
  const ds = failureTree.downstream ?? []
  if (ds.length > 0) {
    const totalW = ds.length * NW + (ds.length - 1) * X_GAP
    ds.forEach((d, i) => {
      const x = -totalW / 2 + i * (NW + X_GAP) + NW / 2
      nodes.push({ id: d.id, label: d.description, x, y: NH + Y_GAP, isCurrent: false })
      edges.push({ from: currentAlarm.id, to: d.id })
    })
  }

  const nodeMap = {}
  nodes.forEach(n => { nodeMap[n.id] = n })

  // Drag handlers
  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { x: e.clientX, y: e.clientY }
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
  }, [])

  const onMouseUp = useCallback(() => { dragRef.current = null }, [])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    setZoom(z => Math.min(2.5, Math.max(0.3, z * (e.deltaY < 0 ? 1.1 : 0.909))))
  }, [])

  const hasConnections = failureTree.rootCause || ds.length > 0

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden rounded-r-lg"
      style={{ background: '#F4F4F4', cursor: dragRef.current ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {!hasConnections && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Still render the single node */}
        </div>
      )}

      <svg width={size.w} height={size.h} style={{ display: 'block' }}>
        <defs>
          <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="#BDBDBD" />
          </marker>
        </defs>

        {/* All nodes/edges shifted so current alarm is centered */}
        <g transform={`translate(${size.w / 2 + pan.x}, ${size.h / 2 + pan.y}) scale(${zoom})`}>

          {/* Edges */}
          {edges.map((e, i) => {
            const from = nodeMap[e.from]
            const to   = nodeMap[e.to]
            if (!from || !to) return null
            // Line from bottom of `from` to top of `to`
            const x1 = from.x, y1 = from.y + NH / 2
            const x2 = to.x,   y2 = to.y - NH / 2 - 5
            const my = (y1 + y2) / 2
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                fill="none"
                stroke="#BDBDBD"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const lines = wrapText(n.label)
            const lineH = 15
            const textH = lines.length * lineH
            const textY = -textH / 2 + lineH * 0.5
            const sevColor = SEV_COLORS[n.severity] ?? '#888'
            return (
              <g
                key={n.id}
                transform={`translate(${n.x - NW / 2}, ${n.y - NH / 2})`}
                style={{ cursor: n.isCurrent ? 'default' : 'pointer' }}
                onClick={() => { if (!n.isCurrent) onNavigate(n.id) }}
              >
                {/* Shadow */}
                <rect
                  x="2" y="2" width={NW} height={NH} rx="6"
                  fill="rgba(0,0,0,0.06)"
                />
                {/* Box */}
                <rect
                  width={NW} height={NH} rx="6"
                  fill={n.isCurrent ? '#3B3D3F' : '#FFFFFF'}
                  stroke={n.isCurrent ? '#3B3D3F' : '#D8D8D8'}
                  strokeWidth={n.isCurrent ? 0 : 1}
                />
                {/* Severity stripe on left */}
                {n.severity && (
                  <rect x="0" y="0" width="4" height={NH} rx="2"
                    fill={sevColor}
                    style={{ borderRadius: '6px 0 0 6px' }}
                  />
                )}
                {/* Text */}
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={NW / 2 + 2}
                    y={NH / 2 + textY + li * lineH}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fontFamily="system-ui, sans-serif"
                    fontWeight={n.isCurrent ? '600' : '400'}
                    fill={n.isCurrent ? '#FFFFFF' : '#222222'}
                  >
                    {line}
                  </text>
                ))}
                {/* ID badge */}
                <text
                  x={NW - 6} y={NH - 5}
                  textAnchor="end"
                  fontSize="9"
                  fontFamily="monospace"
                  fill={n.isCurrent ? 'rgba(255,255,255,0.5)' : '#AAAAAA'}
                >
                  #{n.id}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Hints */}
      <div className="absolute bottom-2 right-3 text-[9px] text-[#AAAAAA] pointer-events-none leading-tight text-right">
        drag to pan<br/>scroll to zoom
      </div>
    </div>
  )
}

export default function AlarmDatabaseDetail({ alarm, onBack, onNavigate, sessionLogs = {}, voiceNotesByAlarm = {} }) {
  const [detail, setDetail]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [selectedAction, setSelectedAction] = useState(null)
  const [fetchedVoiceNotes, setFetchedVoiceNotes] = useState([])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setDetail(null)
    fetch(`/api/alarms/${alarm.id}/database-detail`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(d => { setDetail(d); setLoading(false) })
      .catch(e => { setError('Failed to load: ' + e.message); setLoading(false) })
  }, [alarm.id])

  useEffect(() => {
    fetch(`/api/alarms/${alarm.id}/voice-notes`)
      .then(r => r.json())
      .then(setFetchedVoiceNotes)
      .catch(() => {})
  }, [alarm.id])

  // Live voice notes from WS override initial fetch once available
  const liveVoiceNotes = voiceNotesByAlarm[alarm.id] ?? fetchedVoiceNotes

  const sevIcon = SEV_ACTIVE[alarm.severity]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F2F2F2' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex items-stretch h-[48px] w-full overflow-hidden flex-shrink-0">
        <div
          className="flex items-center gap-5 bg-white shrink-0 pl-4 pr-14 relative z-10"
          style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 28px) 100%, 0 100%)' }}
        >
          <img src={WartsilaLogo} alt="Wärtsilä" className="h-6" />
          <span className="text-black font-semibold text-base tracking-wide whitespace-nowrap">
            Alarm Database
          </span>
        </div>
        <div className="flex items-center flex-1 bg-[#3B3D3F] -ml-7 pl-10 pr-5 gap-3 min-w-0">
          {sevIcon && <img src={sevIcon} alt={alarm.severity} className="w-5 h-5 flex-shrink-0" />}
          <span className="text-white font-semibold text-sm truncate flex-1 min-w-0">
            {alarm.description}
          </span>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
            style={{ background: '#5A5C5E', color: '#E0E0E0' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 pb-6">
        {selectedLog && detail && (
          <LogTimeline
            log={selectedLog}
            detail={detail}
            liveSessionEntries={sessionLogs[detail.id]}
            onBack={() => setSelectedLog(null)}
          />
        )}
        {selectedAction && detail && (
          <ActionDetail
            action={selectedAction}
            detail={detail}
            voiceNotes={liveVoiceNotes}
            onBack={() => setSelectedAction(null)}
          />
        )}
        {!selectedLog && !selectedAction && loading && (
          <div className="flex items-center justify-center h-48 text-[#888] text-sm gap-3">
            <svg className="animate-spin w-5 h-5 text-[#3B3D3F]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Loading alarm details…
          </div>
        )}
        {!selectedLog && !selectedAction && !loading && error && (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error}</div>
        )}
        {!selectedLog && !selectedAction && !loading && !error && detail && (
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">

            {/* ── Section 1: Failure Tree Analysis ─────────── */}
            <section className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-[#3B3D3F] tracking-wide uppercase">
                  Failure Tree Analysis
                </h2>
              </div>

              {/* Two-column: chips left, diagram right */}
              <div className="flex" style={{ minHeight: 200 }}>

                {/* Left: chip rows */}
                <div className="divide-y divide-gray-100 flex-1 border-r border-gray-100">

                  {/* Root Cause */}
                  <div className="flex items-start gap-4 px-5 py-4">
                    <img src={RootCauseIcon} alt="root cause" className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-[#555] uppercase tracking-wide">Root Cause</span>
                      {detail.failureTree?.rootCause
                        ? <AlarmChip alarm={detail.failureTree.rootCause} onClick={id => onNavigate(id)} />
                        : <span className="text-[#888] text-xs">Not identified</span>
                      }
                    </div>
                  </div>

                  {/* Upstream Alarms */}
                  <div className="flex items-start gap-4 px-5 py-4">
                    <img src={UpstreamIcon} alt="upstream" className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-[#555] uppercase tracking-wide">Upstream Alarms</span>
                      {detail.failureTree?.upstream?.length > 0
                        ? (
                          <div className="flex flex-wrap gap-2">
                            {detail.failureTree.upstream.map(a => (
                              <AlarmChip key={a.id} alarm={a} onClick={id => onNavigate(id)} />
                            ))}
                          </div>
                        )
                        : <span className="text-[#888] text-xs">None</span>
                      }
                    </div>
                  </div>

                  {/* Downstream Alarms */}
                  <div className="flex items-start gap-4 px-5 py-4">
                    <img src={DownstreamIcon} alt="downstream" className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-[#555] uppercase tracking-wide">Downstream Alarms</span>
                      {detail.failureTree?.downstream?.length > 0
                        ? (
                          <div className="flex flex-wrap gap-2">
                            {detail.failureTree.downstream.map(a => (
                              <AlarmChip key={a.id} alarm={a} onClick={id => onNavigate(id)} />
                            ))}
                          </div>
                        )
                        : <span className="text-[#888] text-xs">None</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Right: interactive tree diagram */}
                <div className="flex-1 relative" style={{ minHeight: 200 }}>
                  <FailureTreeDiagram
                    currentAlarm={{ id: detail.id, description: detail.description, severity: detail.severity }}
                    failureTree={detail.failureTree}
                    onNavigate={onNavigate}
                  />
                </div>

              </div>
            </section>

            {/* ── Section 2: History Logs ───────────────────── */}
            <section className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-[#3B3D3F] tracking-wide uppercase">
                  History Logs
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-[#555] font-semibold px-5 py-2.5 whitespace-nowrap">ID</th>
                      <th className="text-left text-[#555] font-semibold px-5 py-2.5 whitespace-nowrap">Starting Time</th>
                      <th className="text-left text-[#555] font-semibold px-5 py-2.5 whitespace-nowrap">Duration</th>
                      <th className="text-left text-[#555] font-semibold px-5 py-2.5 whitespace-nowrap">Responsibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.historyLogs.map((log, i) => (
                      <tr
                        key={log.logId}
                        className="border-b border-gray-100 last:border-0 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="px-5 py-2.5 tabular-nums text-[#888] font-mono">#{log.logId}</td>
                        <td className="px-5 py-2.5 tabular-nums whitespace-nowrap">{fmtTime(log.startTime)}</td>
                        <td className="px-5 py-2.5 tabular-nums">{fmtDuration(log.startTime, log.endTime)}</td>
                        <td className="px-5 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <img
                              src={log.responsibility === 'ECR' ? ECRGreyIcon : BridgeGreyIcon}
                              alt={log.responsibility}
                              className="w-3.5 h-3.5"
                            />
                            {log.responsibility}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {detail.historyLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-6 text-center text-[#888]">No history logs</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Section 3: Actions ────────────────────────── */}
            <section className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-[#3B3D3F] tracking-wide uppercase">
                  Actions
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-[#555] font-semibold px-5 py-2.5">Name</th>
                      <th className="text-left text-[#555] font-semibold px-5 py-2.5 whitespace-nowrap">Times Successfully Executed</th>
                      <th className="text-left text-[#555] font-semibold px-5 py-2.5 whitespace-nowrap">Times Marked as Not Feasible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.actions.map((action, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 last:border-0 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                        onClick={() => setSelectedAction(action)}
                      >
                        <td className="px-5 py-2.5 leading-snug">{action.name}</td>
                        <td className="px-5 py-2.5 tabular-nums text-center">{action.successCount}</td>
                        <td className="px-5 py-2.5 tabular-nums text-center">{action.notFeasibleCount}</td>
                      </tr>
                    ))}
                    {detail.actions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-6 text-center text-[#888]">No actions recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  )
}
