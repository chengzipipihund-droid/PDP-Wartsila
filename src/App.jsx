import { useState, useEffect, useRef } from 'react'
import AlarmList from './components/AlarmList'
import Header from './components/Header'
import BottomBar from './components/BottomBar'
import AlarmDetailPanel from './components/AlarmDetailPanel'
import AlarmDatabase from './components/AlarmDatabase'
import { connectWebSocket } from './services/websocket'
import { getVisibleAlarms, isRoot, ROOT_TO_GROUP, registerAIGroup, unregisterAIGroup } from './components/alarmGroups'
import AIAlarmBanner from './components/AIAlarmBanner'

function App() {
  const [page, setPage]                        = useState('list') // 'list' | 'database'
  const [alarms, setAlarms] = useState([])
  const registeredAIRootRef = useRef(null)
  const [activeSeverities, setActiveSeverities] = useState(new Set())
  const [activeResps, setActiveResps]           = useState(new Set())
  const [selectedAlarms, setSelectedAlarms]     = useState(new Set())
  const [selectedAlarmId, setSelectedAlarmId]   = useState(null)
  const [isConnected, setIsConnected]           = useState(false)
  const [sessionLogs, setSessionLogs]           = useState({}) // keyed by alarmId
  const [voiceNotesByAlarm, setVoiceNotesByAlarm] = useState({}) // keyed by alarmId
  const [expandedGroups, setExpandedGroups]     = useState(new Set())
  const [aiState, setAiState]                   = useState({ status: 'idle', alarms: [], groupResult: null, thinkingText: '', suggestingDone: 0, totalSuggestions: 0, currentSuggestionTitle: '' })
  // aiGroup drives visibility directly via React state (avoids module-mutation timing issues)
  const [aiGroup, setAiGroup]                   = useState(null) // { rootId, childIds } | null
  const collapseTimerRef = useRef(null)  // pending 5-s collapse setTimeout id

  const toggleGroup = (rootId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(rootId)) next.delete(rootId)
      else next.add(rootId)
      return next
    })
  }

  useEffect(() => {
    const ws = connectWebSocket((message) => {
      switch (message.type) {
        case 'INIT':
          // Merge: keep any live AI alarms already in state (INIT only has regular alarms)
          setAlarms(prev => {
            const aiAlarms = prev.filter(a => a._isAIAlarm)
            const regular  = message.data
            const regularIds = new Set(regular.map(a => a.id))
            return [...aiAlarms.filter(a => !regularIds.has(a.id)), ...regular]
          })
          break
        case 'NEW':
          setAlarms(prev => [message.data, ...prev])
          break
        case 'UPDATE':
          setAlarms(prev => prev.map(a => a.id === message.data.id ? message.data : a))
          break
        case 'SESSION_LOG_UPDATE':
          setSessionLogs(prev => ({ ...prev, [message.alarmId]: message.entries }))
          break
        case 'VOICE_NOTE_UPDATE':
          setVoiceNotesByAlarm(prev => ({ ...prev, [message.alarmId]: message.notes }))
          break
        case 'AI_ALARM_TRIGGERED': {
          // Normalize AI alarm → same shape as regular alarms so AlarmList can render it
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
            _isAIAlarm     : true,   // flag so we can remove them on reset
          }
          setAlarms(prev => [normalized, ...prev.filter(x => x.id !== normalized.id)])
          setAiState(prev => ({
            ...prev,
            status: 'firing',
            alarms: [...prev.alarms.filter(x => x.id !== a.id), a],
          }))
          // After the last alarm lands, wait briefly so user sees (4/4), then switch to analysing
          if (message.index === message.total - 1) {
            setTimeout(() => setAiState(prev => ({ ...prev, status: 'analysing' })), 900)
          }
          break
        }
        case 'AI_ANALYSIS_READY': {
          const { result, alarmIds } = message
          const rootId   = (alarmIds ?? [])[0] ?? result.rootCauseId
          const childIds = (alarmIds ?? []).slice(1)
          result.rootCauseId = rootId
          registeredAIRootRef.current = rootId
          // Show the result banner immediately, but wait 5 s before collapsing
          setAiState(prev => ({ ...prev, status: 'suggesting', groupResult: result, suggestingDone: 0, totalSuggestions: result.suggestions?.length ?? 0, thinkingText: '', currentSuggestionTitle: '' }))
          // Attach initial suggestions (no confidence yet) to the root cause alarm
          // so the detail panel can show them as "loading" while Phase 2 runs
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
          if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
          // catchUp = episode already done (catch-up replay) — collapse immediately, no wait
          const collapseDelay = message.catchUp ? 0 : 5000
          collapseTimerRef.current = setTimeout(() => {
            collapseTimerRef.current = null
            registerAIGroup(rootId, childIds)  // keep module state for AlarmRow styling
            setAiGroup({ rootId, childIds })   // this is what actually hides the child rows
          }, collapseDelay)
          break
        }
        case 'AI_SUGGESTION_THINKING_START':
          // Reset thinking text for this suggestion's reasoning stream
          setAiState(prev => ({
            ...prev,
            thinkingText          : '',
            currentSuggestionTitle: message.suggestionTitle,
          }))
          break
        case 'AI_REASONING_READY': {
          const { suggestionId, rootCauseId, confidence, reasoning, sensorData } = message
          // Map sensor data to the shape AlarmDetailPanel expects
          const sensors = (sensorData ?? []).map(s => ({
            name   : s.name,
            current: s.value,
            normal : s.normalRange,
            status : s.status,
          }))
          // Guard: only count this episode's suggestions (match rootCauseId)
          setAiState(prev => ({
            ...prev,
            // cap at totalSuggestions to prevent stale-event overflow
            suggestingDone: Math.min((prev.suggestingDone ?? 0) + 1, prev.totalSuggestions),
          }))
          setAlarms(prev => prev.map(a => {
            if (a.id !== rootCauseId) return a
            const updatedSuggs = (a.suggestions ?? []).map(s =>
              s.id === suggestionId ? { ...s, confidence, reasoning, sensors } : s
            )
            return { ...a, suggestions: updatedSuggs }
          }))
          break
        }
        case 'AI_THINKING_TOKEN':
          setAiState(prev => ({ ...prev, thinkingText: prev.thinkingText + message.token }))
          break
        case 'AI_SUGGESTIONS_READY':
          setAiState(prev => ({ ...prev, status: 'ready', thinkingText: '', currentSuggestionTitle: '' }))
          break
        case 'AI_ANALYSIS_FAILED':
          setAiState(prev => ({ ...prev, status: 'failed' }))
          break
        case 'FULL_RESET':
          if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null }
          unregisterAIGroup(registeredAIRootRef.current)
          registeredAIRootRef.current = null
          setAlarms(message.data)
          setAiState({ status: 'idle', alarms: [], groupResult: null, thinkingText: '', suggestingDone: 0, totalSuggestions: 0, currentSuggestionTitle: '' })
          setAiGroup(null)
          setSelectedAlarmId(null)
          break
        case 'CLEAR_ALL':
          if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null }
          unregisterAIGroup(registeredAIRootRef.current)
          registeredAIRootRef.current = null
          setAlarms([])
          setAiState({ status: 'idle', alarms: [], groupResult: null, thinkingText: '', suggestingDone: 0, totalSuggestions: 0, currentSuggestionTitle: '' })
          setAiGroup(null)
          setSelectedAlarmId(null)
          setSessionLogs({})
          break
        default:
          break
      }
    }, setIsConnected)
    return () => { if (ws) ws.close() }
  }, [])

  // Fetch session log whenever a panel is opened
  useEffect(() => {
    if (selectedAlarmId == null) return
    fetch(`/api/alarms/${selectedAlarmId}/session-log`)
      .then(r => r.json())
      .then(entries => setSessionLogs(prev => ({ ...prev, [selectedAlarmId]: entries })))
      .catch(() => {})
  }, [selectedAlarmId])
  const filteredAlarms = (() => {
    const sorted = [...alarms].sort((a, b) => new Date(b.appearance) - new Date(a.appearance))

    // First pass: alarms that directly match the active filters
    const directMatch = new Set(
      sorted
        .filter(alarm => {
          const sevOk  = activeSeverities.size === 0 || activeSeverities.has(alarm.severity)
          const respOk = activeResps.size === 0      || activeResps.has(alarm.responsibility)
          return sevOk && respOk
        })
        .map(a => a.id)
    )

    // Second pass: if a root-cause alarm matches, bring all its children along
    const finalIds = new Set(directMatch)
    sorted.forEach(alarm => {
      if (isRoot(alarm.id) && directMatch.has(alarm.id)) {
        ROOT_TO_GROUP[alarm.id].childIds.forEach(cid => finalIds.add(cid))
      }
    })

    return sorted.filter(a => finalIds.has(a.id))
  })()

  const toggleSeverity = (id) => {
    if (id === 'all') {
      // "all" clears everything → show all
      setActiveSeverities(new Set())
      setActiveResps(new Set())
      return
    }
    setActiveSeverities(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleResp = (id) => {
    setActiveResps(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── acknowledge handler ─────────────────────────────
  const acknowledgeAlarms = async (ids) => {
    try {
      await fetch('/api/alarms/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [...ids],
          person: 'Captain - Mikael Strand',
          responsibility: 'Bridge',
        }),
      })
      setSelectedAlarms(new Set())
    } catch (e) {
      console.error('Acknowledge failed', e)
    }
  }

  // ── scroll helpers ────────────────────────────────
  const scrollTop    = () => window.scrollTo({ top: 0,                        behavior: 'smooth' })
  const scrollBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })

  // ── AI demo trigger ──────────────────────────────
  const simulateAnomaly = async () => {
    // Cancel any pending collapse timer from a previous episode
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
    // Clear only the AI episode state — do NOT restore the 50 alarms
    await fetch('/api/ai/clear-episode', { method: 'POST' }).catch(() => {})
    if (registeredAIRootRef.current) {
      // Collapse the group before unregistering so it starts fresh next run
      setExpandedGroups(prev => {
        const next = new Set(prev)
        next.delete(registeredAIRootRef.current)
        return next
      })
      unregisterAIGroup(registeredAIRootRef.current)
      registeredAIRootRef.current = null
    }
    setAiState({ status: 'idle', alarms: [], groupResult: null, thinkingText: '', suggestingDone: 0, totalSuggestions: 0, currentSuggestionTitle: '' })
    setAiGroup(null)
    setAlarms(prev => prev.filter(a => !a._isAIAlarm))  // remove previous AI alarms from list
    // Then inject anomaly
    fetch('/api/ai/simulate-anomaly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ temp: 97 }) }).catch(() => {})
  }

  // ── Reset to original 50 alarms ──────────────────────────
  const handleReset = async () => {
    if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null }
    await fetch('/api/ai/reset', { method: 'POST' }).catch(() => {})
    // FULL_RESET WS message will update state; nothing more needed here
  }

  // ── Clear all alarms ─────────────────────────────────────
  const handleClearAll = async () => {
    await fetch('/api/alarms/clear-all', { method: 'POST' }).catch(() => {})
    // CLEAR_ALL WS message will update state
  }

  // ── stats for header (based on VISIBLE alarms — respects group collapse) ──
  const SEVERITIES = ['red', 'yellow', 'blue', 'magenta', 'green']
  const visibleAlarms = getVisibleAlarms(filteredAlarms, expandedGroups, aiGroup)
  const stats = {
    total:    visibleAlarms.length,
    active:   visibleAlarms.filter(a => a.state === 'active').length,
    inactive: visibleAlarms.filter(a => a.state === 'inactive').length,
    activeBySeverity:   Object.fromEntries(SEVERITIES.map(s => [s, visibleAlarms.filter(a => a.state === 'active'   && a.severity === s).length])),
    inactiveBySeverity: Object.fromEntries(SEVERITIES.map(s => [s, visibleAlarms.filter(a => a.state === 'inactive' && a.severity === s).length])),
    bridge: visibleAlarms.filter(a => a.responsibility === 'Bridge').length,
    ecr:    visibleAlarms.filter(a => a.responsibility === 'ECR').length,
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {page === 'database' && (
        <AlarmDatabase onBack={() => setPage('list')} sessionLogs={sessionLogs} voiceNotesByAlarm={voiceNotesByAlarm} />
      )}
      {page === 'list' && (
        <>
          <Header stats={stats} activeSeverities={activeSeverities} activeResps={activeResps} onOpenDatabase={() => setPage('database')} onSimulateAnomaly={simulateAnomaly} onReset={handleReset} onClearAll={handleClearAll} />
          {/* pb-16 leaves space above the fixed bottom bar */}
          <div className="px-4 pt-1 pb-16">
        <AlarmList
          alarms={filteredAlarms}
          selectedAlarms={selectedAlarms}
          setSelectedAlarms={setSelectedAlarms}
          onRowClick={(alarm) => setSelectedAlarmId(prev => prev === alarm.id ? null : alarm.id)}
          selectedAlarmId={selectedAlarmId}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onAcknowledge={acknowledgeAlarms}
          aiGroup={aiGroup}
        />
      </div>
      {selectedAlarmId && (() => {
        const panelAlarm = alarms.find(a => a.id === selectedAlarmId)
        return panelAlarm ? (
          <AlarmDetailPanel
            alarm={panelAlarm}
            onClose={() => setSelectedAlarmId(null)}
            allAlarms={alarms}
            sessionLog={sessionLogs[panelAlarm.id] ?? []}
            onSessionLogUpdate={(log) => setSessionLogs(prev => ({ ...prev, [panelAlarm.id]: log }))}
          />
        ) : null
      })()}
      <BottomBar
        activeSeverities={activeSeverities}
        activeResps={activeResps}
        onToggleSeverity={toggleSeverity}
        onToggleResp={toggleResp}
        onScrollTop={scrollTop}
        onScrollBottom={scrollBottom}
      />
      <AIAlarmBanner
        status={aiState.status}
        alarmCount={aiState.alarms.length}
        totalAlarms={4}
        groupResult={aiState.groupResult}
        thinkingText={aiState.thinkingText}
        suggestingDone={aiState.suggestingDone ?? 0}
        totalSuggestions={aiState.totalSuggestions ?? 0}
        currentSuggestionTitle={aiState.currentSuggestionTitle ?? ''}
      />
        </>
      )}
    </div>
  )
}

export default App
