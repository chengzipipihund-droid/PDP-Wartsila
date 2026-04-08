import { useRef, useLayoutEffect, useEffect, useState } from 'react';
import { useStore, getRecommendedSpeed } from '../../stores/useShipStore';
import { useEnergyStore } from '../../../energy/stores/energyStore';

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── AI optimal lever computation ──────────────────────────────────────────────
// Lever range: 0–100, center 50 = neutral (0 thrust).
// Same formula as auto-dock: lever = (recSpeed / 16) * 50 + 50
// This maximises all five AI scores simultaneously:
//   • Speed Opt  — sog matches route speed profile
//   • Fuel Eff   — fuel rate = baseline for that speed (they share the same formula)
//   • Smoothness — we limit swing to ±10 units per update
//   • Corridor   — corridor is heading/position based, speed compliance helps
//   • Timing     — staying on profile keeps ETA on schedule
function computeAILever(ship, energy, prevTarget) {
  const progress  = ship.routeProgress ?? 0;
  const mockShips = ship.mockShips     ?? [];
  const batLevel  = energy.batteryLevel ?? 80;
  const batMode   = energy.batteryMode  ?? 'IDLE';

  // Recommended speed from route profile (same source as AI scoring)
  let recSpeed = getRecommendedSpeed(progress);

  // AIS: nearby vessel on same corridor → cap at safe passing speed
  const near = mockShips.find(s => Math.abs((s.progress ?? 0) - progress) < 0.12);
  if (near) recSpeed = Math.min(recSpeed, 6);

  // Battery critically low while discharging → ease back slightly
  if (batLevel < 20 && batMode === 'DISCHARGING') recSpeed = Math.min(recSpeed, 8);

  // ── Final berth approach: last 1 % only → suggest 50 RPM ────────────
  // Follow the normal route speed profile all the way to progress 0.99.
  // Only in the final 1 % does the cursor ease down to 1.6 kn (≈ 50 RPM,
  // lever ≈ 55, display "+5%") for a controlled berth touch.
  const DOCK_START     = 0.99;
  const DOCK_FINAL_SPD = 1.6;   // kn  →  (1.6/16)*500 = 50 RPM, lever 55
  if (progress >= DOCK_START) {
    const t = (progress - DOCK_START) / (1.0 - DOCK_START); // 0 → 1
    recSpeed = DOCK_FINAL_SPD + (recSpeed - DOCK_FINAL_SPD) * Math.max(0, 1 - Math.pow(t, 0.75));
  }

  // Convert recommended speed → lever position (mirrors auto-dock logic)
  // sog = (rpm / 500) * 16  →  rpm = (recSpeed / 16) * 500
  // lever = (rpm / 500) * 50 + 50  (50 = center/neutral, 100 = full ahead)
  const targetRpm = (recSpeed / 16) * 500;
  let target = (targetRpm / 500) * 50 + 50;

  // Tiny organic jitter so cursor doesn't look frozen (±1 unit)
  // Suppress jitter during the final approach so the guide is rock-steady
  if (progress < DOCK_START) target += (Math.random() - 0.5) * 1;

  target = clamp(Math.round(target), 50, 100); // never recommend astern on route

  // Enforce max ±10 unit swing per update cycle
  if (prevTarget !== null) {
    target = clamp(target, prevTarget - 10, prevTarget + 10);
  }

  return target;
}

// ── Estimated fuel saving: AI pos vs current lever (%) ──────────────────────
// Effective ahead-thrust = (pos - 50) / 50  (0 at neutral, 1 at full ahead)
// Fuel ∝ thrust^1.35 (propulsion cube law approximation)
function estimateSaving(currentPos, aiPos) {
  const curThrust = Math.max(0, (currentPos - 50) / 50);
  const aiThrust  = Math.max(0, (aiPos      - 50) / 50);
  if (curThrust < 0.02) return 0;
  const ratio = Math.pow(aiThrust / Math.max(curThrust, 0.01), 1.35);
  return Math.max(0, Math.round((1 - ratio) * 100));
}

