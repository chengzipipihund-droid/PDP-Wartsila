/* ═══════════════════════════════════════════════════════════
   energyStore — single source of truth for the energy plant.

   ── Data sources, in priority order ──
   1. Python energy server (localhost:5001) — used only when a one-time
      health probe succeeds. This is the hardware-demo path.
   2. Local EnergySim (src/pages/energy/sim) — the default. Runs the same
      physics in the browser, so the dashboard is fully live with no
      backend attached (e.g. the Vercel deployment).

   Both produce the identical payload shape, so nothing downstream knows
   or cares which one is driving.

   ── Lever input, in priority order ──
   1. Hardware BCU registers (4 levers) when the WebSocket is connected
   2. Sim levers, when explicitly enabled
   3. Manual lever from LeverPopup, else the hardware lever position
   ═══════════════════════════════════════════════════════════ */
import { create } from 'zustand'
import { subscribe } from '../../../shared/hooks/useHardwareSocket'
import { useStore as useShipStore } from '../../nav/stores/useShipStore'
import { EnergySim } from '../sim/index.js'

const API_URL   = 'http://localhost:5001'
const TICK_MS   = 1000
const PROBE_MS  = 30000   // how often to re-probe for the Python backend

// ── Module-level state (survives React unmount) ───────────────────────────────
const _p = {
  rpm:       0,
  leverPos:  0,      // primary lever from hardware BCU (registers[0])
  registers: null,   // all 4 BCU register values
  manualPos: null,   // non-null when LeverPopup is in manual mode
  connected: false,  // hardware WebSocket connected
}

// The browser-side plant. Always present; the Python server overrides it when up.
const sim = new EnergySim(0.80)

// ── RPM physics (synced from useShipStore) ───────────────────────────────────
useShipStore.subscribe((state) => {
  const avgRpm = (Math.abs(state.ship.rpmPort) + Math.abs(state.ship.rpmStbd)) / 2
  _p.rpm = avgRpm
  useEnergyStore.setState({ rpm: avgRpm, alarm: state.ship.rpmAlarm })
})

// ── BCU hardware subscription ─────────────────────────────────────────────────
subscribe('BCU_DATA', ({ registers }) => {
  if (Array.isArray(registers) && registers.length > 0) {
    _p.registers = registers
    _p.leverPos  = registers[0] ?? 0
    _p.connected = true
  }
})

// ── Build the 4-lever vector from the best available source ───────────────────
function currentLevers(state) {
  if (_p.connected && _p.registers && _p.registers.length >= 4) {
    return {
      cpp_port: _p.registers[0] ?? 0,
      cpp_stbd: _p.registers[1] ?? 0,
      thr_ps:   _p.registers[2] ?? 0,
      thr_sb:   _p.registers[3] ?? 0,
    }
  }
  if (state.useSimLevers) return state.simLevers

  const pos = Math.max(0, _p.manualPos !== null ? _p.manualPos : _p.leverPos)
  return { cpp_port: pos, cpp_stbd: pos, thr_ps: 0, thr_sb: 0 }
}

// ── Map a dashboard payload (from either source) into store state ─────────────
function applyDashboard(data) {
  useEnergyStore.setState(state => {
    const kwHistory = [...state.batteryKwHistory, data.battery.battery_kw]
    if (kwHistory.length > 60) kwHistory.shift()

    const lvlHistory = [...(state.batteryLevelHistory || []), data.battery.soc_pct]
    if (lvlHistory.length > 30) lvlHistory.shift()   // plot over 30 seconds

    const engineData = state.engineData.map((existing, i) => {
      const live = data.engines[i]
      if (!live) return existing
      return {
        ...existing,
        ...live,
        load:     live.load_pct ?? live.load ?? existing.load,
        capacity: live.capacity ?? existing.capacity,
      }
    })

    return {
      // Battery
      batteryLevel:        data.battery.soc_pct,
      batteryKw:           data.battery.battery_kw,
      batteryMode:         data.battery.battery_mode,
      batteryEnergyKwh:    data.battery.energy_kwh,
      batteryRemaining:    data.battery.remaining_hours,
      batteryKwHistory:    kwHistory,
      batteryLevelHistory: lvlHistory,
      // Engines
      engineData,
      nEnginesRunning: data.n_engines,
      // Totals
      totalDemandKw: data.totals.total_demand_kw,
      propulsionKw:  data.totals.propulsion_kw,
      engineKw:      data.totals.engine_kw,
      hotelKw:       data.totals.hotel_kw,
      solarKw:       data.totals.solar_kw,
      // Levers
      leverKw: data.levers,
      // Meta
      fuelRateKgh: data.fuel_rate_kgh,
    }
  })
}

// ── Backend probe + tick loop ─────────────────────────────────────────────────
let backendUp    = false
let lastProbeAt  = 0
let tickTimer    = null
let loopRefCount = 0

/**
 * Probe the Python server at most once every PROBE_MS.
 * Never throws — a dead backend simply leaves `backendUp` false.
 */
async function probeBackend() {
  const now = Date.now()
  if (now - lastProbeAt < PROBE_MS) return
  lastProbeAt = now
  try {
    const ctrl    = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 1500)
    const res     = await fetch(`${API_URL}/api/health`, { signal: ctrl.signal })
    clearTimeout(timeout)
    backendUp = res.ok
  } catch {
    backendUp = false
  }
  if (useEnergyStore.getState().apiConnected !== backendUp) {
    useEnergyStore.setState({ apiConnected: backendUp })
  }
}

