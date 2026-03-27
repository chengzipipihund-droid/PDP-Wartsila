import React, { useRef, useCallback, useEffect } from "react";
import { COLORS } from "./config.js";

const TRACK_WIDTH = 320;
const TRACK_HALF = TRACK_WIDTH / 2;

export default function LeverController({ value, onChange }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);

  const pxToVal = (px) => Math.round((-Math.max(-TRACK_HALF, Math.min(TRACK_HALF, px)) / TRACK_HALF) * 100);
  const valToPx = (v) => (-v / 100) * TRACK_HALF;

  const update = useCallback((e) => {
    if (!trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    onChange(pxToVal(e.clientX - r.left - r.width / 2));
  }, [onChange]);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const ox = valToPx(value);

  return (
    <div style={{ padding: "10px 16px 6px", background: COLORS.panelBg, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, padding: "0 16px" }}>
        <span style={{ color: COLORS.ai }}>+ Accel</span>
        <span>Lever Monitor (drag)</span>
        <span style={{ color: "#e06050" }}>Decel −</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={(e) => { dragging.current = true; e.target.setPointerCapture?.(e.pointerId); update(e); }}
        onPointerMove={(e) => { if (dragging.current) update(e); }}
        onPointerUp={() => { dragging.current = false; }}
        style={{ position: "relative", width: TRACK_WIDTH, height: 40, margin: "0 auto", cursor: "grab", touchAction: "none", userSelect: "none" }}
      >
        {/* Groove */}
        <div style={{ position: "absolute", top: "50%", left: 12, right: 12, transform: "translateY(-50%)", height: 6, borderRadius: 3, background: "rgba(0,0,0,0.25)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)" }} />
        {/* Center line */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 2, height: 18, background: "rgba(255,255,255,0.3)", borderRadius: 1 }} />
        {/* Green zone (left = accel) */}
        <div style={{ position: "absolute", top: "50%", left: 12, width: "calc(50% - 12px)", height: 6, borderRadius: "3px 0 0 3px", transform: "translateY(-50%)", background: "rgba(60,176,67,0.12)" }} />
        {/* Red zone (right = decel) */}
        <div style={{ position: "absolute", top: "50%", right: 12, width: "calc(50% - 12px)", height: 6, borderRadius: "0 3px 3px 0", transform: "translateY(-50%)", background: "rgba(224,96,80,0.10)" }} />
        {/* Tick marks */}
        {[-100, -50, 0, 50, 100].map((v) => {
          const px = TRACK_WIDTH / 2 + valToPx(v);
          return <div key={v} style={{ position: "absolute", left: px, top: v === 0 ? 4 : 10, width: 1, height: v === 0 ? 32 : 20, background: v === 0 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)", transform: "translateX(-50%)" }} />;
        })}
        {/* Handle */}
        <div style={{ position: "absolute", top: "50%", left: TRACK_WIDTH / 2 + ox, transform: "translate(-50%,-50%)", width: 44, height: 30, borderRadius: 6, background: "linear-gradient(180deg,#bbb,#888)", border: "1.5px solid #666", boxShadow: "0 2px 8px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 2, height: 12, borderRadius: 1, background: "rgba(255,255,255,0.35)" }} />)}
          </div>
        </div>
      </div>

      {/* Value readout */}
      <div style={{ textAlign: "center", marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 800, color: value > 0 ? COLORS.ai : value < 0 ? "#e06050" : "#ccc" }}>
        {value > 0 ? "+" : ""}{value}%
      </div>
    </div>
  );
}
