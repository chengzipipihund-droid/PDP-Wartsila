/* ═══════════════════════════════════════════════════════════
   BatterySystem — 5 MWh ESS treated as a single unit.

   Direct port of python/battery_logic.py BatterySystem.
   Call step() once per tick with the 4 lever positions and the
   operating mode; it integrates SOC and returns a full power breakdown.

   Sign convention for batteryKw:
     positive = discharging (battery → grid)
     negative = charging    (grid → battery)
   ═══════════════════════════════════════════════════════════ */
import {
  BATTERY_DEFAULTS,
  PROPULSOR_SPECS,
  MODE_CONFIG,
  SOLAR_KW,
} from './vessel.js';

/**
 * Convert a lever position (−100…+100) to a power demand in kW.
 *   CPP:      P = maxKw × (|lever|/100)²   propeller load ∝ speed²
 *   Thruster: P = maxKw × (|lever|/100)    roughly linear on/off character
 */
export function leverToPower(leverPct, leverId) {
  const spec = PROPULSOR_SPECS[leverId];
  if (!spec) return 0;
  const frac = Math.abs(leverPct ?? 0) / 100;
  return spec.type === 'cpp' ? spec.maxKw * frac ** 2 : spec.maxKw * frac;
}

export class BatterySystem {
  constructor(initialSoc = null, config = {}) {
    const cfg = { ...BATTERY_DEFAULTS, ...config };
    this.capacity = cfg.capacityKwh;
    this.maxChg   = cfg.maxChargeKw;
    this.maxDis   = cfg.maxDischargeKw;
    this.eta      = Math.sqrt(cfg.efficiency);   // one-way efficiency
    this.socMin   = cfg.socMin;
    this.socMax   = cfg.socMax;
    this.soc      = initialSoc ?? cfg.initialSoc;
    this.energyKwh = this.soc * this.capacity;

    this.totalChargedKwh    = 0;
    this.totalDischargedKwh = 0;
  }

  /** Reduce charge rate as SOC approaches max (CC-CV behaviour). */
  _taperCharge(modeMax) {
    const cap = Math.min(modeMax, this.maxChg);
    if (this.soc > 0.85) {
      const taper = (this.socMax - this.soc) / (this.socMax - 0.85);
      return cap * Math.max(0.05, taper);
    }
    return cap;
  }

  /** Reduce discharge rate as SOC approaches min. */
  _taperDischarge(modeMax) {
    const cap = Math.min(modeMax, this.maxDis);
    if (this.soc < 0.25) {
      const taper = (this.soc - this.socMin) / (0.25 - this.socMin);
      return cap * Math.max(0.05, taper);
    }
    return cap;
  }

  /** Charge the battery. Returns the grid-side power actually consumed. */
  _doCharge(powerKw, dtH) {
    if (powerKw <= 0 || dtH <= 0) return 0;
    let stored = powerKw * this.eta * dtH;           // kWh entering the battery
    const room = (this.socMax - this.soc) * this.capacity;
    if (stored > room) {
      stored = room;
      powerKw = stored / (this.eta * dtH);
    }
    this.energyKwh += stored;
    this.soc = this.energyKwh / this.capacity;
    this.totalChargedKwh += stored;
    return powerKw;
  }

  /** Discharge the battery. Returns delivered power (after losses). */
  _doDischarge(powerKw, dtH) {
    if (powerKw <= 0 || dtH <= 0) return 0;
    let drawn = powerKw * dtH;                       // kWh leaving the battery
    const available = (this.soc - this.socMin) * this.capacity;
    if (drawn > available) {
      drawn = Math.max(0, available);
      powerKw = drawn / dtH;
    }
    this.energyKwh -= drawn;
    this.soc = this.energyKwh / this.capacity;
    this.totalDischargedKwh += drawn;
    return powerKw * this.eta;
  }