async function tick() {
  const state  = useEnergyStore.getState()
  const levers = currentLevers(state)
  const mode   = state.operatingMode
  const hotel  = state.hotelKw ?? 5000

  if (!backendUp) {
    // ── Default path: run the physics locally ──
    applyDashboard(sim.tick(levers, mode, hotel, TICK_MS / 1000))
    probeBackend()   // fire-and-forget; picks the backend up if it appears
    return
  }

  // ── Hardware-demo path: let the Python server own the physics ──
  try {
    const res = await fetch(`${API_URL}/api/lever`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...levers, mode, hotel_kw: hotel, dt_seconds: TICK_MS / 1000 }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    applyDashboard(await res.json())
  } catch {
    // Backend died mid-run — fall back to the local sim without dropping a frame.
    backendUp = false
    useEnergyStore.setState({ apiConnected: false })
    applyDashboard(sim.tick(levers, mode, hotel, TICK_MS / 1000))
  }
}

/**
 * Start the energy tick loop. Ref-counted, so the energy page and the nav
 * page can both hold it open. Returns a stop function.
 *
 * This replaces the old module-scope setInterval, which kept firing a failed
 * request every second forever on any deployment without the Python server.
 */
export function startEnergyLoop() {
  loopRefCount++
  if (tickTimer === null) {
    lastProbeAt = 0
    probeBackend()
    tickTimer = setInterval(tick, TICK_MS)
  }
  let released = false
  return () => {
    if (released) return
    released = true
    loopRefCount = Math.max(0, loopRefCount - 1)
    if (loopRefCount === 0 && tickTimer !== null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }
}

// ── Zustand store ─────────────────────────────────────────────────────────────
const initialState = {
  // Visual / RPM
  rpm:   0,
  alarm: false,

  // Battery
  batteryLevel:        80,       // SOC % (0–100) — matches the sim's initial SOC
  batteryKw:           0,        // + discharge, − charge
  batteryMode:         'IDLE',   // CHARGING | DISCHARGING | IDLE
  batteryEnergyKwh:    5000,
  batteryRemaining:    99,
  batteryKwHistory:    [],
  batteryLevelHistory: [],

  // Engines
  engineData: [
    { id: 'ME1', model: 'Wärtsilä 46F', status: 'run',  load: 75, capacity: 75, energyFlow: { normal: true,  rapid: false, input: false } },
    { id: 'ME2', model: 'Wärtsilä 46F', status: 'run',  load: 75, capacity: 75, energyFlow: { normal: true,  rapid: false, input: false } },
    { id: 'ME3', model: 'Wärtsilä 46F', status: 'stop', load: 0,  capacity: 90, energyFlow: { normal: false, rapid: false, input: false } },
    { id: 'ME4', model: 'Wärtsilä 46F', status: 'stop', load: 0,  capacity: 90, energyFlow: { normal: false, rapid: false, input: false } },
  ],
  nEnginesRunning: 2,

  // Power totals
  totalDemandKw: 0,
  propulsionKw:  0,
  engineKw:      0,
  solarKw:       0,
  hotelKw:       5000,
  leverKw:       { cpp_port_kw: 0, cpp_stbd_kw: 0, thr_ps_kw: 0, thr_sb_kw: 0 },
  fuelRateKgh:   0,

  // Sim lever state (read by nav/hooks/useSimControl)
  simLevers:     { cpp_port: 0, cpp_stbd: 0, thr_ps: 0, thr_sb: 0 },
  useSimLevers:  false,
  operatingMode: 'SMART_NAV',   // SMART_NAV | HYBRID | ECO_MODE | FULL_SPEED
  modeStartTime: Date.now(),

  // True only while the Python energy server is reachable.
  apiConnected: false,
}

export const useEnergyStore = create((set) => ({
  ...initialState,
  reset: () => {
    set({ ...initialState, modeStartTime: Date.now() })
    useShipStore.getState().resetVoyage()
  },
}))

// ── Exported setters ──────────────────────────────────────────────────────────

/** Called by LeverPopup (manual mode). Pass null to release. */
export function setManualLever(pos) {
  _p.manualPos = pos
}

/** Update one sim lever. */
export function setSimLever(key, value) {
  useEnergyStore.setState(s => ({ simLevers: { ...s.simLevers, [key]: value } }))
}

/** Set the operating mode and restart the mode timer. */
export function setOperatingMode(mode) {
  useEnergyStore.setState({ operatingMode: mode, modeStartTime: Date.now() })
}

/** Activate / deactivate the sim levers as the data source. */
export function setUseSimLevers(enabled) {
  useEnergyStore.setState({ useSimLevers: enabled })
  if (enabled) _p.connected = false   // sim overrides hardware display
}

export const resetAll = () => {
  // 1. Reset store + ship voyage
  useEnergyStore.getState().reset()

  // 2. Reset module-level lever state
  _p.leverPos  = 0
  _p.manualPos = null
  _p.registers = null
  _p.rpm       = 0

  // 3. Reset the local plant
  sim.reset(0.80)

  // 4. If the Python server is up, reset its simulation too
  if (backendUp) {
    fetch(`${API_URL}/api/reset`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ soc: 0.80 }),
    }).catch(() => { /* server went away — local reset already applied */ })
  }
}
