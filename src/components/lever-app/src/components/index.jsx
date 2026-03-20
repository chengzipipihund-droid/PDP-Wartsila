/* ═══════════════════════════════════════════════════════════
   index.jsx — Lever 1 Mapping Panel (450 × 660)
   
   ── DATA FLOW ──
   LeverController (mouse drag) → setLeverPos()
     → LeverCanvas (visual), SpeedLabel, RPMGauge
     → fetchAISuggestion() every 60s → AIMarker
   
   ── WHEN HARDWARE IS READY ──
   Replace LeverController with your real data source.
   Call handleLeverChange(newValue) from WebSocket/serial.
   ═══════════════════════════════════════════════════════════ */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, POPUP_WIDTH, POPUP_HEIGHT, fetchAISuggestion, estimateRPM } from "./config.js";
import TopBar from "./TopBar.jsx";
import SpeedLabel from "./SpeedLabel.jsx";
import RPMGauge from "./RPMGauge.jsx";
import LeverCanvas from "./LeverCanvas.jsx";
import AIMarker from "./AIMarker.jsx";
import LeverController from "./LeverController.jsx";
import BottomBar from "./BottomBar.jsx";

const AI_REFRESH_MS = 60_000;

export default function Lever1Panel({ rpm: externalRpm }) {
  const [leverPos, setLeverPos] = useState(0);
  const [prevPos, setPrevPos] = useState(0);
  const [rpm, setRpm] = useState(externalRpm || 150);

  useEffect(() => {
    if (externalRpm !== undefined) {
      setRpm(externalRpm);
    }
  }, [externalRpm]);
  const [aiData, setAiData] = useState(null);
  const [mode, setMode] = useState("copilot");

  const leverRef = useRef(0);
  const rpmRef = useRef(150);

  const handleLeverChange = useCallback((p) => {
    setPrevPos(leverRef.current);
    setLeverPos(p);
    leverRef.current = p;
    const r = estimateRPM(p);
    setRpm(r);
    rpmRef.current = r;
  }, []);

  const refreshAI = useCallback(async () => {
    try {
      const d = await fetchAISuggestion(leverRef.current, rpmRef.current);
      setAiData(d);
    } catch (e) {
      console.warn("[AI]", e);
    }
  }, []);

  useEffect(() => {
    refreshAI();
    const iv = setInterval(refreshAI, AI_REFRESH_MS);
    return () => clearInterval(iv);
  }, [refreshAI]);

  return (
    <div style={{
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
      fontFamily: "'DM Sans', sans-serif",
      background: COLORS.panelBg,
      borderRadius: 10,
      overflow: "hidden",
      boxShadow: "0 12px 48px rgba(0,0,0,0.45)",
      userSelect: "none",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ▸ TOP BAR */}
      <TopBar mode={mode} onModeChange={setMode} />

      {/* ▸ CANVAS AREA */}
      <div style={{ flex: 1, background: COLORS.canvasBg, position: "relative", display: "flex", flexDirection: "column", padding: "6px 10px 0", overflow: "hidden" }}>
        <SpeedLabel leverPos={leverPos} prevPos={prevPos} />
        <div style={{ position: "absolute", top: 6, right: 10, zIndex: 5 }}>
          <RPMGauge rpm={rpm} />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -12 }}>
          <LeverCanvas leverPos={leverPos} width={400} height={390}>
            {({ cx, cy, outerR }) =>
              mode === "copilot" && aiData ? (
                <AIMarker aiData={aiData} cx={cx} cy={cy} outerR={outerR} />
              ) : null
            }
          </LeverCanvas>
        </div>
      </div>

      {/* ▸ LEVER CONTROLLER */}
      <LeverController value={leverPos} onChange={handleLeverChange} />

      {/* ▸ BOTTOM BAR */}
      <BottomBar />
    </div>
  );
}
