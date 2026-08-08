/* ═══════════════════════════════════════════════════════════
   Fuel consumption — SFOC curve + total fuel rate.
   Ported from python/energy_advisor.py (calc_sfoc, calc_fuel_rate).
   ═══════════════════════════════════════════════════════════ */
import { VESSEL, clamp } from './vessel.js';

/** SFOC (g/kWh). U-shaped curve, optimal around 80 % MCR. */
export function calcSfoc(loadPct) {
  const x = clamp(loadPct, 20, 110) / 80;
  return VESSEL.sfoc * (1 + 0.30 * (x - 1) ** 2 + 0.18 * Math.max(0, 0.5 - x) ** 2);
}

/** Total fuel rate (kg/h) for `nEngines` running at a combined `kw`. */
export function calcFuelRate(kw, nEngines) {
  if (kw <= 0 || nEngines <= 0) return 0;
  const n = Math.min(Math.trunc(nEngines), VESSEL.nEngines);
  let per  = kw / n;
  let load = (per / VESSEL.engineKw) * 100;
  // Below 20 % MCR engines are held at their minimum stable load.
  if (load < 20) {
    per  = VESSEL.engineKw * 0.20;
    load = 20;
  }
  return (n * per * calcSfoc(load)) / 1000;
}

/** Diesel volumetric rate (L/h) from a mass rate, at ~0.84 kg/L. */
export const fuelKghToLph = kgh => kgh / 0.84;

/** Specific consumption (g/kWh) actually being achieved right now. */
export function currentEfficiency(fuelRateKgh, engineKw) {
  return engineKw > 10 ? (fuelRateKgh / engineKw) * 1000 : 0;
}