// ════════════════════════════════════════════════════════════════════════════
// LeverPanel
// ════════════════════════════════════════════════════════════════════════════
export default function LeverPanel({ style, layoutView }) {
  const portLever = useStore(s => s.portLever);
  const stbdLever = useStore(s => s.stbdLever);
  const bow1      = useStore(s => s.bow1);
  const bow2      = useStore(s => s.bow2);
  const ship      = useStore(s => s.ship);
  const mockShips = useStore(s => s.mockShips ?? []);

  const rpmPort  = ship.rpmPort  ?? 0;
  const rpmStbd  = ship.rpmStbd  ?? 0;
  const rpmAlarm = ship.rpmAlarm ?? false;

  // ── AI guidance state ─────────────────────────────────────────────────────
  const [aiPos, setAiPos] = useState(null);
  const aiPosRef = useRef(null);

  // Keep refs to live data so the 5-second interval always reads fresh values
  const shipRef   = useRef({ ...ship, mockShips });
  const energyRef = useRef(useEnergyStore.getState());

  // Sync refs on every render (no extra subscriptions needed)
  useEffect(() => {
    shipRef.current = { ...ship, mockShips };
  });
  useEffect(() => {
    return useEnergyStore.subscribe(s => { energyRef.current = s; });
  }, []);

  // 5-second AI tick
  useEffect(() => {
    const tick = () => {
      const next = computeAILever(shipRef.current, energyRef.current, aiPosRef.current);
      aiPosRef.current = next;
      setAiPos(next);
    };
    tick();                          // fire immediately on mount
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      background: 'var(--pnl)',
      borderBottom: '1px solid var(--brd)',
      borderRight: layoutView === 'B' ? '1px solid var(--brd)' : 'none',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        fontSize: 7, textTransform: 'uppercase', letterSpacing: 2,
        color: 'var(--tx3)', fontFamily: 'var(--mono)',
        padding: '6px 12px 2px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>Lever control — CPP &amp; Bow Thrusters</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {aiPos !== null && (
            <span style={{ color: 'rgba(34,214,138,0.85)', fontSize: 7, fontFamily: 'var(--mono)' }}>
              ◆ AI guide: {aiPos - 50 > 0 ? '+' : ''}{aiPos - 50}%
            </span>
          )}
          {rpmAlarm && (
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>⚠ OVERSPEED</span>
          )}
        </span>
      </div>

      {/* CPP1 | CPP2 | Bow T1 | Bow T2 */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: layoutView === 'B' ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
        gridTemplateRows: layoutView === 'B' ? '1fr 1fr' : '1fr',
        gap: 0,
      }}>
        <CPPGauge
          label="CPP 1"
          value={portLever}
          displayValue={Math.round(rpmPort)}
          displayUnit="rpm"
          alarm={rpmAlarm}
          topLabel="AHEAD"
          bottomLabel="ASTERN"
          aiPos={aiPos}
        />
        <CPPGauge
          label="CPP 2"
          value={stbdLever}
          displayValue={Math.round(rpmStbd)}
          displayUnit="rpm"
          alarm={rpmAlarm}
          topLabel="AHEAD"
          bottomLabel="ASTERN"
          aiPos={aiPos}
        />
        <BowGauge label="Bow T1" value={bow1} />
        <BowGauge label="Bow T2" value={bow2} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 12px', borderTop: '1px solid var(--brd)',
        fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--tx3)',
      }}>
        <span>Mode: <b style={{ color: 'var(--grn)' }}>Transit ECO</b></span>
        <span>Rudder: <b style={{ color: 'var(--tx)' }}>{ship.rudderAngle > 0 ? '+' : ''}{ship.rudderAngle.toFixed(0)}°</b></span>
        <span>SOG: <b style={{ color: ship.sog > 14 ? 'var(--amb)' : 'var(--tx)' }}>{ship.sog.toFixed(1)} kn</b></span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BowGauge — unchanged from original
