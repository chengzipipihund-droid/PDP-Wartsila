/* ═══════════════════════════════════════════════════════════
   LeverPopup.jsx — Lever Mapping side panel with real-time hardware
   
   ── FEATURES ──
   • Receives real-time lever position from hardware via useLeverHardware
   • Two modes:
     - Co-Pilot: displays real-time hardware data
     - Manual: allows user to drag lever for simulation/testing
   • Continuous AI suggestions every 60s
   • Connection status indicator
   • Lever canvas responds to hardware movements
   ═══════════════════════════════════════════════════════════ */
import { useState, useCallback } from "react";
import LeverCanvas from "../lever-app/src/components/LeverCanvas.jsx";
import AIMarker from "../lever-app/src/components/AIMarker.jsx";
import LeverController from "../lever-app/src/components/LeverController.jsx";

import LeverIconSvg    from "./icon/LeverIcon.svg";
import EnergyIconSvg   from "./icon/EnergyIcon.svg";
import DocumentIconSvg from "./icon/Document.svg";

/* ─── Color tokens from Overview.svg ─── */
const C = {
  panelBg:    "#3B3E3F",   /* outer panel / title bar */
  tabBarBg:   "#262727",   /* tab row background */
  activeTab:  "#E6E9EC",   /* active tab pill */
  canvasBg:   "#EFEFEF",   /* lever canvas area */
  iconDim:    "#C8CCD0",   /* inactive icon tint */
  green:      "#4FBF65",   /* accent green */
  darkBtn:    "#53575A",   /* inactive mode button */
  white:      "#FFFFFF",
};

const TABS = [
  { id: "lever",    icon: LeverIconSvg,    w: 29, h: 37 },
  { id: "energy",   icon: EnergyIconSvg,   w: 34, h: 34 },
  { id: "document", icon: DocumentIconSvg, w: 34, h: 34 },
];

