/* ═══════════════════════════════════════════════════════════
   EcoModeContent.jsx — Eco / Energy mode body content.
   Replaces the normal dashboard panels when the Energy tab
   is active in LeverPopup.  Layout mirrors Pages/LeverMode.svg.
   ═══════════════════════════════════════════════════════════ */
import BatteryPanel from '../battery/BatteryPanel';
import EngineSvg            from "./EnergyPage/Engine.svg";
import EnergyConsumptionSvg from "./EnergyPage/EnergyConsumption.svg";
import SpeedGauge           from "./SpeedGauge";

export default function EcoModeContent({ batteryLevel, rpm }) {
  const alarm = rpm > 400;

  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 3,
      overflow: "hidden",
      background: "#f0f0f0",
    }}>

      {/* ── Row 1: Battery + Engine side-by-side, fixed at 28% of height ── */}
      <div style={{
        flex: "0 0 28%",
        display: "flex",
        gap: 3,
        minHeight: 0,
        overflow: "hidden",
      }}>
        <div style={{ flex: "0 0 61%", minWidth: 0, height: "100%", boxSizing: 'border-box' }}>
          <BatteryPanel batteryLevel={batteryLevel} />
        </div>
        <img
          src={EngineSvg}
          alt="Engine"
          style={{ flex: "1 1 0", width: 0, minWidth: 0, height: "100%", display: "block", objectFit: "fill" }}
        />
      </div>

      {/* ── Row 2: Energy Consumption ── */}
      <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
        <img
          src={EnergyConsumptionSvg}
          alt="Energy Consumption"
          style={{ width: "100%", height: "100%", display: "block", objectFit: "fill" }}
        />
      </div>

      {/* ── Row 3: Speed panel with dynamic gauge ── */}
      <div style={{
        flex: "1 1 0",
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#F7F7F7",
      }}>
        {/* Header bar matching Speed.svg style */}
        <div style={{
          height: 32,
          flexShrink: 0,
          background: "#D9D9D9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: 14,
          color: "#333",
          borderBottom: "1px solid #999",
          letterSpacing: "0.5px",
        }}>
          SPEED OVERVIEW
        </div>

        {/* Content: gauge + data */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          padding: "4px 8px",
          gap: 8,
          boxSizing: "border-box",
        }}>
          {/* Gauge (left ~40%) */}
          <div style={{ flex: "0 0 40%", height: "100%", display: "flex", alignItems: "center" }}>
            <SpeedGauge value={rpm} maxValue={500} unit="RPM" alarm={alarm} />
          </div>

          {/* Data labels (right ~60%) */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
          }}>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Engine Speed
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: alarm ? "#E74C3C" : "#333",
              lineHeight: 1,
            }}>
              {Math.round(rpm)}
              <span style={{ fontSize: 14, fontWeight: 400, color: "#888", marginLeft: 4 }}>RPM</span>
            </div>

            <div style={{ height: 1, background: "#DDD", margin: "2px 0" }} />

            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Status
            </div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: alarm ? "#E74C3C" : "#4CAF50",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: alarm ? "#E74C3C" : "#4CAF50",
                flexShrink: 0,
              }} />
              {alarm ? "OVERSPEED" : rpm < 1 ? "IDLE" : "NORMAL"}
            </div>

            {alarm && (
              <div style={{ fontSize: 11, color: "#E74C3C", marginTop: 2 }}>
                ⚠ Exceeds 400 RPM limit
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
