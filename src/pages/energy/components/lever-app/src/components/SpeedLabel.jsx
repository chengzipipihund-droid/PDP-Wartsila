import React from "react";
import { COLORS } from "./config.js";

export default function SpeedLabel({ leverPos, prevPos }) {
  const d = leverPos - prevPos;
  if (Math.abs(d) < 0.5) return <div style={{ height: 22 }} />;
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 14, color: COLORS.speedUp, height: 22, display: "flex", alignItems: "center", gap: 3 }}>
      {d > 0 && <><span style={{ letterSpacing: -2 }}>⟪⟪⟪</span> SPEED UP</>}
      {d < 0 && <>SPEED DOWN <span style={{ letterSpacing: -2 }}>⟫⟫⟫</span></>}
    </div>
  );
}
