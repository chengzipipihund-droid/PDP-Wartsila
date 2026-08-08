/* ═══════════════════════════════════════════════════════════
   Engine dispatch — how many engines to run, and their per-engine state.
   Ported from python/energy_server.py (engines_needed, engine_energy_flow).
   ═══════════════════════════════════════════════════════════ */
import { VESSEL, OPT_HIGH } from './vessel.js';

/**
 * How many engines to run so each stays inside the optimal SFOC band.
 * Always keeps at least 2 online for redundancy while under way.
 */
export function enginesNeeded(demandKw, mode) {
  if (mode === 'ZERO_EMISSION') return 0;
  if (demandKw <= 0) return 2;
  for (let n = 1; n <= VESSEL.nEngines; n++) {
    if (demandKw / n <= VESSEL.engineKw * OPT_HIGH) return Math.max(2, n);
  }
  return VESSEL.nEngines;
}

/** Map engine load to the arrow style the Energy Index diagram draws. */
export function engineEnergyFlow(loadPct) {
  if (loadPct <= 0)  return { normal: false, rapid: false, input: false };
  if (loadPct > 85)  return { normal: false, rapid: true,  input: false };
  return { normal: true, rapid: false, input: false };
}

/**
 * Build the per-engine array the dashboard renders.
 * `capacities` are 0–1 health fractions that decay as engines run.
 */
export function buildEngines(engineKwTotal, nRunning, capacities) {
  const perEngineKw = nRunning > 0 ? engineKwTotal / nRunning : 0;
  const loadPct     = nRunning > 0 ? (perEngineKw / VESSEL.engineKw) * 100 : 0;

  return Array.from({ length: VESSEL.nEngines }, (_, i) => {
    const running  = i < nRunning;
    const capacity = capacities[i];

    let alarmLevel = 0;
    if      (capacity < 0.15) alarmLevel = 1;
    else if (capacity < 0.30) alarmLevel = 2;

    return {
      id:          `ME${i + 1}`,
      model:       'Wärtsilä 46F',
      kw:          running ? Math.round(perEngineKw) : 0,
      load_pct:    running ? Math.round(loadPct)     : 0,
      load:        running ? Math.round(loadPct)     : 0,
      capacity:    Math.round(capacity * 100),
      alarm_level: alarmLevel,
      status:      running ? 'run' : 'stop',
      energy_flow: engineEnergyFlow(running ? loadPct : 0),
    };
  });
}
