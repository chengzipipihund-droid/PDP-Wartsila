/**
 * AIAlarmBanner.jsx
 *
 * Floating pill badge that tracks the AI analysis lifecycle:
 *   idle     → hidden
 *   firing   → "AI alarms incoming (2/4)"  (pulsing robot icon)
 *   analysing→ cycling step messages + expandable terminal log
 *   ready    → "AI Analysis Ready  ›"       (dark, clickable + expandable output)
 *   failed   → "AI Analysis Failed"         (red border)
 */
import { useState, useEffect, useRef } from 'react'
import RobotLogo from '@imgs/robot-logo.svg'

// Format groupResult into readable terminal lines
function buildOutputLines(groupResult) {
  if (!groupResult) return []
  const lines = []
  lines.push({ t: 'dim',   text: '── Analysis complete ─────────────────' })
  lines.push({ t: 'label', text: 'Root Cause ID:',   val: groupResult.rootCauseId })
  lines.push({ t: 'label', text: 'Group:',           val: (groupResult.group ?? []).join('  ') })
  lines.push({ t: 'dim',   text: '' })
  ;(groupResult.suggestions ?? []).forEach((s, i) => {
    lines.push({ t: 'section', text: `[S${i+1}] ${s.title}` })
    ;(s.steps ?? []).forEach(step => {
      lines.push({ t: 'step', text: `  ${step.order}. ${step.text}` })
    })
    lines.push({ t: 'dim', text: '' })
  })
  return lines
}

