import { useState, useEffect } from 'react'
import AlarmDatabaseDetail from './AlarmDatabaseDetail'
import WartsilaLogo from '@imgs/wartsila_logo.svg'
import BridgeGreyIcon from '@imgs/Bridge-grey.svg'
import ECRGreyIcon    from '@imgs/ECR-grey.svg'

import RedActive     from '@imgs/red-active.svg'
import MagentaActive from '@imgs/magenta-active.svg'
import YellowActive  from '@imgs/yellow-active.svg'
import GreenActive   from '@imgs/green-active.svg'
import BlueActive    from '@imgs/blue-active.svg'

// Bottom bar filter icons — same as BottomBar.jsx
import AllOff      from '@filters/all-filter-off.svg'
import AllOn       from '@filters/all-filter-on.svg'
import RedOff      from '@filters/Red-filter-0ff.svg'
import RedOn       from '@filters/red-filter-on.svg'
import MagentaOff  from '@filters/magenta-filter-off.svg'
import MagentaOn   from '@filters/meganta-filter-on.svg'
import YellowOff   from '@filters/yellow-filter-off.svg'
import YellowOn    from '@filters/yellow-filter-on.svg'
import GreenOff    from '@filters/green-filter-off.svg'
import GreenOn     from '@filters/green-filter-on.svg'
import BlueOff     from '@filters/blue-filter-off.svg'
import BlueOn      from '@filters/blue-filter-on.svg'
import ECROff      from '@filters/ECR-filter-off.svg'
import ECROn       from '@filters/ECR-filter-on.svg'
import BridgeOff   from '@filters/bridge-filter-off.svg'
import BridgeOn    from '@filters/bridge-filter-on.svg'

const SEV_ACTIVE = { red: RedActive, magenta: MagentaActive, yellow: YellowActive, green: GreenActive, blue: BlueActive }

const SEV_BTNS = [
  { id: 'red',     off: RedOff,     on: RedOn     },
  { id: 'yellow',  off: YellowOff,  on: YellowOn  },
  { id: 'blue',    off: BlueOff,    on: BlueOn    },
  { id: 'magenta', off: MagentaOff, on: MagentaOn },
  { id: 'green',   off: GreenOff,   on: GreenOn   },
]
const RESP_BTNS = [
  { id: 'ECR',    off: ECROff,    on: ECROn    },
  { id: 'Bridge', off: BridgeOff, on: BridgeOn },
]

const COL_HEADERS = [
  { key: 'description',    label: 'Description' },
  { key: 'severity',       label: 'Severity' },
  { key: 'type',           label: 'Type' },
  { key: 'responsibility', label: 'Responsibility' },
  { key: 'occurrences',    label: 'Occurrences in Last 30 Days' },
  { key: 'avgResolveTime', label: 'Average Resolve Time' },
]

