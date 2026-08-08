/* ═══════════════════════════════════════════════════════════
   EnergySim — the whole energy plant, running in the browser.

   This is the client-side equivalent of python/energy_server.py:
   it owns a BatterySystem plus per-engine capacity state, and turns
   4 lever positions into the exact dashboard payload the store expects.

   Because it produces the same shape as POST /api/lever, the store can
   swap between this and the Python server without any other code
   knowing which one is talking.
   ═══════════════════════════════════════════════════════════ */
import { BatterySystem } from './battery.js';
import { enginesNeeded, buildEngines } from './engines.js';
import { calcFuelRate } from './fuel.js';
import { VESSEL } from './vessel.js';

const INITIAL_CAPACITIES = [0.9, 0.9, 1.0, 1.0];   // ME1…ME4 health fractions
const CAPACITY_DECAY_PER_TICK = 0.0001;            // running engines wear down

export class EnergySim {
  constructor(initialSoc = 0.8) {
    this.battery    = new BatterySystem(initialSoc);
    this.capacities = [...INITIAL_CAPACITIES];
  }

  /**
   * Advance the plant by one tick.
   *
   * @param {{cpp_port:number, cpp_stbd:number, thr_ps:number, thr_sb:number}} levers
   * @param {string} mode
   * @param {number} hotelKw
   * @param {number} dtSeconds
   * @returns dashboard payload — same shape as the Python /api/lever response
   */
  tick(levers, mode = 'SMART_NAV', hotelKw = 5000, dtSeconds = 1) {
    // Charging needs at least one healthy shaft generator.
    const allowCharging = this.capacities[0] >= 0.1 && this.capacities[1] >= 0.1;

    const result = this.battery.step(levers, {
      mode,
      dtSeconds,
      hotelKw,
      engineAvailableKw: VESSEL.totalKw,
      allowCharging,
    });

    const nEngines = enginesNeeded(result.engine_kw, mode);

    // Wear down the engines that are actually running.
    for (let i = 0; i < nEngines; i++) {
      this.capacities[i] = Math.max(0, this.capacities[i] - CAPACITY_DECAY_PER_TICK);
    }

    const engines  = buildEngines(result.engine_kw, nEngines, this.capacities);
    const fuelRate = nEngines > 0 ? calcFuelRate(result.engine_kw, nEngines) : 0;

    return {
      battery: {
        soc_pct:         result.soc_pct,
        battery_kw:      result.battery_kw,
        battery_mode:    result.battery_mode,
        energy_kwh:      result.energy_kwh,
        remaining_hours: result.remaining_hours,
      },
      engines,
      levers: {
        cpp_port_kw: result.lever_1_cpp_port_kw,
        cpp_stbd_kw: result.lever_2_cpp_stbd_kw,
        thr_ps_kw:   result.lever_3_thr_ps_kw,
        thr_sb_kw:   result.lever_4_thr_sb_kw,
      },
      totals: {
        propulsion_kw:   result.total_propulsion_kw,
        hotel_kw:        result.hotel_kw,
        total_demand_kw: result.total_demand_kw,
        engine_kw:       result.engine_kw,
        solar_kw:        result.solar_kw,
      },
      mode:          result.mode,
      fuel_rate_kgh: Number(fuelRate.toFixed(1)),
      n_engines:     nEngines,
    };
  }

  reset(soc = 0.8) {
    this.battery.reset(soc);
    this.capacities = [...INITIAL_CAPACITIES];
  }
}

export { VESSEL } from './vessel.js';
export { calcFuelRate, fuelKghToLph, currentEfficiency } from './fuel.js';
