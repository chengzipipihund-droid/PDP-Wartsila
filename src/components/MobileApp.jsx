import { useState, useEffect, useRef } from 'react'
import { connectWebSocket } from '../services/websocket'
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
import ECRGreyIcon    from '@imgs/ECR-grey.svg'
import BridgeGreyIcon from '@imgs/Bridge-grey.svg'
import MobileAlarmDetail from './MobileAlarmDetail'
import { isRoot, CHILD_TO_ROOT, ROOT_TO_GROUP, getVisibleAlarms, registerAIGroup, unregisterAIGroup } from './alarmGroups'
import AcknowledgeIcon from '@imgs/acknowledge-icon.svg'

// ── Logged-in user ──────────────────────────────────────────
const CURRENT_USER = 'Chief Engineer - Erik Larsson'
const CURRENT_NAME = 'Erik Larsson'
const CURRENT_ROLE = 'Chief Engineer'

// ── Severity icons map ────────────────────────────────────────
const SEV_ICON = {
  red:     { active: RedActive,     inactive: RedInactive },
  magenta: { active: MagentaActive, inactive: MagentaInactive },
  yellow:  { active: YellowActive,  inactive: YellowInactive },
  green:   { active: GreenActive,   inactive: GreenInactive },
  blue:    { active: BlueActive,    inactive: BlueInactive },
}