export default function AIAlarmBanner ({ status, alarmCount, totalAlarms, groupResult, thinkingText = '', suggestingDone = 0, totalSuggestions = 0, currentSuggestionTitle = '' }) {
  const [expanded, setExpanded] = useState(false)
  const [logLines, setLogLines] = useState([])   // live lines accumulated during analysing
  const termRef                 = useRef(null)

  // Accumulate log lines as steps progress during analysing
  useEffect(() => {
    if (status === 'idle') { setLogLines([]); setExpanded(false); return }
    if (status === 'firing') { setLogLines([]); return }
    if (status === 'analysing') {
      if (thinkingText) {
        setLogLines([{ t: 'thinking', text: thinkingText }])
      }
    }
    if (status === 'suggesting') {
      const lines = []
      // Phase 1 summary: just root cause + group
      if (groupResult) {
        lines.push({ t: 'dim',   text: '── Group analysis complete ───────────' })
        lines.push({ t: 'label', text: 'Root Cause:', val: groupResult.rootCauseId })
        lines.push({ t: 'label', text: 'Group:',      val: (groupResult.group ?? []).join('  ') })
        lines.push({ t: 'dim',   text: '' })
      }
      // Current suggestion being analyzed
      if (currentSuggestionTitle) {
        lines.push({ t: 'active', text: `Analyzing [${suggestingDone + 1}/${totalSuggestions}]: ${currentSuggestionTitle}` })
      }
      // Phase 2 thinking stream
      if (thinkingText) {
        lines.push({ t: 'thinking', text: thinkingText })
      }
      setLogLines(lines)
    }
    if (status === 'ready' && groupResult) {
      setLogLines(buildOutputLines(groupResult))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, groupResult, thinkingText, suggestingDone])

  // Auto-expand when thinking tokens start flowing, or when suggesting phase begins
  useEffect(() => {
    if (thinkingText && thinkingText.length > 0) setExpanded(true)
  }, [thinkingText.length > 0])

  useEffect(() => {
    if (status === 'suggesting') setExpanded(true)
  }, [status === 'suggesting'])

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [logLines])

  if (status === 'idle') return null

  const LABELS = {
    firing   : `AI alarms incoming (${alarmCount}/${totalAlarms})`,
    analysing: 'AI Group Analysis',
    suggesting: totalSuggestions > 0
      ? `AI Suggestions (${suggestingDone}/${totalSuggestions})`
      : 'AI Suggestions',
    ready    : 'AI Analysis Ready',
    failed   : 'AI Analysis Failed',
  }

  const label     = LABELS[status] ?? ''
  const isPulsing = status === 'firing' || status === 'analysing' || status === 'suggesting'
  const isReady   = status === 'ready'
  const isFailed  = status === 'failed'
  const canExpand = status === 'analysing' || status === 'suggesting' || status === 'ready'

  return (
    <div className="fixed bottom-16 right-4 z-40 flex flex-col items-end gap-2">

      {/* ── Expanded terminal card ── */}
      {expanded && canExpand && (
        <div
          className="w-80 rounded-xl shadow-2xl overflow-hidden border border-[#3B3D3F]"
          style={{ background: '#1A1C1E' }}
        >
          {/* Title bar */}
          <div className="flex items-center px-3 py-2 border-b border-[#2E3033]">
            <span className="text-[10px] text-[#666] font-mono">
              {isReady ? 'ai_output' : status === 'suggesting' ? 'ai_suggestions' : 'ai_reasoning'}
            </span>
          </div>
          {/* Terminal body */}
          <div
            ref={termRef}
            className="px-3 py-3 font-mono text-[11px] leading-relaxed overflow-y-auto"
            style={{ maxHeight: 320, minHeight: 80 }}
          >
            {logLines.length === 0 && (
              <span className="text-[#555]">Waiting for AI…</span>
            )}
            {logLines.map((line, i) => {
              if (line.t === 'thinking')
                return (
                  <div key={i} className="text-[#C8E6C9] whitespace-pre-wrap leading-relaxed">
                    {line.text}
                    {(status === 'analysing' || status === 'suggesting') && (
                      <span className="animate-pulse text-[#98E4A5]">▌</span>
                    )}
                  </div>
                )
              if (line.t === 'dim')
                return <div key={i} className="text-[#444]">{line.text || '\u00A0'}</div>
              if (line.t === 'label')
                return (
                  <div key={i} className="flex gap-2">
                    <span className="text-[#6888C8] w-28 flex-shrink-0">{line.text}</span>
                    <span className="text-[#98E4A5] break-all">{line.val}</span>
                  </div>
                )
              if (line.t === 'section')
                return <div key={i} className="text-[#E8C97A] mt-1">{line.text}</div>
              if (line.t === 'step')
                return <div key={i} className="text-[#AAAAAA] pl-1">{line.text}</div>
              if (line.t === 'active')
                return (
                  <div key={i} className="text-[#98E4A5] flex items-center gap-1.5">
                    <span className="animate-pulse">▶</span>
                    <span>{line.text}</span>
                  </div>
                )
              if (line.t === 'done')
                return <div key={i} className="text-[#555]">✓ {line.text}</div>
              return <div key={i} className="text-[#AAAAAA]">{line.text}</div>
            })}
            {status === 'analysing' && (
              <div className="text-[#666] flex items-center gap-1 mt-1">
                <span className="animate-pulse">_</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pill ── */}
      <div className="flex items-center gap-1">
        {/* Main pill */}
        <button
          onClick={canExpand ? () => setExpanded(v => !v) : undefined}
          className={[
            'flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-xs font-semibold transition-all select-none',
            isReady  ? 'bg-[#3B3D3F] text-white hover:bg-[#2a2c2e] cursor-pointer' :
            isFailed ? 'bg-white border border-red-300 text-red-500 cursor-default' :
                       'bg-white border border-[#C8CDD1] text-[#555555] cursor-default',
          ].join(' ')}
        >
          <img
            src={RobotLogo}
            alt="AI"
            className={`w-4 h-4 flex-shrink-0 ${isPulsing ? 'animate-pulse' : ''}`}
          />
          <span>{label}</span>
          {isReady && <span className="ml-0.5 opacity-60">{expanded ? '▲' : '▼'}</span>}
        </button>

        {/* Expand toggle button */}
        {canExpand && (
          <button
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Hide output' : 'Show AI output'}
            className={[
              'flex items-center justify-center w-8 h-8 rounded-full shadow-lg text-xs font-bold transition-all select-none',
              expanded
                ? 'bg-[#1A1C1E] text-[#98E4A5] border border-[#3B4040]'
                : isReady
                ? 'bg-[#3B3D3F] text-white hover:bg-[#2a2c2e]'
                : 'bg-white border border-[#C8CDD1] text-[#555555] hover:bg-[#EDEDED]',
            ].join(' ')}
          >
            {expanded ? '✕' : '</>'}
          </button>
        )}
      </div>
    </div>
  )
}
