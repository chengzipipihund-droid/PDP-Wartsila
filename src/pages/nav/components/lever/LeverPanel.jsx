import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { useStore } from '../../stores/useShipStore';

export default function LeverPanel() {
  const portLever = useStore(s => s.portLever);
  const stbdLever = useStore(s => s.stbdLever);
  const bow1      = useStore(s => s.bow1);
  const bow2      = useStore(s => s.bow2);
  const ship      = useStore(s => s.ship);

  const rpmPort  = ship.rpmPort  ?? 0;
  const rpmStbd  = ship.rpmStbd  ?? 0;
  const rpmAlarm = ship.rpmAlarm ?? false;

  return (
    <div style={{ background: 'var(--pnl)', borderBottom: '1px solid var(--brd)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', padding: '6px 12px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Lever control — CPP &amp; Bow Thrusters</span>
        {rpmAlarm && (
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>⚠ OVERSPEED</span>
        )}
      </div>

      {/* CPP1 | CPP2 | Bow T1 | Bow T2 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0 }}>
        <CPPGauge
          label="CPP 1"
          value={portLever}
          displayValue={Math.round(rpmPort)}
          displayUnit="rpm"
          alarm={rpmAlarm}
          topLabel="AHEAD"
          bottomLabel="ASTERN"
        />
        <CPPGauge
          label="CPP 2"
          value={stbdLever}
          displayValue={Math.round(rpmStbd)}
          displayUnit="rpm"
          alarm={rpmAlarm}
          topLabel="AHEAD"
          bottomLabel="ASTERN"
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

// ── Bow Thruster circular gauge ──────────────────────────────────────────────
// value: -100 (full PORT) … 0 (neutral) … +100 (full STBD)
// Draws a 240° arc dial centered on "up", with a rotating needle.
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

    // Arc spans 240° centred on canvas "up" (-π/2)
    const SPAN   = (4 / 3) * Math.PI;          // 240°
    const startA = -Math.PI / 2 - SPAN / 2;    // -7π/6  (lower-left endpoint)
    const endA   = -Math.PI / 2 + SPAN / 2;    // +π/6   (lower-right endpoint)
    const midA   = -Math.PI / 2;               // neutral (straight up)

    // Map value -100..100 → startA..endA
    const angle = startA + ((value + 100) / 200) * SPAN;

    // ── Track background arc ──────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, R, startA, endA);
    ctx.strokeStyle = 'rgba(60,90,140,0.12)';
    ctx.lineWidth   = 10;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // ── Alarm zone highlights (outer 20% each side) ───────────────────────
    const alarmArc = SPAN * 0.2;
    ctx.lineCap = 'butt';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255,80,80,0.07)';
    ctx.beginPath(); ctx.arc(cx, cy, R, startA, startA + alarmArc); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, endA - alarmArc, endA);     ctx.stroke();

    // ── Filled arc from neutral to current position ───────────────────────
    if (Math.abs(value) > 1) {
      const [aS, aE] = value < 0 ? [angle, midA] : [midA, angle];
      ctx.beginPath();
      ctx.arc(cx, cy, R, aS, aE);
      ctx.strokeStyle = value > 0 ? 'rgba(34,214,138,0.50)' : 'rgba(59,139,255,0.50)';
      ctx.lineWidth   = 7;
      ctx.lineCap     = 'butt';
      ctx.stroke();
    }

    // ── Tick marks at ±50% and ±100% ─────────────────────────────────────
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

    // ── Needle ────────────────────────────────────────────────────────────
    const hColor = Math.abs(value) > 65 ? '#f0a030'
      : value > 0 ? '#22d68a'
      : value < 0 ? '#3b8bff'
      : 'rgba(100,130,170,0.6)';

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R * 0.68, cy + Math.sin(angle) * R * 0.68);
    ctx.strokeStyle = hColor;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = hColor;
    ctx.fill();

    // ── PORT / STBD end labels ─────────────────────────────────────────────
    ctx.font      = '500 6px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(59,139,255,0.45)';
    ctx.fillText('P', cx + Math.cos(startA) * (R + 9), cy + Math.sin(startA) * (R + 9) + 3);
    ctx.fillStyle = 'rgba(34,214,138,0.45)';
    ctx.fillText('S', cx + Math.cos(endA)   * (R + 9), cy + Math.sin(endA)   * (R + 9) + 3);

  }, [value]);

  const valColor = Math.abs(value) > 65 ? 'var(--amb)'
    : value > 0 ? 'var(--grn)'
    : value < 0 ? 'var(--blu)'
    : 'var(--tx2)';

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

function CPPGauge({ label, value, displayValue, displayUnit, alarm, topLabel, bottomLabel }) {
  const canvasRef = useRef(null);
  const dimRef    = useRef({ w: 0, h: 0, ctx: null, ready: false });

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
    ctx.beginPath(); ctx.roundRect(cx - trackW / 2, trackY, trackW, trackH, 6);
    ctx.fill();
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

    // Alarm zone highlight (top/bottom 20%)
    ctx.fillStyle = 'rgba(255,80,80,0.04)';
    ctx.fillRect(cx - trackW / 2 + 1, trackY, trackW - 2, trackH * 0.2);
    ctx.fillRect(cx - trackW / 2 + 1, trackY + trackH * 0.8, trackW - 2, trackH * 0.2);

    // Handle
    const hColor = alarm
      ? '#ff4444'
      : value > 65 ? '#f0a030'
      : value > 50 ? '#22d68a'
      : value < 35 ? '#f0a030'
      : value < 50 ? '#3b8bff'
      : 'var(--tx2)';

    ctx.fillStyle = hColor;
    ctx.beginPath(); ctx.roundRect(cx - trackW / 2 - 5, handleY - 6, trackW + 10, 12, 4);
    ctx.fill();

    if (alarm) {
      ctx.strokeStyle = 'rgba(255,60,60,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(cx - trackW / 2 - 6, handleY - 7, trackW + 12, 14, 5);
      ctx.stroke();
    }

    // Value in handle
    ctx.font = '600 7px "JetBrains Mono"';
    ctx.fillStyle = alarm ? '#fff' : '#080e1c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((displayValue >= 0 ? '+' : '') + displayValue, cx, handleY);
    ctx.textBaseline = 'alphabetic';
  }, [value, displayValue, alarm, topLabel, bottomLabel]);

  const valColor = value > 65 ? 'var(--amb)' : value > 50 ? 'var(--grn)' : value < 35 ? 'var(--amb)' : value < 50 ? 'var(--blu)' : 'var(--tx2)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 6px', borderRight: '1px solid var(--brd)' }}>
      <div style={{ fontSize: 7, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--tx3)' }}>{label}</div>
      <canvas ref={canvasRef} style={{ width: '100%', flex: 1 }} />
      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', color: valColor, lineHeight: 1.2 }}>
        {Math.abs(displayValue)}<span style={{ fontSize: 7, color: 'var(--tx2)', fontWeight: 400 }}> {displayUnit}</span>
      </div>
    </div>
  );
}