// ── Small helper to format ISO → "DD/MM/YYYY HH:MM" ─────────
function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date}  ${time}`
}

// ── "Your Responsibility" row ─────────────────────────────────
function MyAlarmRow({ alarm, onSelect, isSelected, onToggleSelect, isRootRow, isGroupOpen, childCount, onToggleGroup }) {
  const isActive = alarm.state === 'active'
  const icon     = SEV_ICON[alarm.severity]?.[alarm.state]

  return (
    <div className="mb-1">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none active:bg-[#E0E0E0]"
        style={{ background: isRootRow ? '#E3E6E9' : '#FFFFFF' }}
        onClick={() => onSelect(alarm)}
      >
        {/* Expand chevron for root alarms */}
        {isRootRow ? (
          <button
            className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[#888] text-[9px] font-bold transition-transform duration-150"
            style={{ transform: isGroupOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            onClick={e => { e.stopPropagation(); onToggleGroup && onToggleGroup() }}
          >▶</button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={e => { e.stopPropagation(); onToggleSelect(alarm.id) }}
          onClick={e => e.stopPropagation()}
          className="w-4 h-4 flex-shrink-0 rounded cursor-pointer"
          style={{ accentColor: '#3B3D3F' }}
        />

        {/* Severity icon */}
        {icon && <img src={icon} alt={alarm.severity} className="w-5 h-5 flex-shrink-0" />}

        {/* Description */}
        <span
          className={`text-sm flex-1 leading-tight ${isActive ? 'font-bold text-[#111111]' : 'text-[#727272]'}`}
        >
          {alarm.description}
        </span>
      </div>
    </div>
  )
}

// ── "All List" row ─────────────────────────────────────────────
function AllAlarmRow({ alarm, onSelect, rowVariant, onToggleGroup, isGroupOpen, childCount, isSelected, onToggleSelect }) {
  const isActive = alarm.state === 'active'
  const icon     = SEV_ICON[alarm.severity]?.[alarm.state]
  const RespIcon = alarm.responsibility === 'ECR' ? ECRGreyIcon : BridgeGreyIcon

  // Split "Role - Name" for secondary line
  const [respRole, ...rest] = alarm.person.split(' - ')
  const personName = rest.join(' - ')

  const isChild = rowVariant === 'child'
  const isRootRow = rowVariant === 'root'

  const bgColor = isChild ? '#EDEEF0' : isRootRow ? '#E3E6E9' : '#FFFFFF'

  return (
    <div
      className="flex items-start gap-3 px-3 py-2 rounded-lg mb-1 cursor-pointer active:brightness-95"
      style={{ background: bgColor, marginLeft: isChild ? 12 : 0 }}
      onClick={() => onSelect(alarm)}
    >
      {/* Expand button for root alarms */}
      {isRootRow ? (
        <button
          className="w-4 h-4 mt-0.5 flex-shrink-0 flex items-center justify-center text-[#888] text-[9px] font-bold transition-transform duration-150"
          style={{ transform: isGroupOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          onClick={e => { e.stopPropagation(); onToggleGroup() }}
          title={isGroupOpen ? `Collapse` : `Expand (${childCount} related)`}
        >
          ▶
        </button>
      ) : isChild ? (
        <span className="w-4 flex-shrink-0 text-[#AAAAAA] text-xs mt-0.5">└</span>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={e => { e.stopPropagation(); onToggleSelect(alarm.id) }}
        onClick={e => e.stopPropagation()}
        className="w-4 h-4 mt-0.5 flex-shrink-0 rounded cursor-pointer"
        style={{ accentColor: '#3B3D3F' }}
      />

      {/* Severity icon */}
      {icon && <img src={icon} alt={alarm.severity} className="w-5 h-5 mt-0.5 flex-shrink-0" />}

      {/* Text block */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${isActive ? 'font-bold text-[#111111]' : 'text-[#727272]'}`}>
          {alarm.description}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {isChild ? (
            <span className="text-[11px] text-[#C0C0C0]">--</span>
          ) : (
            <>
              <img src={RespIcon} alt={alarm.responsibility} className="w-3 h-3 opacity-70" />
              <span className="text-[11px] text-[#9B9B9B]">
                {alarm.responsibility} – {personName}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small filter icon (SVG inline) ────────────────────────────
function FilterSvg() {
  return (
    <svg width="18" height="16" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1h18M4 6.5h12M7.5 12h5" stroke="#9B9B9B" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

// ── Main MobileApp ─────────────────────────────────────────────
export default function MobileApp() {
  const [alarms, setAlarms] = useState([])
  const [selectedAlarmId, setSelectedAlarmId] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [selectedAlarms, setSelectedAlarms] = useState(new Set())
  const [aiGroup, setAiGroup] = useState(null) // { rootId, childIds } | null
  const [sessionLogs, setSessionLogs] = useState({}) // keyed by alarmId
  const collapseTimerRef = useRef(null)  // pending 5-s collapse setTimeout id

  const toggleGroup = (rootId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(rootId) ? next.delete(rootId) : next.add(rootId)
      return next
    })
  }

  // Cascade select: root → all children; child → only itself
  const toggleSelect = (id) => {
    setSelectedAlarms(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        if (isRoot(id)) ROOT_TO_GROUP[id].childIds.forEach(cid => next.delete(cid))
      } else {
        next.add(id)
        if (isRoot(id)) ROOT_TO_GROUP[id].childIds.forEach(cid => {
          if (alarms.find(a => a.id === cid)) next.add(cid)
        })
      }
      return next
    })
  }

  const acknowledgeAlarms = async (ids) => {
    try {
      await fetch('/api/alarms/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [...ids],
          person: 'Chief Engineer - Erik Larsson',
          responsibility: 'ECR',
        }),
      })
      setSelectedAlarms(new Set())
    } catch (e) {
      console.error('Acknowledge failed', e)
    }
  }

  useEffect(() => {
    const ws = connectWebSocket(
      (message) => {
        if (message.type === 'INIT') {
          // Merge: keep any live AI alarms already in state (INIT only has regular alarms)
          setAlarms(prev => {
            const aiAlarms   = prev.filter(a => a._isAIAlarm)
            const regular    = message.data
            const regularIds = new Set(regular.map(a => a.id))
            return [...aiAlarms.filter(a => !regularIds.has(a.id)), ...regular]
          })
        }
        if (message.type === 'NEW')    setAlarms(prev => [message.data, ...prev])
        if (message.type === 'UPDATE') setAlarms(prev => prev.map(a => a.id === message.data.id ? message.data : a))
        if (message.type === 'SESSION_LOG_UPDATE') {
          setSessionLogs(prev => ({ ...prev, [message.alarmId]: message.entries }))
        }
        if (message.type === 'AI_ALARM_TRIGGERED') {
          const SEV_MAP = { critical: 'red', high: 'yellow', warning: 'yellow' }
          const a = message.alarm
          const normalized = {
            id             : a.id,
            description    : a.description,
            severity       : SEV_MAP[a.severity] ?? 'red',
            state          : 'active',
            type           : 'Automation',
            responsibility : 'ECR',
            person         : 'Chief Engineer - Erik Larsson',
            appearance     : a.triggeredAt,
            restore        : null,
            _isAIAlarm     : true,
          }
          // Single atomic update: clear old episode on index 0, then add new alarm
          setAlarms(prev => {
            const base = message.index === 0 ? prev.filter(x => !x._isAIAlarm) : prev
            return [normalized, ...base.filter(x => x.id !== normalized.id)]
          })
          // On new episode start, cancel pending timer, collapse any previously expanded AI group
          if (message.index === 0) {
            if (collapseTimerRef.current) {
              clearTimeout(collapseTimerRef.current)
              collapseTimerRef.current = null
            }
            setAiGroup(null)
            setExpandedGroups(prev => {
              const next = new Set(prev)
              for (const id of [...next]) {
                if (typeof id === 'string' && id.startsWith('AI_')) next.delete(id)
              }
              return next
            })
          }
        }
        if (message.type === 'AI_ANALYSIS_READY') {
          const { result, alarmIds } = message
          const rootId   = (alarmIds ?? [])[0] ?? result.rootCauseId
          const childIds = (alarmIds ?? []).slice(1)
          result.rootCauseId = rootId
          // Attach initial suggestions (no confidence yet) to the root cause alarm
          const initialSuggestions = (result.suggestions ?? []).map(s => ({
            id        : s.id,
            title     : s.title,
            steps     : (s.steps ?? []).map(st => st.text),
            confidence: null,
            reasoning : null,
            sensors   : null,
          }))
          setAlarms(prev => prev.map(a =>
            a.id === rootId ? { ...a, suggestions: initialSuggestions } : a
          ))
          // catchUp = episode already done — collapse immediately, no wait
          const collapseDelay = message.catchUp ? 0 : 5000
          if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
          collapseTimerRef.current = setTimeout(() => {
            collapseTimerRef.current = null
            registerAIGroup(rootId, childIds)  // keep module state for AlarmRow styling
            setAiGroup({ rootId, childIds })
          }, collapseDelay)
        }
        if (message.type === 'AI_REASONING_READY') {
          const { suggestionId, rootCauseId, confidence, reasoning, sensorData } = message
          const sensors = (sensorData ?? []).map(s => ({
            name   : s.name,
            current: s.value,
            normal : s.normalRange,
            status : s.status,
          }))
          setAlarms(prev => prev.map(a => {
            if (a.id !== rootCauseId) return a
            const updatedSuggs = (a.suggestions ?? []).map(s =>
              s.id === suggestionId ? { ...s, confidence, reasoning, sensors } : s
            )
            return { ...a, suggestions: updatedSuggs }
          }))
        }
        if (message.type === 'FULL_RESET') {
          if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null }
          setAlarms(message.data)
          setAiGroup(null)
          setSelectedAlarmId(null)
          setExpandedGroups(new Set())
          setSessionLogs({})
        }
        if (message.type === 'CLEAR_ALL') {
          if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null }
          setAlarms([])
          setAiGroup(null)
          setSelectedAlarmId(null)
          setExpandedGroups(new Set())
          setSessionLogs({})
        }
      },
      () => {} // connection status — not displayed on mobile
    )
    return () => { if (ws) ws.close() }
  }, [])

  // Fetch session log whenever an alarm is opened (same pattern as desktop App.jsx)
  useEffect(() => {
    if (selectedAlarmId == null) return
    fetch(`/api/alarms/${selectedAlarmId}/session-log`)
      .then(r => r.json())
      .then(entries => setSessionLogs(prev => ({ ...prev, [selectedAlarmId]: entries })))
      .catch(() => {})
  }, [selectedAlarmId])

  const sorted = [...alarms].sort((a, b) => new Date(b.appearance) - new Date(a.appearance))

  // Apply group-awareness to both sections so children are hidden under root
  const visibleSorted = getVisibleAlarms(sorted, expandedGroups, aiGroup)

  // My alarms = person matches logged-in user (group-aware: children hidden under root)
  const myAlarms  = visibleSorted.filter(a => a.person === CURRENT_USER)
  const allAlarms = sorted

  // Detail view — always read the live alarm from state so WS updates reflect
  const selectedAlarm = selectedAlarmId !== null
    ? alarms.find(a => a.id === selectedAlarmId) ?? null
    : null

  if (selectedAlarm) {
    return (
      <MobileAlarmDetail
        alarm={selectedAlarm}
        onBack={() => setSelectedAlarmId(null)}
        serverSessionLog={sessionLogs[selectedAlarm.id] ?? []}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2]" style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#3B3D3F' }}
      >
        {/* Avatar circle */}
        <div className="w-12 h-12 rounded-full bg-[#5A5D5F] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#6B6E70]">
          <span className="text-white font-semibold text-sm tracking-wide">EL</span>
        </div>

        {/* Name + role */}
        <div className="flex-1">
          <div className="text-white font-semibold text-base leading-tight">{CURRENT_NAME}</div>
          <div className="text-[#9B9B9B] text-sm leading-tight">{CURRENT_ROLE}</div>
        </div>

        {/* Bell icon REMOVED per design */}
      </header>

      {/* ── Your Responsibility ─────────────────────────────── */}
      <section className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-semibold text-[#1A1A1A] text-base">
            Your Responsibility&nbsp;
            <span className="text-[#555555]">({myAlarms.length})</span>
          </span>
          <FilterSvg />
        </div>

        {myAlarms.length === 0 ? (
          <p className="text-sm text-[#9B9B9B] px-2">No alarms assigned to you.</p>
        ) : (
          myAlarms.map(alarm => {
            const isAIRoot    = aiGroup && aiGroup.rootId === alarm.id
            const isRootAlarm = isRoot(alarm.id) || isAIRoot
            const group       = ROOT_TO_GROUP[alarm.id] ?? (isAIRoot ? aiGroup : null)
            return (
              <MyAlarmRow
                key={alarm.id}
                alarm={alarm}
                onSelect={a => setSelectedAlarmId(a.id)}
                isSelected={selectedAlarms.has(alarm.id)}
                onToggleSelect={toggleSelect}
                isRootRow={isRootAlarm}
                isGroupOpen={isRootAlarm ? expandedGroups.has(alarm.id) : false}
                childCount={group ? group.childIds.length : 0}
                onToggleGroup={isRootAlarm ? () => toggleGroup(alarm.id) : undefined}
              />
            )
          })
        )}
      </section>

      {/* ── All List ─────────────────────────────────────────── */}
      <section className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-semibold text-[#1A1A1A] text-base">
            All List&nbsp;
            <span className="text-[#555555]">({getVisibleAlarms(allAlarms, expandedGroups, aiGroup).length})</span>
          </span>
          <FilterSvg />
        </div>

        {getVisibleAlarms(allAlarms, expandedGroups, aiGroup).map(alarm => {
          const isAIChild   = aiGroup && aiGroup.childIds.includes(alarm.id)
          const isAIRoot    = aiGroup && aiGroup.rootId === alarm.id
          const isChild     = CHILD_TO_ROOT[alarm.id] !== undefined || isAIChild
          const isRootAlarm = isRoot(alarm.id) || isAIRoot
          const group       = ROOT_TO_GROUP[alarm.id] ?? (isAIRoot ? aiGroup : null)

          return (
            <AllAlarmRow
              key={alarm.id}
              alarm={alarm}
              onSelect={a => setSelectedAlarmId(a.id)}
              rowVariant={isChild ? 'child' : isRootAlarm ? 'root' : null}
              isGroupOpen={isRootAlarm ? expandedGroups.has(alarm.id) : false}
              childCount={group ? group.childIds.length : 0}
              onToggleGroup={isRootAlarm ? () => toggleGroup(alarm.id) : undefined}
              isSelected={selectedAlarms.has(alarm.id)}
              onToggleSelect={toggleSelect}
            />
          )
        })}
      </section>

      {/* ── Acknowledge bottom sheet ─────────────────────── */}
      {selectedAlarms.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#E6E6E6] shadow-2xl rounded-t-2xl px-5 pt-5 pb-8"
          style={{ maxWidth: 480, margin: '0 auto' }}
        >
          {/* Icon + title row */}
          <div className="flex items-center gap-3 mb-3">
            <img src={AcknowledgeIcon} alt="acknowledge" className="w-10 h-10 flex-shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900">
              Acknowledge the selected alarms?
            </h2>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            You will take responsibility of these alarms.<br />
            Inactive alarms will be disappeared on live alarm after acknowledging them.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedAlarms(new Set())}
              className="flex-1 py-2.5 border border-[#C8CDD1] rounded-lg text-gray-600 text-sm font-medium bg-white hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => acknowledgeAlarms(selectedAlarms)}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: '#3B3D3F' }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
