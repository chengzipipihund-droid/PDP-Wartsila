import React, { useState } from "react";
import { COLORS } from "./config.js";
import { posToAngle } from "./LeverCanvas.jsx";

const toRad = (deg) => (deg * Math.PI) / 180;
const toXY = (cx, cy, r, deg) => [cx + r * Math.cos(toRad(deg)), cy + r * Math.sin(toRad(deg))];

export default function AIMarker({ aiData, cx, cy, outerR }) {
  const [hover, setHover] = useState(false);
  if (!aiData) return null;

  const pos = aiData.suggestedPosition;
  const angle = posToAngle(pos);
  const [bx, by] = toXY(cx, cy, outerR + 3, angle);
  const [tx, ty] = toXY(cx, cy, outerR + 22, angle);
  const [lx, ly] = toXY(cx, cy, outerR + 42, angle);
  const ha = Math.atan2(ty - by, tx - bx);
  const pts = `${tx},${ty} ${tx + 9 * Math.cos(ha + 2.6)},${ty + 9 * Math.sin(ha + 2.6)} ${tx + 9 * Math.cos(ha - 2.6)},${ty + 9 * Math.sin(ha - 2.6)}`;

  return (
    <g onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ cursor: "pointer" }}>
      <line x1={bx} y1={by} x2={tx} y2={ty} stroke={COLORS.ai} strokeWidth="3" strokeLinecap="round" />
      <polygon points={pts} fill={COLORS.ai} />
      <circle cx={lx} cy={ly} r={15} fill={COLORS.ai} />
      <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontWeight: 800, fill: COLORS.white, fontFamily: "'DM Sans',sans-serif" }}>
        {Math.round(pos)}
      </text>
      <circle cx={lx} cy={ly} r={28} fill="transparent" />
      {hover && (
        <foreignObject x={lx + 18} y={ly - 52} width={220} height={100} style={{ overflow: "visible", pointerEvents: "none" }}>
          <div style={{ background: COLORS.tooltipBg, color: COLORS.tooltipText, borderRadius: 10, padding: "10px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, lineHeight: 1.65, boxShadow: "0 6px 24px rgba(0,0,0,0.5)", border: `1.5px solid ${COLORS.ai}`, whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: 800, color: COLORS.ai, fontSize: 13, marginBottom: 2 }}>AI Suggestion: {pos > 0 ? "+" : ""}{Math.round(pos)}%</div>
            <div>Energy: <b style={{ color: COLORS.aiLight }}>-{aiData.energySavingPct}%</b> <span style={{ opacity: 0.55 }}>({aiData.energySavingKw} kW)</span></div>
            <div>Fuel: <b style={{ color: COLORS.aiLight }}>-{aiData.fuelSavingLph} L/h</b></div>
            <div style={{ opacity: 0.4, fontSize: 10, marginTop: 2 }}>conf: {aiData.confidence} · {aiData.modelVersion}</div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
