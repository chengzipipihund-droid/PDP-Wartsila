import React from "react";
import { COLORS } from "./config.js";

export default function TopBar({ mode, onModeChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: COLORS.panelBg }}>
      <div style={{ display: "flex", gap: 6 }}>
        <ToolIcon active><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></ToolIcon>
        <ToolIcon><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></ToolIcon>
        <ToolIcon><path d="M12 18a4 4 0 004-4V8a4 4 0 10-8 0v6a4 4 0 004 4z" /><path d="M12 18v3" /></ToolIcon>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <ModeBtn label="Manual" sub="InActive" active={mode === "manual"} onClick={() => onModeChange("manual")} />
        <ModeBtn label="Co-Pilot" sub="Active" active={mode === "copilot"} onClick={() => onModeChange("copilot")} />
      </div>
    </div>
  );
}

function ToolIcon({ children, active }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 5, background: active ? "rgba(255,255,255,0.82)" : "transparent", border: active ? "1.5px solid #bbb" : "1.5px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#555" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </div>
  );
}

function ModeBtn({ label, sub, active, onClick }) {
  const bg = active ? (label === "Co-Pilot" ? COLORS.modeActive : "#888") : "#6a6a6a";
  const border = active ? (label === "Co-Pilot" ? COLORS.modeActive : "#999") : "#555";
  return (
    <button onClick={onClick} style={{ padding: "4px 12px", borderRadius: 5, cursor: "pointer", background: bg, border: `2px solid ${border}`, color: COLORS.white, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, lineHeight: 1.15, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 82 }}>
      <span>{label}</span>
      <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}>{sub}</span>
    </button>
  );
}
