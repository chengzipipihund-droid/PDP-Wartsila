// Shared log modal — renders as a bottom-sheet overlay on mobile
import { useState, useRef, useEffect } from 'react'

// ── Voice Note playback card ──────────────────────────────────────────────
// src  = blob URL (locally recorded) OR server endpoint URL
// serverId = server voice note ID, used to fetch duration if not already known
function VoiceNotePlayer({ src, serverId, duration: initDuration }) {
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(initDuration ?? null)
  const audioRef = useRef(null)

  // If no duration supplied and we have a server ID, fetch it
  useEffect(() => {
    if (duration == null && serverId) {
      fetch(`/api/voice-notes/${serverId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.duration != null) setDuration(data.duration) })
        .catch(() => {})
    }
  }, [serverId])

  const fmtDur = (s) => s == null ? null : s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${s % 60}s`

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play().catch(() => {}); setPlaying(true) }
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-[#C8CDD1] rounded-lg px-3 py-2">
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)}
        onLoadedMetadata={e => { if (isFinite(e.target.duration)) setDuration(e.target.duration) }} />
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

function buildLog(alarm) {
  const app  = alarm.appearance ? new Date(alarm.appearance) : null
  const fmt  = (d) => d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
  const plus = (d, mins) => d ? new Date(d.getTime() + mins * 60000) : null

  const appTime  = app

  const entries = [
    {
      time: fmt(appTime),
      text: `Appearance and assign to ${alarm.person?.split(' - ').pop() ?? 'crew'} – ${alarm.responsibility}`,
      done: true,
    },
  ]

  if (alarm.restore) {
    const rst = new Date(alarm.restore)
    entries.push({ time: fmt(rst), text: 'Alarm restored – system returned to normal range', done: true })
  }

  return entries
}

function fmtDateHeader(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function MobileLogModal({ alarm, sessionLog = [], serverSessionLog, onClose, onSelectSuggestion }) {
  const logEntries = buildLog(alarm)
  const dateLabel  = fmtDateHeader(alarm.appearance)

  // If parent passes serverSessionLog, use it directly (WS-synced); otherwise fetch on open
  const [fetchedLog, setFetchedLog] = useState(serverSessionLog != null ? null : null)
  useEffect(() => {
    if (serverSessionLog != null) return  // parent handles it
    fetch(`/api/alarms/${alarm.id}/session-log`)
      .then(r => r.json())
      .then(entries => setFetchedLog(entries))
      .catch(() => setFetchedLog([]))
  }, [alarm.id, serverSessionLog])

  const rawServerLog = serverSessionLog ?? fetchedLog  // prefer prop, fall back to fetch

  // Map server entries to display format, enriching with local blob URLs for voice notes
  const displayLog = (rawServerLog ?? []).map(srv => {
    // Find all local voice notes that match server IDs in this entry
    const matchedLocalNotes = sessionLog
      .flatMap(e => e.voiceNotes ?? [])
      .filter(vn => (srv.voiceNoteIds ?? []).includes(vn.voiceNoteServerId))
    return {
      id:             srv.id,
      openedAt:       new Date(srv.openedAt),
      suggestion:     { title: srv.suggestionTitle, confidence: srv.suggestionConfidence },
      voiceNotes:     matchedLocalNotes,
      serverVoiceNoteIds: srv.voiceNoteIds ?? [],
      isDone:         srv.eventType === 'done',
      isNotFeasible:  srv.eventType === 'not_feasible',
      isAcknowledge:  srv.type === 'acknowledge',
      operator:       srv.operator ?? null,
    }
  })

  // While server is loading, fall back to local state so there's no blank flash
  const localExtra = sessionLog.filter(e => {
    if (e.isDone || e.isNotFeasible) {
      return !displayLog.some(d =>
        d.suggestion.title === e.suggestion?.title && (d.isDone || d.isNotFeasible)
      )
    }
    return e.voiceNote?.blobUrl && !displayLog.some(d => d.voiceNote?.blobUrl === e.voiceNote.blobUrl)
  })
  const combinedLog = rawServerLog === null ? sessionLog : [...displayLog, ...localExtra]

  return (
    /* Full-screen backdrop */
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      {/* Bottom sheet — stop propagation so tapping inside doesn't close */}
      <div
        className="rounded-t-2xl flex flex-col"
        style={{ background: '#F2F2F2', maxHeight: '80vh', maxWidth: 480, width: '100%', margin: '0 auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3">
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full bg-[#C8CDD1] mx-auto mb-4" />

          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-[#333333]">Log</p>
            <button
              onClick={onClose}
              className="text-[#9B9B9B] hover:text-[#333] transition-colors text-lg leading-none"
              aria-label="Close log"
            >
              ✕
            </button>
          </div>

          <p className="text-xs font-semibold text-[#555555]">{dateLabel}</p>
        </div>

        {/* Scrollable timeline */}
        <div className="overflow-y-auto px-5 pb-8">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[#C8CDD1]" />

            <div className="space-y-4">
              {logEntries.map((entry, i) => (
                <div key={i} className="flex gap-3 items-start relative">
                  {/* Timeline dot */}
                  <div
                    className={`w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 z-10 flex items-center justify-center ${
                      entry.done
                        ? 'bg-white border-[#C8CDD1]'
                        : 'bg-[#E8E8E8] border-[#C8CDD1]'
                    }`}
                    style={{ marginTop: 1 }}
                  >
                    {entry.done && (
                      <div className="w-2 h-2 rounded-full bg-[#9B9B9B]" />
                    )}
                  </div>

                  {/* Content */}
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

              {/* ── Session log entries (suggestions viewed this session) ── */}
              {combinedLog.map((entry) => {
                const openedStr = entry.openedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={entry.id} className="flex gap-3 items-start relative">
                    {/* dot */}
                    <div
                      className={`w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 z-10 flex items-center justify-center ${
                        entry.isDone
                          ? 'border-[#3B3D3F] bg-[#3B3D3F]'
                          : entry.isNotFeasible
                            ? 'border-red-300 bg-red-50'
                            : 'border-[#C8CDD1] bg-white'
                      }`}
                      style={{ marginTop: 1 }}
                    >
                      {entry.isDone
                        ? <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : entry.isNotFeasible
                          ? <svg className="w-2.5 h-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          : <div className="w-2 h-2 rounded-full bg-[#9B9B9B]" />}
                    </div>

                    {/* content */}
                    <div className="flex-1 min-w-0">
                      {/* time */}
                      <span className="text-xs text-[#9B9B9B] block mb-1">{openedStr}</span>

                      {entry.isDone ? (
                        <div className="bg-white border border-[#C8CDD1] rounded-lg px-3 py-2.5">
                          <p className="text-xs font-semibold text-[#111] leading-snug mb-1.5">{entry.suggestion.title}</p>
                          <span className="text-[11px] text-[#9B9B9B] block mb-0.5">{openedStr}</span>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3 h-3 text-[#333] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            <span className="text-[11px] font-medium text-[#333]">Mark as Done</span>
                          </div>
                          {entry.operator && <p className="text-[11px] text-[#9B9B9B]">by {entry.operator}</p>}
                          {(entry.voiceNotes ?? []).map((vn, i) => (
                            <div key={'l' + i} className="mt-2" onClick={e => e.stopPropagation()}>
                              <VoiceNotePlayer src={vn.blobUrl} duration={vn.duration} />
                            </div>
                          ))}
                          {(entry.serverVoiceNoteIds ?? [])
                            .filter(id => !(entry.voiceNotes ?? []).some(vn => vn.voiceNoteServerId === id))
                            .map(id => (
                              <div key={'s' + id} className="mt-2" onClick={e => e.stopPropagation()}>
                                <VoiceNotePlayer src={`/api/voice-notes/${id}/audio`} serverId={id} />
                              </div>
                            ))}
                        </div>
                      ) : entry.isNotFeasible ? (
                        <div className="bg-white border border-[#C8CDD1] rounded-lg px-3 py-2.5">
                          <p className="text-xs font-semibold text-[#111] leading-snug mb-1.5">{entry.suggestion.title}</p>
                          <span className="text-[11px] text-[#9B9B9B] block mb-0.5">{openedStr}</span>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[11px] font-medium text-red-500">Mark as Not Feasible</span>
                          </div>
                          {entry.operator && <p className="text-[11px] text-[#9B9B9B]">by {entry.operator}</p>}
                          {(entry.voiceNotes ?? []).map((vn, i) => (
                            <div key={'l' + i} className="mt-2" onClick={e => e.stopPropagation()}>
                              <VoiceNotePlayer src={vn.blobUrl} duration={vn.duration} />
                            </div>
                          ))}
                          {(entry.serverVoiceNoteIds ?? [])
                            .filter(id => !(entry.voiceNotes ?? []).some(vn => vn.voiceNoteServerId === id))
                            .map(id => (
                              <div key={'s' + id} className="mt-2" onClick={e => e.stopPropagation()}>
                                <VoiceNotePlayer src={`/api/voice-notes/${id}/audio`} serverId={id} />
                              </div>
                            ))}
                        </div>
                      ) : entry.isAcknowledge ? (
                        <span className="text-xs text-[#333333]">{entry.suggestion.title}</span>
                      ) : (
                        <div
                          className="bg-white border border-[#C8CDD1] rounded-lg px-3 py-2 active:bg-[#F5F5F5] cursor-pointer"
                          onClick={() => { onSelectSuggestion?.(entry.suggestion); onClose() }}
                        >
                          {/* title row */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#333333] leading-snug flex-1">{entry.suggestion.title}</span>
                            <span className="text-[#9B9B9B] text-xs flex-shrink-0">›</span>
                          </div>

                        {/* voice note inside card — local blob first, then server endpoint for any remaining IDs */}
                          {(entry.voiceNotes ?? []).map((vn, i) => (
                            <div key={'l' + i} className="mt-2" onClick={e => e.stopPropagation()}>
                              <VoiceNotePlayer src={vn.blobUrl} duration={vn.duration} />
                            </div>
                          ))}
                          {(entry.serverVoiceNoteIds ?? [])
                            .filter(id => !(entry.voiceNotes ?? []).some(vn => vn.voiceNoteServerId === id))
                            .map(id => (
                              <div key={'s' + id} className="mt-2" onClick={e => e.stopPropagation()}>
                                <VoiceNotePlayer src={`/api/voice-notes/${id}/audio`} serverId={id} />
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
    </div>
  )
}