  /**
   * Run one timestep.
   *
   * @param {{cpp_port:number, cpp_stbd:number, thr_ps:number, thr_sb:number}} levers
   * @param {object} opts
   * @param {string} opts.mode              SMART_NAV | HYBRID | ECO_MODE | FULL_SPEED | …
   * @param {number} opts.dtSeconds         timestep
   * @param {number} opts.hotelKw           hotel + systems electrical demand
   * @param {number} opts.engineAvailableKw total engine power online
   * @param {boolean} opts.allowCharging    false when engine capacity is exhausted
   */
  step(levers, {
    mode = 'SMART_NAV',
    dtSeconds = 1,
    hotelKw = 5000,
    engineAvailableKw = 28800,
    allowCharging = true,
  } = {}) {
    const dtH  = dtSeconds / 3600;
    const mcfg = MODE_CONFIG[mode] ?? MODE_CONFIG.TRANSIT;

    const powers = {
      1: leverToPower(levers.cpp_port, 1),
      2: leverToPower(levers.cpp_stbd, 2),
      3: leverToPower(levers.thr_ps,   3),
      4: leverToPower(levers.thr_sb,   4),
    };

    const cppTotal        = powers[1] + powers[2];
    const thrTotal        = powers[3] + powers[4];
    const propulsionTotal = cppTotal + thrTotal;
    const solarKw         = SOLAR_KW;
    const totalDemand     = Math.max(0, propulsionTotal + hotelKw - solarKw);

    let batteryKw = 0;   // + discharge, − charge
    let engineKw  = 0;

    if (mode === 'ZERO_EMISSION') {
      // Everything from the battery, engines off.
      const rateLimit = this._taperDischarge(mcfg.maxDischargeKw);
      const delivered = this._doDischarge(Math.min(totalDemand, rateLimit), dtH);
      batteryKw = delivered;
      engineKw  = Math.max(0, totalDemand - delivered);   // shortfall, should be 0

    } else if (mode === 'MANOEUVRE') {
      // Engines carry base load; the battery shaves thruster peaks.
      const peakPortion = thrTotal + cppTotal * 0.2;
      const rateLimit   = this._taperDischarge(mcfg.maxDischargeKw);
      const battTarget  = Math.min(peakPortion * mcfg.dischargeFrac, rateLimit);
      const delivered   = this._doDischarge(battTarget, dtH);
      batteryKw = delivered;
      engineKw  = totalDemand - delivered;

    } else if (mode === 'ECO_MODE') {
      // Battery-first: engines only cover what the battery cannot.
      const rateLimit  = this._taperDischarge(mcfg.maxDischargeKw);
      const battTarget = Math.min(totalDemand, rateLimit);
      const delivered  = this._doDischarge(battTarget, dtH);
      batteryKw = delivered;
      engineKw  = Math.max(0, totalDemand - delivered);

    } else if (mode === 'TRANSIT' || mode === 'FULL_SPEED' || mode === 'HYBRID') {
      // Engines power everything; surplus charges the battery.
      engineKw = totalDemand;
      const surplus = engineAvailableKw - totalDemand;
      if (allowCharging && surplus > 500 && this.soc < 0.85) {
        const rateLimit    = this._taperCharge(mcfg.maxChargeKw);
        const chargeTarget = Math.min(surplus * mcfg.chargeFrac, rateLimit);
        const consumed     = this._doCharge(chargeTarget, dtH);
        batteryKw = -consumed;
        engineKw += consumed;          // engines produce extra to charge
      }

    } else {
      // ECO / SMART_NAV — engines cover demand plus a steady 600 kW PTO trickle.
      engineKw = totalDemand;
      if (allowCharging && this.soc < this.socMax) {
        const rateLimit    = this._taperCharge(1500);
        const chargeTarget = Math.min(600, rateLimit);
        const consumed     = this._doCharge(chargeTarget, dtH);
        batteryKw = -consumed;
        engineKw += consumed;
      }
    }

    const batteryMode = batteryKw < -10 ? 'CHARGING'
                      : batteryKw >  10 ? 'DISCHARGING'
                      : 'IDLE';

    return {
      lever_1_cpp_port_kw: Math.round(powers[1]),
      lever_2_cpp_stbd_kw: Math.round(powers[2]),
      lever_3_thr_ps_kw:   Math.round(powers[3]),
      lever_4_thr_sb_kw:   Math.round(powers[4]),

      cpp_total_kw:        Math.round(cppTotal),
      thruster_total_kw:   Math.round(thrTotal),
      total_propulsion_kw: Math.round(propulsionTotal),
      hotel_kw:            Math.round(hotelKw),
      total_demand_kw:     Math.round(totalDemand),
      solar_kw:            Math.round(solarKw),

      battery_kw:   Math.round(batteryKw),
      battery_mode: batteryMode,
      soc:          Number(this.soc.toFixed(4)),
      soc_pct:      Number((this.soc * 100).toFixed(1)),
      energy_kwh:   Number(this.energyKwh.toFixed(1)),
      remaining_hours: batteryKw > 10
        ? Number((((this.soc - this.socMin) * this.capacity) / batteryKw).toFixed(1))
        : 99,

      engine_kw: Math.round(engineKw),
      mode,
    };
  }

  reset(soc = null) {
    this.soc = soc ?? BATTERY_DEFAULTS.initialSoc;
    this.energyKwh = this.soc * this.capacity;
    this.totalChargedKwh    = 0;
    this.totalDischargedKwh = 0;
  }
}
