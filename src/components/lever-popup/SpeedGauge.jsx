/**
 * SpeedGauge.jsx
 * Dynamic SVG gauge matching the visual design of Databoard.svg + EnergyPage/Speed.svg:
 *   - Outer ring:  #C8CCD0
 *   - Inner ring:  #ABADB0
 *   - Dark face:   #53575A
 *   - Center fill: #E6E9EC
 *   - Needle:      white triangle, rotates with value
 */

// Convert (center, radius, angle-from-12-o'clock-clockwise) → SVG {x, y}
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Build a closed donut-arc path (start → start+sweepDeg, clockwise)
function donutArc(cx, cy, rOut, rIn, startDeg, sweepDeg) {
  const s = Math.min(Math.abs(sweepDeg), 359.9); // avoid SVG full-circle bug
  const endDeg = startDeg + s;
  const large  = s > 180 ? 1 : 0;
  const o1 = polar(cx, cy, rOut, startDeg);
  const o2 = polar(cx, cy, rOut, endDeg);
  const i1 = polar(cx, cy, rIn,  startDeg);
  const i2 = polar(cx, cy, rIn,  endDeg);
  return [
    `M${o1.x.toFixed(2)},${o1.y.toFixed(2)}`,
    `A${rOut},${rOut} 0 ${large},1 ${o2.x.toFixed(2)},${o2.y.toFixed(2)}`,
    `L${i2.x.toFixed(2)},${i2.y.toFixed(2)}`,
    `A${rIn},${rIn} 0 ${large},0 ${i1.x.toFixed(2)},${i1.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

// Gauge arc: 225° → 135° going clockwise through top (270° total)
const GAUGE_START  = 225;
const GAUGE_SWEEP  = 270;

export default function SpeedGauge({ value = 0, maxValue = 500, unit = 'RPM', alarm = false }) {
  const cx = 100, cy = 100;

  // Radii (px, viewBox 200×200)
  const R_OUT  = 90;   // outermost ring edge
  const R_MID  = 79;   // between the two rings
  const R_FACE = 68;   // inner edge of rings / edge of dark face
  const R_CTR  = 52;   // light centre circle
  const R_CAP  = 7;    // centre cap over needle base

  // Needle
  const NEEDLE = 62;   // length from centre to tip
  const NEEDLE_W = 3;  // half-width at base

  const pct = Math.max(0, Math.min(1, value / maxValue));
  const needleDeg = GAUGE_START + pct * GAUGE_SWEEP;

  const tip    = polar(cx, cy, NEEDLE, needleDeg);
  const bLeft  = polar(cx, cy, NEEDLE_W, needleDeg - 90);
  const bRight = polar(cx, cy, NEEDLE_W, needleDeg + 90);

  // Major tick marks (0 / 25 / 50 / 75 / 100 %)
  const majorTicks = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const a = GAUGE_START + t * GAUGE_SWEEP;
    return {
      p1: polar(cx, cy, R_FACE + 3, a),
      p2: polar(cx, cy, R_MID  - 2, a),
    };
  });

  // Minor tick marks every 5 % except at major positions
  const minorTicks = Array.from({ length: 21 }, (_, i) => i / 20)
    .filter(t => t % 0.25 !== 0)
    .map(t => {
      const a = GAUGE_START + t * GAUGE_SWEEP;
      return {
        p1: polar(cx, cy, R_FACE + 5, a),
        p2: polar(cx, cy, R_MID  - 5, a),
      };
    });

  // Tick labels at 0, 125, 250, 375, 500 RPM
  const labels = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const a = GAUGE_START + t * GAUGE_SWEEP;
    const p = polar(cx, cy, R_OUT + 5, a);
    return { ...p, text: Math.round(t * maxValue) };
  });

  const needleColor = alarm ? '#E74C3C' : '#FFFFFF';

  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* ── Outer ring #C8CCD0 ── */}
      <path d={donutArc(cx, cy, R_OUT, R_MID, GAUGE_START, GAUGE_SWEEP)} fill="#C8CCD0" />

      {/* ── Inner ring #ABADB0 ── */}
      <path d={donutArc(cx, cy, R_MID, R_FACE, GAUGE_START, GAUGE_SWEEP)} fill="#ABADB0" />

      {/* ── Dark face ── */}
      <circle cx={cx} cy={cy} r={R_FACE} fill="#53575A" />

      {/* ── Light centre ── */}
      <circle cx={cx} cy={cy} r={R_CTR} fill="#E6E9EC" />

      {/* ── Alarm highlight arc on inner ring ── */}
      {alarm && (
        <path
          d={donutArc(cx, cy, R_MID, R_FACE,
            GAUGE_START + 0.8 * GAUGE_SWEEP,
            0.2 * GAUGE_SWEEP)}
          fill="#E74C3C"
          opacity="0.7"
        />
      )}

      {/* ── Minor ticks ── */}
      {minorTicks.map((t, i) => (
        <line key={i}
          x1={t.p1.x} y1={t.p1.y} x2={t.p2.x} y2={t.p2.y}
          stroke="white" strokeWidth="1" opacity="0.4"
        />
      ))}

      {/* ── Major ticks ── */}
      {majorTicks.map((t, i) => (
        <line key={i}
          x1={t.p1.x} y1={t.p1.y} x2={t.p2.x} y2={t.p2.y}
          stroke="white" strokeWidth="2"
        />
      ))}

      {/* ── Tick labels ── */}
      {labels.map((l, i) => (
        <text key={i} x={l.x} y={l.y}
          textAnchor="middle" dominantBaseline="middle"
          fill="#555" fontSize="7" fontFamily="sans-serif">
          {l.text}
        </text>
      ))}

      {/* ── Needle ── */}
      <polygon
        points={`${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${bLeft.x.toFixed(2)},${bLeft.y.toFixed(2)} ${bRight.x.toFixed(2)},${bRight.y.toFixed(2)}`}
        fill={needleColor}
      />

      {/* ── Centre cap ── */}
      <circle cx={cx} cy={cy} r={R_CAP} fill="#53575A" stroke="white" strokeWidth="1.5" />

      {/* ── Value inside centre circle ── */}
      <text x={cx} y={cy + 16}
        textAnchor="middle"
        fill={alarm ? '#E74C3C' : '#333'}
        fontSize="13" fontWeight="700" fontFamily="sans-serif">
        {Math.round(value)}
      </text>
      <text x={cx} y={cy + 27}
        textAnchor="middle"
        fill="#666" fontSize="7" fontFamily="sans-serif">
        {unit}
      </text>
    </svg>
  );
}
