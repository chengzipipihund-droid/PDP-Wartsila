import { useState } from "react"
import base from "./User Scenario 1.svg"
import fullspeedSvg from "./User Scenario - Fullspeed.svg"
import hybridSvg from "./User Scenario - Hybrid.svg"
import smartNavSvg from "./User Scenario - SmartNav.svg"
import ecoSvg from "./User Scenario - Eco.svg"

const MODES = [
  {
    id: "fullspeed",
    label: "Full Speed",
    color: "#C95023",
    colorLight: "#FAECE7",
    colorText: "#993C1D",
    src: fullspeedSvg,
    trigger: '"We\'re going to miss the port window."',
  },
  {
    id: "hybrid",
    label: "Hybrid",
    color: "#D0882B",
    colorLight: "#FAEEDA",
    colorText: "#854F0B",
    src: hybridSvg,
    trigger: '"Just another day at sea."',
  },
  {
    id: "smartcruise",
    label: "Smart Cruise",
    color: "#2968B6",
    colorLight: "#E6F1FB",
    colorText: "#185FA5",
    src: smartNavSvg,
    trigger: '"Long haul. Battery\'s full. Smooth sailing."',
  },
  {
    id: "eco",
    label: "Eco Mode",
    color: "#7CC237",
    colorLight: "#EAF3DE",
    colorText: "#3B6D11",
    src: ecoSvg,
    trigger: '"We\'re early — heading into a restricted zone."',
  },
]

export default function EnergyModeScenario({ className = "" }) {
  const [hovered, setHovered] = useState(null)
  const activeMode = MODES.find((m) => m.id === hovered)

  return (
    <div className={`w-full ${className}`} style={{ fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif' }}>
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {MODES.map((mode) => {
          const isActive = hovered === mode.id
          return (
            <button
              key={mode.id}
              onMouseEnter={() => setHovered(mode.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "10px 16px",
                border: `1.5px solid ${isActive ? mode.color : "#D1D0C8"}`,
                borderRadius: "10px",
                background: isActive ? mode.colorLight : "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
                minWidth: "120px",
                flex: "1 1 120px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: mode.color,
                  marginBottom: "6px",
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? mode.colorText : "#3d3d3a",
                  lineHeight: 1.2,
                }}
              >
                {mode.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Trigger quote strip */}
      <div style={{ height: "36px", display: "flex", alignItems: "center", padding: "0 4px", marginBottom: "12px", opacity: activeMode ? 1 : 0, transition: "opacity 0.25s ease" }}>
        {activeMode && (
          <div style={{ borderLeft: `3px solid ${activeMode.color}`, paddingLeft: "12px" }}>
            <div style={{ fontSize: "13px", fontStyle: "italic", color: activeMode.colorText, fontWeight: 500, lineHeight: 1.3 }}>
              {activeMode.trigger}
            </div>
          </div>
        )}
      </div>

      {/* Diagram — horizontally scrollable so SVG renders at a fixed larger width */}
      <div style={{ overflowX: "auto", borderRadius: "12px", border: "0.5px solid #D1D0C8" }}>
        <div style={{ position: "relative", width: "900px", aspectRatio: "4439 / 2824", background: "#fff" }}>
          <img src={base} alt="Energy mode scenario overview" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />
          {MODES.map((mode) => (
            <img
              key={mode.id}
              src={mode.src}
              alt={`${mode.label} scenario`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: hovered === mode.id ? 1 : 0, transition: "opacity 0.28s ease", pointerEvents: "none" }}
              draggable={false}
            />
          ))}
          {MODES.map((mode, i) => {
            const topPct = ((490 + i * 610) / 2824) * 100
            const heightPct = (610 / 2824) * 100
            return (
              <div
                key={mode.id}
                onMouseEnter={() => setHovered(mode.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ position: "absolute", left: 0, top: `${topPct}%`, width: "100%", height: `${heightPct}%`, cursor: "pointer", zIndex: 10 }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
