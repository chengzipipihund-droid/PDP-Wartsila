import { useState, useEffect } from 'react'
import AlarmList from './components/AlarmList'
import Header from './components/Header'
import BottomBar from './components/BottomBar'
import AlarmDetailPanel from './components/AlarmDetailPanel'
import AlarmDatabase from './components/AlarmDatabase'
import { connectWebSocket } from './services/websocket'
import { getVisibleAlarms, isRoot, ROOT_TO_GROUP } from './components/alarmGroups'

function App() {
  const [page, setPage]                        = useState('list') // 'list' | 'database'
  const [alarms, setAlarms] = useState([])
  const [activeSeverities, setActiveSeverities] = useState(new Set())
  const [activeResps, setActiveResps]           = useState(new Set())
  const [selectedAlarms, setSelectedAlarms]     = useState(new Set())
  const [selectedAlarmId, setSelectedAlarmId]   = useState(null)
  const [isConnected, setIsConnected]           = useState(false)
  const [sessionLogs, setSessionLogs]           = useState({}) // keyed by alarmId
  const [voiceNotesByAlarm, setVoiceNotesByAlarm] = useState({}) // keyed by alarmId
  const [expandedGroups, setExpandedGroups]     = useState(new Set())

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
          setAlarms(message.data)
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

  // ── stats for header (based on VISIBLE alarms — respects group collapse) ──
  const SEVERITIES = ['red', 'yellow', 'blue', 'magenta', 'green']
  const visibleAlarms = getVisibleAlarms(filteredAlarms, expandedGroups)
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
          <Header stats={stats} activeSeverities={activeSeverities} activeResps={activeResps} onOpenDatabase={() => setPage('database')} />
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
        </>
      )}
    </div>
  )
}

export default App
