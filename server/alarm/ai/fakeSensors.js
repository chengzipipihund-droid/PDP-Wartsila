/**
 * fakeSensors.js
 *
 * 5 fixed sensor readings used as situation awareness context.
 * Values are realistic for a propeller shaft lubrication pump fault scenario.
 * The AI picks 2 most relevant sensors per suggestion — it does NOT
 * fabricate values. The values here are what gets displayed in the UI.
 */

export const FAKE_SENSORS = [
  {
    id          : 'shaft_lube_pressure',
    name        : 'Shaft Lubrication Oil Pressure',
    value       : '0.9 bar',
    normalRange : '≥ 1.5 bar',
    status      : 'critical',
  },
  {
    id          : 'shaft_lube_flow',
    name        : 'Shaft Lubrication Oil Flow Rate',
    value       : '58% of rated',
    normalRange : '≥ 80% of rated',
    status      : 'critical',
  },
  {
    id          : 'shaft_bearing_temp',
    name        : 'Propeller Shaft Support Bearing Temperature',
    value       : '73 °C',
    normalRange : '< 60 °C',
    status      : 'critical',
  },
  {
    id          : 'shaft_vibration',
    name        : 'Propeller Shaft Vibration Level',
    value       : '9.2 mm/s RMS',
    normalRange : '< 7 mm/s RMS',
    status      : 'warning',
  },
  {
    id          : 'lube_pump_motor_current',
    name        : 'Lubrication Pump Motor Current',
    value       : '18.4 A',
    normalRange : '22 – 26 A',
    status      : 'warning',
  },
]

/**
 * Returns sensor objects by id array.
 * Used by the route handler after AI returns its 2 chosen ids.
 *
 * @param {string[]} ids
 * @returns {object[]}
 */
export function getSensorsByIds (ids) {
  return ids
    .map(id => FAKE_SENSORS.find(s => s.id === id))
    .filter(Boolean)
}

/**
 * Returns a comma-separated string of all sensor IDs (used in prompts for validation).
 */
export function getFakeSensorIds () {
  return FAKE_SENSORS.map(s => s.id).join(', ')
}

/**
 * Returns a compact sensor list string for injection into prompts.
 * Format:
 *   [crankcase_vibration] Crankcase Vibration Intensity: 18.4 mm/s (normal: < 7.1 mm/s) — CRITICAL
 */
export function getSensorListText () {
  return FAKE_SENSORS
    .map(s => `  [${s.id}] ${s.name}: ${s.value} (normal: ${s.normalRange}) — ${s.status.toUpperCase()}`)
    .join('\n')
}
