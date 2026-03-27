/**
 * energyStore — persistent RPM + battery simulation.
 *
 * Runs as a module-level loop (independent of React mount/unmount),
 * so values continue updating when switching between pages.
 *
 * Data sources (in priority order):
 *   1. Manual override — UI lever in manual mode
 *   2. Hardware BCU data — real-time lever from main2.py
 */
import { create } from 'zustand'
import { subscribe } from '../../../shared/hooks/useHardwareSocket'

// ── Module-level physics (survives React unmount) ────────────────────────────
const _p = {
  rpm:          0,
  batteryLevel: 100,
  leverPos:     0,     // from hardware BCU
  manualPos:    null,  // non-null when UI is in manual mode
}

function tick() {
  const lever = _p.manualPos !== null ? _p.manualPos : _p.leverPos

  // RPM acceleration physics (same model as original App.jsx)
  let acceleration
  if (lever >= 0) {
    acceleration = _p.rpm < 200
      ? (lever / 100) * 10
      : (lever / 100) * (200 / 60)
  } else {
    acceleration = (lever / 100) * (_p.rpm / 2)
  }
  _p.rpm = Math.max(0, Math.min(500, _p.rpm + acceleration))

  // Battery consumption
  if (_p.rpm > 0) {
    const rate = (_p.rpm / 200) * (1 / 5)   // % per second
    _p.batteryLevel = Math.max(0, _p.batteryLevel - rate)
  }

  useEnergyStore.setState({
    rpm:          _p.rpm,
    batteryLevel: _p.batteryLevel,
    alarm:        _p.rpm > 400,
  })
}

// Subscribe to BCU hardware data
subscribe('BCU_DATA', ({ registers }) => {
  if (Array.isArray(registers) && registers.length > 0) {
    _p.leverPos = registers[0]
  }
})

// Start the 1-second loop immediately on module load
setInterval(tick, 1000)

// ── Zustand store (React-readable snapshot) ─────────────────────────────────
export const useEnergyStore = create(() => ({
  rpm:          0,
  batteryLevel: 100,
  alarm:        false,
}))

/** Call this when the UI lever is in manual mode. Pass null to release. */
export function setManualLever(pos) {
  _p.manualPos = pos
}
