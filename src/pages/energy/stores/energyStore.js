
import { create } from 'zustand'
import { subscribe } from '../../../shared/hooks/useHardwareSocket'
import { useStore as useShipStore } from '../../nav/stores/useShipStore'

const API_URL = 'http://localhost:5001'

// ── Module-level physics (survives React unmount) ─────────────────────────────
const _p = {
  rpm:         0,
  batteryLevel: 100,
  leverPos:    0,        // primary lever from hardware BCU (registers[0])
  registers:   null,     // all 4 BCU register values
  manualPos:   null,     // non-null when LeverPopup is in manual mode
  connected:   false,    // hardware WebSocket connected
}

// ── RPM physics (Synced from useShipStore) ───────────────────────────────────
useShipStore.subscribe((state) => {
  const avgRpm = (Math.abs(state.ship.rpmPort) + Math.abs(state.ship.rpmStbd)) / 2;
  _p.rpm = avgRpm;
  useEnergyStore.setState({
    rpm:   avgRpm,
    alarm: state.ship.rpmAlarm,
  });
});

// ── Python API call (non-blocking) ────────────────────────────────────────────
async function callLeverAPI(levers, mode, hotelKw = 5000) {
  try {
    const res = await fetch(`${API_URL}/api/lever`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cpp_port:   levers.cpp_port,
        cpp_stbd:   levers.cpp_stbd,
        thr_ps:     levers.thr_ps,
        thr_sb:     levers.thr_sb,
        mode,
        hotel_kw:   hotelKw,
        dt_seconds: 1,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    // Map API response → store state
    useEnergyStore.setState(state => {
      const newKwHistory = [...state.batteryKwHistory, data.battery.battery_kw];
      if (newKwHistory.length > 60) newKwHistory.shift(); 
      
      const newLvlHistory = [...(state.batteryLevelHistory || []), data.battery.soc_pct];
      if (newLvlHistory.length > 30) newLvlHistory.shift(); // plot over 30 seconds

      // Map API engines (if any) to our 4-engine structure
      const engineData = state.engineData.map((existing, i) => {
        const live = data.engines[i];
        if (!live) return existing;
        return {
          ...existing,
          ...live,
          load: live.load_pct ?? live.load ?? existing.load,
          capacity: live.capacity ?? existing.capacity,
        };
      });

      return {
        // Battery
        batteryLevel:    data.battery.soc_pct,
        batteryKw:       data.battery.battery_kw,
        batteryMode:     data.battery.battery_mode,
        batteryEnergyKwh: data.battery.energy_kwh,
        batteryRemaining: data.battery.remaining_hours,
        batteryKwHistory: newKwHistory,
        batteryLevelHistory: newLvlHistory,
        // Engines
        engineData:      engineData,
        nEnginesRunning: data.n_engines,
        // Totals
        totalDemandKw:   data.totals.total_demand_kw,
        propulsionKw:    data.totals.propulsion_kw,
        engineKw:        data.totals.engine_kw,
        hotelKw:         data.totals.hotel_kw,
        solarKw:         data.totals.solar_kw,
        // Levers
        leverKw:         data.levers,
        // Meta
        fuelRateKgh:     data.fuel_rate_kgh,
        apiConnected:    true,
      };
    });
  } catch {
    // API unreachable — fall back to simple battery drain from RPM
    const state = useEnergyStore.getState()
    if (state.apiConnected) {
      useEnergyStore.setState({ apiConnected: false })
    }
    if (_p.rpm > 0) {
      const rate = (_p.rpm / 200) * (1 / 5)
      useEnergyStore.setState(s => ({
        batteryLevel: Math.max(0, s.batteryLevel - rate),
      }))
    }
  }
}

// ── API polling tick (every second, aligned with RPM tick) ────────────────────
function apiTick() {
  const state = useEnergyStore.getState()
  const mode  = state.operatingMode

  // Build the 4-lever vector from the best available source
  let levers
  if (_p.connected && _p.registers && _p.registers.length >= 4) {
    // Hardware BCU: use all 4 registers as 4 levers
    levers = {
      cpp_port: _p.registers[0] ?? 0,
      cpp_stbd: _p.registers[1] ?? 0,
      thr_ps:   _p.registers[2] ?? 0,
      thr_sb:   _p.registers[3] ?? 0,
    }
  } else if (state.useSimLevers) {
    // Sim popup levers
    levers = state.simLevers
  } else {
    // Single-lever manual / hardware fallback: mirror to both CPP shafts
    const pos = Math.max(0, _p.manualPos !== null ? _p.manualPos : _p.leverPos)
    levers = { cpp_port: pos, cpp_stbd: pos, thr_ps: 0, thr_sb: 0 }
  }

  callLeverAPI(levers, mode)
}

// ── BCU hardware subscription ─────────────────────────────────────────────────
subscribe('BCU_DATA', ({ registers }) => {
  if (Array.isArray(registers) && registers.length > 0) {
    _p.registers = registers
    _p.leverPos  = registers[0] ?? 0
    _p.connected = true
  }
})

// ── Start loops ───────────────────────────────────────────────────────────────
setInterval(apiTick, 1000)

// ── Zustand store ─────────────────────────────────────────────────────────────
const initialState = {
  // Visual / RPM
  rpm:          0,
  alarm:        false,

  // Battery (populated by API, fallback by simple simulation)
  batteryLevel:     100,    // SOC % (0–100)
  batteryKw:        0,      // + discharge, − charge
  batteryMode:      'IDLE', // CHARGING | DISCHARGING | IDLE
  batteryEnergyKwh: 5000,
  batteryRemaining: 99,
  batteryKwHistory: [],
  batteryLevelHistory: [],

  // Engines (array of 4, as requested by user)
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

  // Sim lever state (LeverSimPopup)
  simLevers: { cpp_port: 0, cpp_stbd: 0, thr_ps: 0, thr_sb: 0 },
  useSimLevers:   false,    // true when sim popup is active & hardware not connected
  operatingMode:  'SMART_NAV',  // SMART_NAV | HYBRID | ECO_MODE | FULL_SPEED
  modeStartTime:  Date.now(),

  // API connection
  apiConnected: false,
};

export const useEnergyStore = create((set) => ({
  ...initialState,
  reset: () => {
    set(initialState);
    useShipStore.getState().resetVoyage();
  }
}));

// ── Exported setters ──────────────────────────────────────────────────────────

/** Called by LeverPopup (manual mode). Pass null to release. */
export function setManualLever(pos) {
  _p.manualPos = pos
}

/** Called by LeverSimPopup to update one sim lever. */
export function setSimLever(key, value) {
  useEnergyStore.setState(s => ({
    simLevers: { ...s.simLevers, [key]: value },
  }))
}

/** Called by LeverSimPopup to set the operating mode. */
export function setOperatingMode(mode) {
  useEnergyStore.setState((state) => ({
    operatingMode: mode,
    modeStartTime: Date.now(),
  }));
}

/** Activate / deactivate the sim lever as data source. */
export function setUseSimLevers(enabled) {
  useEnergyStore.setState({ useSimLevers: enabled })
  _p.connected = enabled ? false : _p.connected  // sim overrides hardware display
}

export const resetAll = () => {
  // 1. Reset Zustand store + ship voyage
  useEnergyStore.getState().reset();

  // 2. Reset module-level physics so next apiTick sends zero levers
  _p.leverPos  = 0;
  _p.manualPos = null;
  _p.registers = null;
  _p.rpm       = 0;
  _p.batteryLevel = 100;

  // 3. Tell the Python server to reset its own simulation state
  //    (battery SOC → 80%, engine capacities → nominal)
  fetch(`${API_URL}/api/reset`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ soc: 0.80 }),
  }).catch(() => {/* server offline — ignore */});
};
