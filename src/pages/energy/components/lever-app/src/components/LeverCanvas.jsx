/* ═══════════════════════════════════════════════════════════
   LeverCanvas.jsx — Core lever mapping visualization
   
   ── COORDINATE SYSTEM ──
   Lever at  0% → vertical up (270° in SVG)
   Lever at +100% → tilted left  (200°) = acceleration
   Lever at -100% → tilted right (340°) = deceleration
   
   ── HOW TO MODIFY ──
   • Sweep range  → SWEEP_HALF_DEG (currently 70°)
   • Fan width    → FAN_HALF_DEG
   • Ring sizes   → outerR / innerR / coreR
   • Head shape   → <g> section marked "LEVER HEAD"
   • Base shape   → <rect> sections marked "BASE"
   ═══════════════════════════════════════════════════════════ */
import React from "react";
import { COLORS, LEVER_MIN, LEVER_MAX } from "./config.js";

const SWEEP_HALF_DEG = 70;
const FAN_HALF_DEG = 18;

const toRad = (deg) => (deg * Math.PI) / 180;
const toXY = (cx, cy, r, deg) => [
  cx + r * Math.cos(toRad(deg)),
  cy + r * Math.sin(toRad(deg)),
];

export function posToAngle(pos) {
  const clamped = Math.max(LEVER_MIN, Math.min(LEVER_MAX, pos));
  return 270 - (clamped / 100) * SWEEP_HALF_DEG;
}

export default function LeverCanvas({
  leverPos,
  width = 400,
  height = 400,
  children,
}) {
  const cx = width / 2;
  const cy = height / 2;

  const outerR = 135;
  const innerR = 105;
  const coreR = 38;

  const angle = posToAngle(leverPos);
  const rad = toRad(angle);

  // ── Fan / wedge ──
  const fanInR = 26;
  const fanOutR = outerR + 48;
  const fS = angle - FAN_HALF_DEG;
  const fE = angle + FAN_HALF_DEG;
  const [fisx, fisy] = toXY(cx, cy, fanInR, fS);
  const [fosx, fosy] = toXY(cx, cy, fanOutR, fS);
  const [foex, foey] = toXY(cx, cy, fanOutR, fE);
  const [fiex, fiey] = toXY(cx, cy, fanInR, fE);
  const fanPath = `M ${fisx} ${fisy} L ${fosx} ${fosy} A ${fanOutR} ${fanOutR} 0 0 1 ${foex} ${foey} L ${fiex} ${fiey} Z`;

  // ── Lever head ──
  const headDist = fanOutR + 6;
  const headW = 42, headH = 16;
  const [hcx, hcy] = toXY(cx, cy, headDist, angle);

  // ── Position needle ──
  const needleR = outerR + 54;
  const [na, nay] = toXY(cx, cy, needleR, angle);
  const [nb, nby] = toXY(cx, cy, needleR, angle + 180);
  const arrowR = needleR + 11;
  const [atx, aty] = toXY(cx, cy, arrowR, angle);
  const arrowPts = (tip, baseAngle, len) => {
    const a1 = baseAngle + 2.65, a2 = baseAngle - 2.65;
    return `${tip[0]},${tip[1]} ${tip[0] + len * Math.cos(a1)},${tip[1] + len * Math.sin(a1)} ${tip[0] + len * Math.cos(a2)},${tip[1] + len * Math.sin(a2)}`;
  };

  // ── Base ──
  const baseTop = cy + outerR + 8;

  return (
    <svg width={width} height={400} viewBox={`0 0 ${width} 400`} style={{ display: "block" }}>
      {/* ══ CROSSHAIRS ══ */}
      <line x1={0} y1={cy} x2={width} y2={cy} stroke={COLORS.crosshair} strokeWidth="1" strokeDasharray="7 5" opacity="0.4" />
      <line x1={cx} y1={0} x2={cx} y2={height} stroke={COLORS.crosshair} strokeWidth="1" strokeDasharray="7 5" opacity="0.4" />

      {/* ══ FAN / WEDGE ══ */}
      <path d={fanPath} fill={COLORS.leverFan} opacity="0.45" stroke={COLORS.leverFanBorder} strokeWidth="1.2" strokeDasharray="6 4" />

      {/* ══ LEVER HEAD ══ */}
      <g transform={`translate(${hcx},${hcy}) rotate(${angle - 90})`}>
        <rect x={-headW / 2} y={-headH / 2} width={headW} height={headH} rx={5} fill={COLORS.leverHead} stroke={COLORS.ringDark} strokeWidth="1.2" />
        <rect x={-headW / 2 + 4} y={-headH / 2 + 3} width={headW - 8} height={3} rx={1.5} fill={COLORS.leverHeadLight} opacity="0.6" />
      </g>

      {/* ══ OUTER RING ══ */}
      <circle cx={cx} cy={cy} r={outerR} fill={COLORS.canvasInner} stroke={COLORS.ringDark} strokeWidth="4.5" />
      {/* ══ INNER RING ══ */}
      <circle cx={cx} cy={cy} r={innerR} fill={COLORS.canvasBg} stroke={COLORS.ringMid} strokeWidth="1.5" />
      {/* ══ DECORATIVE RINGS ══ */}
      <circle cx={cx} cy={cy} r={82} fill="none" stroke={COLORS.ringMid} strokeWidth="0.5" opacity="0.3" />
      <circle cx={cx} cy={cy} r={62} fill="none" stroke={COLORS.ringMid} strokeWidth="0.5" opacity="0.2" />

      {/* ══ POSITION NEEDLE ══ */}
      <line x1={nb} y1={nby} x2={na} y2={nay} stroke={COLORS.ringDark} strokeWidth="2.5" strokeDasharray="9 5" />
      <polygon points={arrowPts([atx, aty], rad, 10)} fill={COLORS.ringDark} />

      {/* ══ CENTER HUB ══ */}
      <circle cx={cx} cy={cy} r={coreR} fill={COLORS.centerBg} stroke={COLORS.ringMid} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={coreR - 3} fill="none" stroke="#bbb" strokeWidth="0.5" />

      {/* ══ PERCENTAGE TEXT ══ */}
      <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 26, fontWeight: 800, fill: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
        {leverPos > 0 ? "+" : ""}{Math.round(leverPos)}%
      </text>

      {/* ══ BASE / PEDESTAL ══ */}
      <defs>
        <linearGradient id="baseNeckGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.baseMid} />
          <stop offset="100%" stopColor={COLORS.baseDark} />
        </linearGradient>
        <linearGradient id="basePlateGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.baseLight} />
          <stop offset="100%" stopColor={COLORS.baseMid} />
        </linearGradient>
      </defs>
      <rect x={cx - 28} y={baseTop} width={56} height={28} rx={2} fill="url(#baseNeckGrad)" />
      <rect x={cx - 70} y={baseTop + 25} width={140} height={18} rx={4} fill="url(#basePlateGrad)" />

      {/* ══ CHILD OVERLAYS (AIMarker etc.) ══ */}
      {typeof children === "function"
        ? children({ cx, cy, outerR, innerR, posToAngle })
        : children}
    </svg>
  );
}
