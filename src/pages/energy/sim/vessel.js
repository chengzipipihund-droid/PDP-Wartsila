/* ═══════════════════════════════════════════════════════════
   Vessel configuration — Finnlines Superstar (Finnsirius/Finncanopus)
   4 × Wärtsilä 6L46F + 5 MWh ESS

   Ported from python/energy_advisor.py (VESSEL) and
   python/battery_logic.py (BATTERY_DEFAULTS, PROPULSOR_SPECS, MODE_CONFIG)
   so the dashboard can run its own physics with no backend attached.
   Keep these values in sync with the Python modules.
   ═══════════════════════════════════════════════════════════ */

export const VESSEL = {
  nEngines: 4,        // 4 × Wärtsilä 6L46F
  engineKw: 7200,     // per-engine MCR
  totalKw: 28800,     // 4 × 7200
  sfoc: 181,          // g/kWh at 80 % MCR (HFO)
  maxKn: 20.5,
  hotelPeak: 7500,
  hotelNight: 2800,
  systems: 850,       // bridge + ECR + nav + safety
};

export const BATTERY_DEFAULTS = {
  capacityKwh:    5000,   // total ESS capacity
  maxChargeKw:    3500,   // shaft-generator limit
  maxDischargeKw: 4000,   // multidrive limit
  efficiency:     0.92,   // round-trip
  socMin:         0.15,
  socMax:         0.95,
  initialSoc:     0.80,   // shore-charged default
};

/** Lever id → propulsor spec. CPP is quadratic, thrusters are linear. */
export const PROPULSOR_SPECS = {
  1: { name: 'CPP Port',        type: 'cpp',      maxKw: 14400 },
  2: { name: 'CPP Starboard',   type: 'cpp',      maxKw: 14400 },
  3: { name: 'Bow Thruster PS', type: 'thruster', maxKw: 2500  },
  4: { name: 'Bow Thruster SB', type: 'thruster', maxKw: 2500  },
};

/**
 * Mode-specific battery behaviour.
 *   chargeFrac    — fraction of engine surplus directed to the battery
 *   dischargeFrac — fraction of propulsion demand the battery may cover
 */
export const MODE_CONFIG = {
  SMART_NAV: {
    chargeFrac: 0.5, dischargeFrac: 0.4, maxChargeKw: 3500, maxDischargeKw: 4000,
    description: 'Highest efficiency. Smart balancing of sources.',
  },
  HYBRID: {
    chargeFrac: 0.4, dischargeFrac: 0.5, maxChargeKw: 3000, maxDischargeKw: 4000,
    description: 'Balance between propulsion speed and energy efficiency.',
  },
  ECO_MODE: {
    chargeFrac: 0.0, dischargeFrac: 1.0, maxChargeKw: 0, maxDischargeKw: 4000,
    description: 'Maximum energy conservation. Relies heavily on battery.',
  },
  FULL_SPEED: {
    chargeFrac: 0.0, dischargeFrac: 1.0, maxChargeKw: 0, maxDischargeKw: 4000,
    description: 'Maximal propulsion power, ignoring battery conservation.',
  },
  TRANSIT: {
    chargeFrac: 0.6, dischargeFrac: 0.0, maxChargeKw: 3500, maxDischargeKw: 0,
    description: 'CPP cruising. Battery charges from engine surplus via PTO.',
  },
  MANOEUVRE: {
    chargeFrac: 0.0, dischargeFrac: 0.4, maxChargeKw: 0, maxDischargeKw: 4000,
    description: 'Port/harbour. Battery assists thruster peaks.',
  },
  ZERO_EMISSION: {
    chargeFrac: 0.0, dischargeFrac: 1.0, maxChargeKw: 0, maxDischargeKw: 4000,
    description: 'Battery-only operation. Engines stopped. Zero emissions in port.',
  },
  ECO: {
    chargeFrac: 0.3, dischargeFrac: 0.2, maxChargeKw: 2000, maxDischargeKw: 2000,
    description: 'Eco transit. Mild charge + peak shave for optimal engine SFOC.',
  },
};

/** Optimal load band for the Wärtsilä 46F — best SFOC between 60 % and 90 % MCR. */
export const OPT_LOW  = 0.60;
export const OPT_HIGH = 0.90;

/** Simulated constant solar generation (kW). */
export const SOLAR_KW = 850;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
