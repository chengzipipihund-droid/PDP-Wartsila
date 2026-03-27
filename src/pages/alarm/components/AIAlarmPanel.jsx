/**
 * AIAlarmPanel.jsx
 *
 * Right-side panel for live AI group analysis results.
 * Mirrors the style of AlarmDetailPanel (same dimensions, same card language).
 *
 * Props:
 *   aiAlarms    {object[]}   — alarms fired in this episode (from AI_ALARM_TRIGGERED events)
 *   groupResult {object}     — result from analyseWithPDF  (group, rootCauseId, suggestions)
 *   panelTop    {number}     — top offset in px, tracks header scroll (default 48)
 *   onClose     {function}
 */
import { useState, useEffect } from 'react'
import RobotLogo    from '@imgs/robot-logo.svg'
import SensorIcon   from '@imgs/sensor-icon.svg'
import StepIcon     from '@imgs/step-icon.svg'
import RedActive    from '@imgs/red-active.svg'
import YellowActive from '@imgs/yellow-active.svg'

// Map AI severity strings → icon
const SEV_ICON = {
  critical : RedActive,
  high     : YellowActive,
  warning  : YellowActive,
}

// Sensor status → colour
const statusColor = (st) =>
  st === 'critical' ? '#ef4444' :
  st === 'warning'  ? '#f97316' : '#22c55e'

// ─────────────────────────────────────────────────────────────────────────────