// ════════════════════════════════════════════════════════════════════════════
function BowGauge({ label, value }) {
  const canvasRef = useRef(null);
  const dimRef    = useRef({ w: 0, h: 0, ctx: null, ready: false });

  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const d   = devicePixelRatio || 1;
    const r   = c.parentElement.getBoundingClientRect();
    const w   = r.width, h = r.height;
    c.width   = Math.round(w * d);
    c.height  = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    dimRef.current = { w, h, ctx, ready: true };
  }, []);

  useEffect(() => {
    const { w, h, ctx, ready } = dimRef.current;
    if (!ready || !ctx) return;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.50;
    const R  = Math.min(cx, cy) * 0.80;
    const SPAN   = (4 / 3) * Math.PI;
    const startA = -Math.PI / 2 - SPAN / 2;
    const endA   = -Math.PI / 2 + SPAN / 2;
    const midA   = -Math.PI / 2;
    const angle = startA + ((value + 100) / 200) * SPAN;

    ctx.beginPath(); ctx.arc(cx, cy, R, startA, endA);
    ctx.strokeStyle = 'rgba(60,90,140,0.12)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();

    const alarmArc = SPAN * 0.2;
    ctx.lineCap = 'butt'; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,80,80,0.07)';
    ctx.beginPath(); ctx.arc(cx, cy, R, startA, startA + alarmArc); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, endA - alarmArc, endA); ctx.stroke();

    if (Math.abs(value) > 1) {
      const [aS, aE] = value < 0 ? [angle, midA] : [midA, angle];
      ctx.beginPath(); ctx.arc(cx, cy, R, aS, aE);
      ctx.strokeStyle = value > 0 ? 'rgba(34,214,138,0.50)' : 'rgba(59,139,255,0.50)';
      ctx.lineWidth = 7; ctx.lineCap = 'butt'; ctx.stroke();
    }

    ctx.lineWidth = 1; ctx.lineCap = 'butt';
    [-100, -50, 0, 50, 100].forEach(pct => {
      const a  = startA + ((pct + 100) / 200) * SPAN;
      const r1 = R - 5, r2 = R + 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.strokeStyle = pct === 0 ? 'rgba(100,130,170,0.5)' : 'rgba(100,130,170,0.2)';
      ctx.stroke();
    });

    const hColor = Math.abs(value) > 65 ? '#f0a030'
      : value > 0 ? '#22d68a' : value < 0 ? '#3b8bff' : 'rgba(100,130,170,0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R * 0.68, cy + Math.sin(angle) * R * 0.68);
    ctx.strokeStyle = hColor; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();

    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = hColor; ctx.fill();

    ctx.font = '500 6px "JetBrains Mono"'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(59,139,255,0.45)';
    ctx.fillText('P', cx + Math.cos(startA) * (R + 9), cy + Math.sin(startA) * (R + 9) + 3);
    ctx.fillStyle = 'rgba(34,214,138,0.45)';
    ctx.fillText('S', cx + Math.cos(endA) * (R + 9), cy + Math.sin(endA) * (R + 9) + 3);
  }, [value]);

  const valColor = Math.abs(value) > 65 ? 'var(--amb)'
    : value > 0 ? 'var(--grn)' : value < 0 ? 'var(--blu)' : 'var(--tx2)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 6px', borderRight: '1px solid var(--brd)' }}>
      <div style={{ fontSize: 7, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--tx3)' }}>{label}</div>
      <canvas ref={canvasRef} style={{ width: '100%', flex: 1 }} />
      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', color: valColor, lineHeight: 1.2 }}>
        {value >= 0 ? '+' : ''}{Math.round(value)}<span style={{ fontSize: 7, color: 'var(--tx2)', fontWeight: 400 }}> %</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CPPGauge — with AI guidance cursor + proximity popup
// ════════════════════════════════════════════════════════════════════════════
function CPPGauge({ label, value, displayValue, displayUnit, alarm, topLabel, bottomLabel, aiPos }) {
  const canvasRef  = useRef(null);
  const dimRef     = useRef({ w: 0, h: 0, ctx: null, ready: false });

  // ── Proximity popup state ─────────────────────────────────────────────
  // Show popup when lever within PROX_THRESHOLD of aiPos
  const PROX_THRESHOLD = 8;        // % lever distance
  const [popup, setPopup]         = useState(null);   // null | { saving, opacity }
  const popupTimerRef             = useRef(null);
  const wasNearRef                = useRef(false);     // debounce re-trigger

  const saving = aiPos !== null ? estimateSaving(value, aiPos) : 0;
  const isNear = aiPos !== null && Math.abs(value - aiPos) < PROX_THRESHOLD;

  useEffect(() => {
    if (isNear && !wasNearRef.current && saving > 0) {
      wasNearRef.current = true;
      clearTimeout(popupTimerRef.current);
      // Show popup
      setPopup({ saving });
      // Begin 5s fade then hide
      popupTimerRef.current = setTimeout(() => setPopup(null), 5200);
    }
    if (!isNear && wasNearRef.current) {
      wasNearRef.current = false;   // reset so it can trigger again
    }
    return () => clearTimeout(popupTimerRef.current);
  }, [isNear, saving]);

  // ── Canvas sizing ─────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const d   = devicePixelRatio || 1;
    const r   = c.parentElement.getBoundingClientRect();
    const w   = r.width;
    const h   = r.height;
    c.width   = Math.round(w * d);
    c.height  = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    dimRef.current = { w, h, ctx, ready: true };
  }, []);

  // ── Canvas draw ───────────────────────────────────────────────────────
  useEffect(() => {
    const { w, h, ctx, ready } = dimRef.current;
    if (!ready || !ctx) return;

    ctx.clearRect(0, 0, w, h);

    const cx     = w / 2;
    const trackW = 28;
    const trackH = h * 0.72;
    const trackY = (h - trackH) / 2;
    const midY   = trackY + trackH / 2;

    // Track background
    ctx.fillStyle = 'rgba(60,90,140,0.06)';
    ctx.beginPath(); ctx.roundRect(cx - trackW / 2, trackY, trackW, trackH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(60,90,140,0.15)'; ctx.lineWidth = 1; ctx.stroke();

    // Neutral line
    ctx.beginPath(); ctx.moveTo(cx - trackW / 2, midY); ctx.lineTo(cx + trackW / 2, midY);
    ctx.strokeStyle = 'rgba(100,130,170,0.2)'; ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);

    // Direction labels
    ctx.font = '500 6px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(100,130,170,0.25)'; ctx.textAlign = 'center';
    ctx.fillText(topLabel,    cx, trackY - 4);
    ctx.fillText(bottomLabel, cx, trackY + trackH + 12);

    // Fill from center
    const handleY = trackY + trackH * (1 - value / 100);
    const fillTop = Math.min(handleY, midY);
    const fillBot = Math.max(handleY, midY);
    ctx.fillStyle = value > 50
      ? 'rgba(34,214,138,0.10)'
      : value < 50 ? 'rgba(59,139,255,0.10)' : 'transparent';
    ctx.fillRect(cx - trackW / 2 + 1, fillTop, trackW - 2, fillBot - fillTop);

    // Alarm zones
    ctx.fillStyle = 'rgba(255,80,80,0.04)';
    ctx.fillRect(cx - trackW / 2 + 1, trackY, trackW - 2, trackH * 0.2);
    ctx.fillRect(cx - trackW / 2 + 1, trackY + trackH * 0.8, trackW - 2, trackH * 0.2);

    // ── AI guidance cursor ────────────────────────────────────────────────
    if (aiPos !== null) {
      const aiY   = trackY + trackH * (1 - aiPos / 100);
      const near  = Math.abs(value - aiPos) < PROX_THRESHOLD;
      const alpha = near ? 0.95 : 0.65;

      // Side wings extending beyond track
      const wingL = cx - trackW / 2 - 14;
      const wingR = cx + trackW / 2 + 14;

      // Glow halo behind the cursor line
      const grd = ctx.createLinearGradient(wingL, 0, wingR, 0);
      grd.addColorStop(0,   `rgba(34,214,138,0)`);
      grd.addColorStop(0.2, `rgba(34,214,138,${near ? 0.25 : 0.12})`);
      grd.addColorStop(0.5, `rgba(34,214,138,${near ? 0.35 : 0.18})`);
      grd.addColorStop(0.8, `rgba(34,214,138,${near ? 0.25 : 0.12})`);
      grd.addColorStop(1,   `rgba(34,214,138,0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(wingL, aiY - 5, wingR - wingL, 10);

      // Horizontal cursor line
      ctx.beginPath();
      ctx.moveTo(wingL, aiY); ctx.lineTo(wingR, aiY);
      ctx.strokeStyle = `rgba(34,214,138,${alpha})`;
      ctx.lineWidth   = near ? 2 : 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Left inward arrow  ▶
      ctx.beginPath();
      ctx.moveTo(wingL,          aiY);
      ctx.lineTo(wingL + 7,      aiY - 5);
      ctx.lineTo(wingL + 7,      aiY + 5);
      ctx.closePath();
      ctx.fillStyle = `rgba(34,214,138,${alpha})`;
      ctx.fill();

      // Right inward arrow  ◀
      ctx.beginPath();
      ctx.moveTo(wingR,          aiY);
      ctx.lineTo(wingR - 7,      aiY - 5);
      ctx.lineTo(wingR - 7,      aiY + 5);
      ctx.closePath();
      ctx.fill();

      // "AI" label to the right of cursor
      ctx.font      = `600 7px "JetBrains Mono"`;
      ctx.fillStyle = `rgba(34,214,138,${alpha})`;
      ctx.textAlign = 'left';
      ctx.fillText('AI', wingR + 2, aiY + 3);

      // Percentage label to the left
      ctx.textAlign = 'right';
      const aiDisp = aiPos - 50;
      ctx.fillText(`${aiDisp > 0 ? '+' : ''}${aiDisp}%`, wingL - 2, aiY + 3);
    }

    // ── Handle ────────────────────────────────────────────────────────────
    const hColor = alarm       ? '#ff4444'
      : value > 65 ? '#f0a030'
      : value > 50 ? '#22d68a'
      : value < 35 ? '#f0a030'
      : value < 50 ? '#3b8bff'
      : 'var(--tx2)';

    ctx.fillStyle = hColor;
    ctx.beginPath();
    ctx.roundRect(cx - trackW / 2 - 5, handleY - 6, trackW + 10, 12, 4);
    ctx.fill();

    if (alarm) {
      ctx.strokeStyle = 'rgba(255,60,60,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - trackW / 2 - 6, handleY - 7, trackW + 12, 14, 5);
      ctx.stroke();
    }

    ctx.font = '600 7px "JetBrains Mono"';
    ctx.fillStyle = alarm ? '#fff' : '#080e1c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((displayValue >= 0 ? '+' : '') + displayValue, cx, handleY);
    ctx.textBaseline = 'alphabetic';

  }, [value, displayValue, alarm, topLabel, bottomLabel, aiPos]);

  const valColor = value > 65 ? 'var(--amb)' : value > 50 ? 'var(--grn)'
    : value < 35 ? 'var(--amb)' : value < 50 ? 'var(--blu)' : 'var(--tx2)';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 6px', borderRight: '1px solid var(--brd)' }}>
      <div style={{ fontSize: 7, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--tx3)' }}>
        {label}
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', flex: 1 }} />
      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', color: valColor, lineHeight: 1.2 }}>
        {value > 50 ? '+' : value < 50 ? '-' : ''}{Math.round(Math.abs(value - 50))}<span style={{ fontSize: 7, color: 'var(--tx2)', fontWeight: 400 }}>%</span>
        <span style={{ fontSize: 7, color: 'var(--tx3)', fontWeight: 400, marginLeft: 4 }}>({Math.abs(displayValue)} {displayUnit})</span>
      </div>

      {/* ── Proximity popup ── */}
      {popup && (
        <div
          key={popup.saving}           /* remount = restart fade animation */
          style={{
            position:  'absolute',
            bottom:    '100%',
            left:      '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background:   'rgba(34,214,138,0.92)',
            color:        '#061a10',
            fontFamily:   'var(--mono)',
            fontSize:     9,
            fontWeight:   700,
            borderRadius: 6,
            padding:      '5px 10px',
            whiteSpace:   'nowrap',
            pointerEvents:'none',
            boxShadow:    '0 0 14px rgba(34,214,138,0.5)',
            animation:    'aiPopupFade 5.2s ease-out forwards',
            zIndex:       200,
          }}
        >
          ◆ Optimal lever reached
          {popup.saving > 0 && (
            <span> — saves ~{popup.saving}% fuel</span>
          )}
        </div>
      )}
    </div>
  );
}
