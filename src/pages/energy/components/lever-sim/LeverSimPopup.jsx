/**
 * LeverSimPopup — floating 4-lever simulator
 *
 * Provides virtual CPP and bow-thruster levers that feed real energy
 * calculations (via energy_server.py) when no BCU hardware is connected.
 *
 * Hardware takes priority automatically when BCU data arrives.
 */
import { useRef, useCallback } from 'react'
import {
  useEnergyStore,
  setSimLever,
  setOperatingMode,
  setUseSimLevers,
} from '../../stores/energyStore'
import './LeverSimPopup.css'

const MODES = [
  { id: 'SMART_NAV',     label: 'SMART NAV',  short: 'SMART' },
  { id: 'HYBRID',        label: 'HYBRID',     short: 'HYB' },
  { id: 'ECO_MODE',      label: 'ECO MODE',   short: 'ECO' },
  { id: 'FULL_SPEED',    label: 'FULL SPD',   short: 'FULL' },
]

const LEVERS = [
  { key: 'cpp_port', label: 'CPP-P' },
  { key: 'cpp_stbd', label: 'CPP-S' },
  { key: 'thr_ps',   label: 'THR-P' },
  { key: 'thr_sb',   label: 'THR-S' },
]

// ── Vertical drag slider ───────────────────────────────────────────────────────
function VSlider({ label, value, onChange, min = 0, max = 100 }) {
  const trackRef  = useRef(null)
  const dragging  = useRef(false)
  const TRACK_H   = 90   // px, visual track height

  const pxToVal = (py, rect) => {
    const rel = py - rect.top
    const pct = 1 - (rel / TRACK_H)
    const val = min + pct * (max - min)
    return Math.round(Math.max(min, Math.min(max, val)))
  }

  const update = useCallback((e) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    onChange(pxToVal(e.clientY, rect))
  }, [onChange, min, max])

  const onDown = (e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    update(e)
  }
  const onMove  = (e) => { if (dragging.current) update(e) }
  const onUp    = ()  => { dragging.current = false }

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const fillH   = `${pct}%`
  const thumbB  = `${pct}%`

  return (
    <div className="vsld-col">
      <span className="vsld-label">{label}</span>
      <div
        ref={trackRef}
        className="vsld-track"
        style={{ height: TRACK_H }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Fill bar */}
        <div className="vsld-fill" style={{ height: fillH }} />
        {/* Thumb */}
        <div className="vsld-thumb" style={{ bottom: thumbB }} />
        {/* Centre tick */}
        <div className="vsld-tick" />
      </div>
      <span className="vsld-value">{value}%</span>
    </div>
  )
}

// ── Main popup ────────────────────────────────────────────────────────────────
export default function LeverSimPopup({ onClose }) {
  const {
    simLevers,
    operatingMode,
    useSimLevers,
    apiConnected,
    engineData,
    batteryLevel,
    batteryMode,
    batteryKw,
    totalDemandKw,
    fuelRateKgh,
  } = useEnergyStore()

  const handleLeverChange = useCallback((key, val) => {
    setSimLever(key, val)
  }, [])

  const handleModeChange = (modeId) => {
    setOperatingMode(modeId)
  }

  const handleToggleSim = () => {
    setUseSimLevers(!useSimLevers)
  }

  const nRunning = engineData.filter(e => e.status === 'run').length

  return (
    <div className="lsim-popup">
      {/* ── Header ── */}
      <div className="lsim-header">
        <div className="lsim-title-row">
          <span className="lsim-title">Lever Simulation</span>
          <button className="lsim-close" onClick={onClose}>✕</button>
        </div>

        {/* Active/status badge */}
        <div className="lsim-status-row">
          <span
            className={`lsim-dot ${useSimLevers ? 'active' : 'inactive'}`}
          />
          <span className="lsim-status-text">
            {useSimLevers ? 'SIM ACTIVE — overriding lever input' : 'SIM STANDBY'}
          </span>
        </div>

        {/* API connection */}
        <div className="lsim-status-row" style={{ marginTop: 2 }}>
          <span className={`lsim-dot ${apiConnected ? 'api-ok' : 'api-err'}`} />
          <span className="lsim-status-text">
            {apiConnected ? 'energy_server.py connected' : 'energy_server.py offline — using fallback'}
          </span>
        </div>
      </div>

      {/* ── Mode selector ── */}
      <div className="lsim-modes">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`lsim-mode-btn ${operatingMode === m.id ? 'selected' : ''}`}
            onClick={() => handleModeChange(m.id)}
          >
            {m.short}
          </button>
        ))}
      </div>
      <div className="lsim-mode-label">{operatingMode.replace('_', ' ')}</div>

      {/* ── 4 vertical levers ── */}
      <div className="lsim-levers">
        {LEVERS.map((l) => {
          const isCPP = l.key.startsWith('cpp');
          return (
            <VSlider
              key={l.key}
              label={l.label}
              value={simLevers[l.key]}
              onChange={(v) => handleLeverChange(l.key, v)}
              min={isCPP ? -100 : 0}
              max={100}
            />
          );
        })}
      </div>

      {/* ── Live stats ── */}
      <div className="lsim-stats">
        <div className="lsim-stat">
          <span className="lsim-stat-label">Demand</span>
          <span className="lsim-stat-val">{totalDemandKw.toLocaleString()} kW</span>
        </div>
        <div className="lsim-stat">
          <span className="lsim-stat-label">Engines</span>
          <span className="lsim-stat-val">{nRunning} / 4</span>
        </div>
        <div className="lsim-stat">
          <span className="lsim-stat-label">Battery</span>
          <span className={`lsim-stat-val batt-${batteryMode.toLowerCase()}`}>
            {Math.round(batteryLevel)}% {batteryKw > 10 ? '▼' : batteryKw < -10 ? '▲' : '—'}
          </span>
        </div>
        <div className="lsim-stat">
          <span className="lsim-stat-label">Fuel</span>
          <span className="lsim-stat-val">{fuelRateKgh} kg/h</span>
        </div>
      </div>

      {/* ── Activate toggle ── */}
      <button
        className={`lsim-activate-btn ${useSimLevers ? 'active' : ''}`}
        onClick={handleToggleSim}
      >
        {useSimLevers ? '■ Deactivate Simulation' : '▶ Activate Simulation'}
      </button>
    </div>
  )
}