export default function LeverPopup({ leverData, onClose, onEcoMode, rpm, batteryLevel, leverPos, setLeverPos, mode, setMode, manualLeverPos, setManualLeverPos }) {
  const [activeTab, setActiveTab] = useState("lever");
  
  const formatRPM = (rpm) => {
    if (rpm < 0.1) return 0;
    return Math.round(rpm * 10) / 10;
  };
  
  // When in manual mode, user can drag to control lever
  // const [manualLeverPos, setManualLeverPos] = useState(0);
  
  // Determine which lever position to display
  const displayLeverPos = mode === "manual" ? manualLeverPos : (leverData?.leverPos ?? 0);
  const displayRpm = formatRPM(rpm);
  const displayAiData = mode === "copilot" ? leverData?.aiData : null;
  const isHardwareConnected = leverData?.isConnected ?? false;
  const hardwareError = leverData?.error;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onEcoMode) onEcoMode(tabId === "energy");
  };

  const handleManualLeverChange = useCallback((p) => {
    setManualLeverPos(p);
  }, [setManualLeverPos]);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: C.panelBg,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      overflow: "hidden",
      userSelect: "none",
    }}>

      {/* ── Title bar ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 12px 8px",
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#aaa", fontWeight: 500, letterSpacing: 0.5 }}>
            SCA011PT281
          </div>
          <div style={{ fontSize: 19, color: C.white, fontWeight: 700, marginTop: 1 }}>
            Lever Mapping
          </div>
          
          {/* Connection status indicator */}
          <div style={{
            marginTop: 4,
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isHardwareConnected ? "#4FBF65" : "#FF6B6B",
              display: "inline-block",
            }} />
            <span style={{ color: isHardwareConnected ? "#4FBF65" : "#FF6B6B" }}>
              {isHardwareConnected ? "HARDWARE CONNECTED" : "WAITING FOR DATA"}
            </span>
            {hardwareError && <span style={{ color: "#FFB347", marginLeft: 4 }}>({hardwareError})</span>}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 5,
            color: "#ccc",
            fontSize: 14,
            cursor: "pointer",
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        background: C.tabBarBg,
        padding: "6px 8px",
        gap: 4,
        flexShrink: 0,
      }}>
        {/* Tab icons */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                style={{
                  width: 50,
                  height: 46,
                  borderRadius: 5,
                  border: "none",
                  background: isActive ? C.activeTab : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  flexShrink: 0,
                  opacity: isActive ? 1 : 0.55,
                }}
              >
                <img
                  src={tab.icon}
                  width={tab.w}
                  height={tab.h}
                  alt={tab.id}
                  style={{ display: "block" }}
                />
              </button>
            );
          })}
        </div>

        {/* Mode buttons */}
        <div style={{ display: "flex", gap: 5 }}>
          <ModeBtn
            label="Manual"
            sub={mode === "manual" ? "Active" : "InActive"}
            active={mode === "manual"}
            onClick={() => setMode("manual")}
          />
          <ModeBtn
            label="Co-Pilot"
            sub={mode === "copilot" ? "Active" : "InActive"}
            active={mode === "copilot"}
            onClick={() => setMode("copilot")}
          />
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div style={{
        flex: 1,
        background: C.canvasBg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}>
        {/* Direction labels */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px 0",
          flexShrink: 0,
        }}>
          {/* SLOW DOWN (left, gray) */}
          <span style={{
            color: "#888",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.3,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <span style={{ fontSize: 9, letterSpacing: -2 }}>▶▶▶</span> SLOW DOWN
          </span>

          {/* SPEED UP (right) */}
          <span style={{ 
            color: "#888",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.3,
          }}>
            SPEED UP <span style={{ fontSize: 9, letterSpacing: -2 }}>▶▶▶</span>
          </span>
        </div>

        {/* Lever canvas */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
          padding: "8px",
        }}>
          <LeverCanvas leverPos={displayLeverPos} width={300} height={400}>
            {({ cx, cy, outerR }) =>
              mode === "copilot" && displayAiData ? (
                <AIMarker aiData={displayAiData} cx={cx} cy={cy} outerR={outerR} />
              ) : null
            }
          </LeverCanvas>
        </div>
      </div>

      {/* ── Manual control (only shown in Manual mode) ── */}
      {mode === "manual" && (
        <LeverController value={manualLeverPos} onChange={handleManualLeverChange} />
      )}

      {/* ── Bottom control bar ── */}
      <div style={{
        padding: "8px 10px",
        background: C.panelBg,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        {/* Data status display */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: C.activeTab,
          borderRadius: 20,
          padding: "5px 14px",
          flex: 1,
        }}>
          <span style={{ fontSize: 11, color: "#555", fontWeight: 500 }}>
            Pos: <strong>{displayLeverPos}%</strong> | RPM: <strong>{displayRpm}</strong>
            {mode === "copilot" && isHardwareConnected && (
              <span style={{ marginLeft: 8 }}>● Live Data</span>
            )}
            {mode === "manual" && (
              <span style={{ marginLeft: 8 }}>● Manual Mode</span>
            )}
          </span>
        </div>

        {/* Search / zoom icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ cursor: "pointer", flexShrink: 0 }}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M10.5 8v5" />
          <path d="M8 10.5h5" />
        </svg>

        {/* Bell icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ cursor: "pointer", flexShrink: 0 }}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      </div>
    </div>
  );
}

/* ── Mode button sub-component ── */
function ModeBtn({ label, sub, active, onClick }) {
  const bg     = active ? (label === "Co-Pilot" ? C.green : "#888") : C.darkBtn;
  const border = active ? (label === "Co-Pilot" ? C.green     : "#999") : "#444";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 5,
        cursor: "pointer",
        background: bg,
        border: `2px solid ${border}`,
        color: active && label === "Co-Pilot" ? "#333" : C.white,
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 72,
        flexShrink: 0,
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.75 }}>{sub}</span>
    </button>
  );
}
