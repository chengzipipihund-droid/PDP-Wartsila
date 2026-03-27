import React from "react";
import { COLORS, RPM_MAX } from "./config.js";

export default function RPMGauge({ rpm, size = 86 }) {
  const formatRPM = (rpm) => {
    if (rpm < 0.1) return 0;
    return Math.round(rpm * 10) / 10;
  };
  const cx = size / 2, cy = size / 2, r = size * 0.35;
  const startDeg = 225, sweepDeg = 270;
  const frac = Math.min(1, Math.max(0, rpm / RPM_MAX));
  const nd = startDeg + frac * sweepDeg;
  const xy = (radius, deg) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arc = (radius, from, to) => {
    const [sx, sy] = xy(radius, from);
    const [ex, ey] = xy(radius, to);
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${Math.abs(to - from) > 180 ? 1 : 0} 1 ${ex} ${ey}`;
  };
  const [nx, ny] = xy(r + 5, nd);
  const [nbx, nby] = xy(r - 10, nd);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={arc(r, startDeg, startDeg + sweepDeg)} fill="none" stroke="#b0b0b0" strokeWidth="5" strokeLinecap="round" />
      <path d={arc(r, startDeg, nd)} fill="none" stroke="#555" strokeWidth="5" strokeLinecap="round" />
      <line x1={nbx} y1={nby} x2={nx} y2={ny} stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={16} fill={COLORS.ringLight} stroke="#b0b0b0" strokeWidth="1.5" />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontWeight: 800, fill: "#333", fontFamily: "'DM Sans',sans-serif" }}>{formatRPM(rpm)}</text>
      <text x={cx} y={cy + 23} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: "#888", fontFamily: "'DM Sans',sans-serif" }}>RPM</text>
    </svg>
  );
}