export default function AIAlarmPanel ({ aiAlarms, groupResult, onClose }) {
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [panelTop, setPanelTop] = useState(48)
  useEffect(() => {
    const onScroll = () => setPanelTop(Math.max(0, 48 - window.scrollY))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const [reasoningMap, setReasoningMap]             = useState({})  // keyed by suggestion id
  const [loadingId, setLoadingId]                   = useState(null)

  const [groupExpanded, setGroupExpanded]           = useState(false)

  const rootAlarm    = aiAlarms.find(a => a.id === groupResult.rootCauseId) ?? aiAlarms[0]
  const childAlarms  = aiAlarms.filter(a => a.id !== groupResult.rootCauseId)

  // ── Load reasoning for a suggestion (lazy, cached) ───────────────────────
  const openSuggestion = async (s) => {
    setSelectedSuggestion(s)
    if (reasoningMap[s.id]) return   // already loaded
    setLoadingId(s.id)
    try {
      const res  = await fetch('/api/ai/reasoning', {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ suggestionId: s.id }),
      })
      const data = await res.json()
      setReasoningMap(prev => ({ ...prev, [s.id]: data }))
    } catch {
      setReasoningMap(prev => ({
        ...prev,
        [s.id]: { confidence: 70, reasoning: 'AI reasoning temporarily unavailable.', sensorData: [] },
      }))
    }
    setLoadingId(null)
  }

  const reasoning          = selectedSuggestion ? (reasoningMap[selectedSuggestion.id] ?? null) : null
  const isLoadingReasoning = loadingId === selectedSuggestion?.id

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop — closes panel when clicking outside */}
      <div
        className="fixed right-0 left-0 bottom-0 z-40"
        style={{ top: panelTop }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 z-50 flex flex-col bg-[#F2F2F2] shadow-2xl"
        style={{ width: 380, top: panelTop, bottom: 48, overflowY: 'auto' }}
      >

        {/* ── Dark header ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0" style={{ background: '#3B3D3F' }}>
          <div className="flex items-start gap-2 px-5 pt-5 pb-2">
            <img src={RobotLogo} alt="AI" className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-80" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-[#9B9B9B] uppercase tracking-wider mb-1">
                AI Group Analysis
              </p>
              <h2 className="text-sm font-bold text-white leading-snug">
                {rootAlarm.description}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-[#9B9B9B] hover:text-white transition-colors text-lg leading-none flex-shrink-0 ml-1"
              aria-label="Close"
            >✕</button>
          </div>

          <div className="px-5 pb-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-400 bg-red-400/10 border border-red-400/30 px-2.5 py-0.5 rounded-full">
              ● Root Cause
            </span>
          </div>
        </div>

        {/* ── LIST VIEW: alarm group + suggestions ────────────────────────── */}
        {!selectedSuggestion && (
          <>
            {/* Alarm Group */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-wide mb-3">
                Alarm Group ({aiAlarms.length})
              </p>

              {/* Root cause row — like AlarmList root variant */}
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer hover:brightness-95 transition-all"
                style={{ background: '#E3E6E9' }}
              >
                {/* Expand chevron */}
                {childAlarms.length > 0 && (
                  <button
                    onClick={() => setGroupExpanded(v => !v)}
                    className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-[#666] text-[10px] font-bold transition-transform duration-150"
                    style={{ transform: groupExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >▶</button>
                )}
                <img src={SEV_ICON[rootAlarm.severity] ?? RedActive} alt={rootAlarm.severity} className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#111111] leading-snug truncate">
                    {rootAlarm.description}
                  </p>
                  <p className="text-[10px] text-[#9B9B9B]">{rootAlarm.id}</p>
                </div>
                <span className="text-[9px] font-bold text-red-400 flex-shrink-0 uppercase tracking-wide">Root</span>
              </div>

              {/* Child alarms — collapsed by default, same as AlarmList child rows */}
              {groupExpanded && childAlarms.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {childAlarms.map((alarm, idx) => (
                    <div
                      key={alarm.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 ml-5"
                      style={{ background: '#EDEEF0' }}
                    >
                      <img src={SEV_ICON[alarm.severity] ?? YellowActive} alt={alarm.severity} className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#111111] leading-snug truncate">
                          {alarm.description}
                        </p>
                        <p className="text-[10px] text-[#9B9B9B]">{alarm.id} · T+{(idx + 1) * 5}s</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-5 my-3 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />

            {/* Suggested Actions */}
            <div className="px-5 pb-4">
              <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-wide mb-3">
                Suggested Actions
              </p>
              {groupResult.suggestions.map((s, i) => (
                <div
                  key={s.id}
                  className="mb-3 bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 cursor-pointer hover:bg-[#E0E0E0] active:bg-[#DADADA] transition-colors"
                  onClick={() => openSuggestion(s)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[#9B9B9B]">Option {i + 1}</span>
                    <span className="text-[11px] text-[#9B9B9B]">Tap for analysis ›</span>
                  </div>
                  <p className="text-sm font-bold text-[#111111] mb-1 leading-snug">{s.title}</p>
                  {(s.steps ?? []).length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <img src={StepIcon} alt="" className="w-3.5 h-3.5 opacity-60" />
                      <p className="text-[11px] text-[#9B9B9B]">{s.steps.length} steps from manual</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── DETAIL VIEW: reasoning for one suggestion ───────────────────── */}
        {selectedSuggestion && (
          <div className="flex-1 pb-4">

            {/* Back row */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E0E0E0]">
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="text-[#9B9B9B] hover:text-[#333] transition-colors text-lg leading-none flex-shrink-0"
                aria-label="Back"
              >←</button>
              <span className="text-xs text-[#9B9B9B] uppercase tracking-wide flex-1">
                Suggested Steps
              </span>
            </div>

            <div className="px-5 pt-3">

              {/* Loading skeleton */}
              {isLoadingReasoning && (
                <div className="bg-[#E9E9E9] rounded-lg px-4 py-6 mb-3 flex items-center gap-3">
                  <img src={RobotLogo} alt="AI" className="w-5 h-5 animate-pulse opacity-60" />
                  <span className="text-xs text-[#9B9B9B]">AI analysing confidence &amp; sensors…</span>
                </div>
              )}

              {/* Title */}
              <p className="text-sm font-bold text-[#111111] mb-0.5 leading-snug">
                {selectedSuggestion.title}
              </p>

              {/* Confidence badge — only once reasoning is loaded */}
              {reasoning && !isLoadingReasoning && (
                <p
                  className="text-xs font-semibold mb-3"
                  style={{ color: reasoning.confidence >= 75 ? '#22c55e' : '#f97316' }}
                >
                  Confidence: {reasoning.confidence}%&nbsp;
                  ({reasoning.confidence >= 75 ? 'High' : 'Medium'})
                </p>
              )}

              {/* Sensor Correlation */}
              {reasoning && !isLoadingReasoning && (reasoning.sensorData ?? []).length > 0 && (
                <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={SensorIcon} alt="" className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">
                      Sensor Correlation
                    </span>
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
                      {reasoning.sensorData.map((sen, i) => (
                        <tr
                          key={i}
                          className={i < reasoning.sensorData.length - 1 ? 'border-b border-[#CCCCCC]/50' : ''}
                        >
                          <td
                            className="py-1.5 pr-2 leading-snug font-medium"
                            style={{ color: statusColor(sen.status) }}
                          >
                            {sen.name}
                          </td>
                          <td className="py-1.5 pr-2 text-right text-[#333333] whitespace-nowrap">
                            {sen.value}
                          </td>
                          <td className="py-1.5 text-right text-[#555555] whitespace-nowrap">
                            {sen.normalRange}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AI Reasoning */}
              {reasoning && !isLoadingReasoning && (
                <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={RobotLogo} alt="AI" className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">
                      AI Reasoning
                    </span>
                  </div>
                  <p className="text-xs text-[#555555] leading-relaxed">{reasoning.reasoning}</p>
                </div>
              )}

              {/* Step Details */}
              {(selectedSuggestion.steps ?? []).length > 0 && (
                <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={StepIcon} alt="" className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">
                      Step Details
                    </span>
                  </div>
                  <ol className="space-y-2.5">
                    {selectedSuggestion.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-xs font-bold text-[#9B9B9B] flex-shrink-0 mt-0.5 w-14">
                          Step {i + 1} –
                        </span>
                        <span className="text-xs text-[#333333] leading-relaxed">
                          {step.text ?? step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

            </div>
          </div>
        )}

        <div className="h-6" />
      </div>
    </>
  )
}
