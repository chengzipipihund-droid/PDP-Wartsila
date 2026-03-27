/**
 * IR Sensor → CPP Lever Mapping
 *
 * Physical lever controls Controllable Pitch Propeller (CPP):
 *   - Push forward = ahead (positive pitch, ship moves forward)
 *   - Pull back = astern (negative pitch, ship moves backward)
 *   - Center = zero pitch (neutral, no thrust)
 *
 * IR sensor range: -10000 to +10000
 * Mapped to: 0 to 100
 *   0   = full astern (-10000)
 *   50  = neutral (0)
 *   100 = full ahead (+10000)
 */

export function irToPercent(raw) {
  return Math.max(0, Math.min(100, (raw + 10000) / 200));
}

export function percentToThrust(pct) {
  // Returns -1 (full astern) to +1 (full ahead), 0 = neutral
  return (pct - 50) / 50;
}

/**
 * Parse one line of IR sensor data
 * Input:  "IR[0]=-10000 | IR[1]=-8470 | IR[2]=0 | IR[3]=0 | IR[4]=0 | IR[5]=0"
 * Output: [-10000, -8470, 0, 0, 0, 0]
 */
export function parseIRLine(line) {
  return line.split('|').map(part => {
    const match = part.match(/=(-?\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
}

/**
 * Two CPP levers → ship command
 * Port lever (IR[0]) + Starboard lever (IR[1])
 *
 * Both forward → ship goes ahead
 * Both back → ship goes astern
 * Differential → ship turns (like a tank)
 *   Port > Stbd → turns starboard (right)
 *   Stbd > Port → turns port (left)
 */
export function leversToCommand(portPct, stbdPct) {
  const portThrust = percentToThrust(portPct);  // -1 to +1
  const stbdThrust = percentToThrust(stbdPct);  // -1 to +1

  return {
    // Combined ahead/astern demand
    thrust: (portThrust + stbdThrust) / 2,  // -1 to +1
    // Differential for turning
    turn: (portThrust - stbdThrust) / 2,    // -1 to +1 (positive = starboard turn)
    // Individual
    port: portThrust,
    stbd: stbdThrust,
  };
}