export default function AlarmDatabase({ onBack, sessionLogs = {}, voiceNotesByAlarm = {} }) {
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [sevFilter, setSevFilter]   = useState(new Set())   // empty = all
  const [respFilter, setRespFilter] = useState(new Set()) // empty = all
  const [search, setSearch]         = useState('')
  const [detailAlarm, setDetailAlarm] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/alarms/database')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(data => { setRows(data); setLoading(false) })
      .catch(e => { setError('Failed to load: ' + e.message); setLoading(false) })
  }, [])

  function toggleSev(s) {
    if (s === 'all') { setSevFilter(new Set()); setRespFilter(new Set()); return }
    setSevFilter(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }
  function toggleResp(r) {
    setRespFilter(prev => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })
  }

  const q = search.trim().toLowerCase()
  const filtered = rows.filter(r => {
    const sevOk  = sevFilter.size  === 0 || sevFilter.has(r.severity)
    const respOk = respFilter.size === 0 || respFilter.has(r.responsibility)
    const searchOk = q === '' || r.description.toLowerCase().includes(q)
    return sevOk && respOk && searchOk
  })

  const sorted = filtered.slice().sort((a, b) =>
    (a.description ?? '').localeCompare(b.description ?? '')
  )

  const allActive = sevFilter.size === 0 && respFilter.size === 0

  if (detailAlarm) {
    return (
      <AlarmDatabaseDetail
        alarm={detailAlarm}
        sessionLogs={sessionLogs}
        voiceNotesByAlarm={voiceNotesByAlarm}
        onBack={() => setDetailAlarm(null)}
        onNavigate={(id) => {
          const found = rows.find(r => r.id === id)
          if (found) setDetailAlarm(found)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex flex-col">

      {/* ── Header ───────────────────────────────────────────── */}
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
        <div className="flex items-center flex-1 bg-[#3B3D3F] -ml-7 pl-10 pr-5 gap-4">
          {/* Search box */}
          <div className="flex items-center flex-1 max-w-md relative">
            <svg className="absolute left-2 w-4 h-4 text-[#999] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description…"
              className="w-full pl-7 pr-7 py-1 rounded text-sm outline-none"
              style={{ background: '#5A5C5E', color: '#FFFFFF', caretColor: '#FFFFFF' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 text-[#AAA] hover:text-white text-base leading-none"
              >×</button>
            )}
          </div>
          <span className="flex-1" />
          <button
            onClick={onBack}
            className="text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
            style={{ background: '#5A5C5E', color: '#E0E0E0' }}
          >
            Alarm List
          </button>
        </div>
      </header>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto pb-16">
        {loading && (
          <div className="flex items-center justify-center h-48 text-[#888] text-sm gap-3">
            <svg className="animate-spin w-5 h-5 text-[#3B3D3F]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Loading alarm database…
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error}</div>
        )}
        {!loading && !error && (
        <div className="bg-[#F2F2F2] rounded-lg overflow-hidden shadow-sm mx-4 mt-3">
        <table className="w-full text-xs" style={{ minWidth: 700 }}>
          <thead className="border-b border-[#C8CDD1] sticky top-0 z-10" style={{ background: '#F2F2F2' }}>
            <tr>
              {COL_HEADERS.map(({ key, label }) => (
                <th
                  key={key}
                  className="text-left text-sm text-gray-600 font-semibold px-4 py-3 whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const icon = SEV_ACTIVE[row.severity]
              return (
                <tr
                  key={row.id}
                  className="border-b border-gray-200 hover:brightness-95 transition-colors cursor-pointer"
                  onClick={() => setDetailAlarm(row)}
                  style={{ background: '#F2F2F2', color: '#111111' }}
                >
                  {/* Description */}
                  <td className="px-4 py-3">{row.description}</td>

                  {/* Severity */}
                  <td className="px-4 py-3">
                    {icon && <img src={icon} alt={row.severity} className="w-5 h-5" />}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">{row.type}</td>

                  {/* Responsibility */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <img
                        src={row.responsibility === 'ECR' ? ECRGreyIcon : BridgeGreyIcon}
                        alt={row.responsibility}
                        className="w-3.5 h-3.5"
                      />
                      {row.responsibility}
                    </span>
                  </td>

                  {/* Occurrences */}
                  <td className="px-4 py-3 tabular-nums">{row.occurrences}</td>

                  {/* Avg Resolve */}
                  <td className="px-4 py-3 tabular-nums">{row.avgResolveTime}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        )}
      </div>

      {/* ── Bottom filter bar — same as BottomBar.jsx ──────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-6"
        style={{ background: '#3B3D3F', height: '48px' }}
      >
        <div className="relative flex items-center w-full h-full">
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center">

            {/* ALL */}
            <button
              className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80"
              onClick={() => toggleSev('all')}
            >
              <img src={allActive ? AllOn : AllOff} alt="all" className="w-7 h-7" />
            </button>

            <div className="w-3" />

            {/* 5 severity colors */}
            {SEV_BTNS.map(({ id, off, on }) => (
              <button
                key={id}
                className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80"
                onClick={() => toggleSev(id)}
              >
                <img src={sevFilter.has(id) ? on : off} alt={id} className="w-7 h-7" />
              </button>
            ))}

            <div className="w-3" />

            {/* ECR / Bridge */}
            {RESP_BTNS.map(({ id, off, on }) => (
              <button
                key={id}
                className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80"
                onClick={() => toggleResp(id)}
              >
                <img src={respFilter.has(id) ? on : off} alt={id} className="w-7 h-7" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
