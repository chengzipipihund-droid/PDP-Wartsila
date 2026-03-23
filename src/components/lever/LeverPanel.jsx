import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { useStore } from '../../stores/useShipStore';

export default function LeverPanel() {
  const portLever = useStore(s => s.portLever);
  const stbdLever = useStore(s => s.stbdLever);
  const ship      = useStore(s => s.ship);

  const rpmPort  = ship.rpmPort  ?? 0;
  const rpmStbd  = ship.rpmStbd  ?? 0;
  const rpmAlarm = ship.rpmAlarm ?? false;

  return (
    <div style={{ background: 'var(--pnl)', borderBottom: '1px solid var(--brd)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', padding: '6px 12px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>CPP lever control — propeller RPM</span>
        {rpmAlarm && (
          <span style={{ color: 'var(--red)', letterSpacing: 1, animation: 'none', fontWeight: 600 }}>
            ⚠ OVERSPEED
          </span>
        )}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <CPPGauge label="Port CPP" value={portLever} rpm={rpmPort} alarm={rpmAlarm} />
        <CPPGauge label="Stbd CPP" value={stbdLever} rpm={rpmStbd} alarm={rpmAlarm} />
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

function CPPGauge({ label, value, rpm, alarm }) {
  const canvasRef = useRef(null);
  // Store canvas dimensions to avoid re-querying layout on every draw
  const dimRef    = useRef({ w: 0, h: 0, ctx: null, ready: false });

  // ── 仅在挂载时测量并设置 canvas 尺寸（修复自动缩放 bug）────────────
  // 使用 useLayoutEffect 确保在首次绘制前尺寸已经就绪
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
  }, []); // 只运行一次，不随值变化

  // ── 当 RPM / lever / alarm 变化时重绘（不重新测量布局）────────────────
  useEffect(() => {
    const { w, h, ctx, ready } = dimRef.current;
    if (!ready || !ctx) return;

    ctx.clearRect(0, 0, w, h);

    const cx     = w / 2;
    const trackW = 36;
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

    // Labels
    ctx.font = '500 7px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(100,130,170,0.25)'; ctx.textAlign = 'center';
    ctx.fillText('AHEAD', cx, trackY - 4);
    ctx.fillText('ASTERN', cx, trackY + trackH + 12);

    // RPM scale marks: 0 / 250 / 500
    const rpmLabels = [[0, midY], [250, trackY + trackH * 0.25], [500, trackY]];
    rpmLabels.forEach(([r, y]) => {
      ctx.fillStyle = 'rgba(100,130,170,0.18)';
      ctx.font = '400 6px "JetBrains Mono"'; ctx.textAlign = 'left';
      ctx.fillText(r, cx + trackW / 2 + 5, y + 3);
      ctx.beginPath(); ctx.moveTo(cx - trackW / 2, y); ctx.lineTo(cx - trackW / 2 + 4, y);
      ctx.strokeStyle = 'rgba(60,90,140,0.15)'; ctx.lineWidth = 0.5; ctx.stroke();
    });

    // Notch marks
    for (let i = 0; i <= 10; i++) {
      const ny = trackY + trackH * i / 10;
      ctx.beginPath(); ctx.moveTo(cx - trackW / 2, ny); ctx.lineTo(cx - trackW / 2 + 3, ny);
      ctx.strokeStyle = 'rgba(60,90,140,0.08)'; ctx.lineWidth = 0.5; ctx.stroke();
    }

    // Fill from center
    const handleY = trackY + trackH * (1 - value / 100);
    const fillTop = Math.min(handleY, midY);
    const fillBot = Math.max(handleY, midY);
    ctx.fillStyle = value > 50
      ? 'rgba(34,214,138,0.10)'
      : value < 50 ? 'rgba(59,139,255,0.10)' : 'transparent';
    ctx.fillRect(cx - trackW / 2 + 1, fillTop, trackW - 2, fillBot - fillTop);

    // 400 RPM alarm zone highlight
    // shade the top 20% of track (400–500 RPM zone)
    ctx.fillStyle = 'rgba(255,80,80,0.04)';
    ctx.fillRect(cx - trackW / 2 + 1, trackY, trackW - 2, trackH * 0.2);
    // shade the bottom 20% (astern 400–500 zone)
    ctx.fillRect(cx - trackW / 2 + 1, trackY + trackH * 0.8, trackW - 2, trackH * 0.2);

    // Handle color
    const absRpm   = Math.abs(rpm);
    const hColor   = alarm
      ? '#ff4444'
      : absRpm > 300 ? '#f0a030'
      : value > 50  ? '#22d68a'
      : value < 50  ? '#3b8bff'
      : 'var(--tx2)';

    ctx.fillStyle = hColor;
    ctx.beginPath(); ctx.roundRect(cx - trackW / 2 - 6, handleY - 7, trackW + 12, 14, 4);
    ctx.fill();

    // Alarm border ring
    if (alarm) {
      ctx.strokeStyle = 'rgba(255,60,60,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(cx - trackW / 2 - 7, handleY - 8, trackW + 14, 16, 5);
      ctx.stroke();
    }

    // Handle value: show RPM
    ctx.font = '600 8px "JetBrains Mono"';
    ctx.fillStyle = alarm ? '#fff' : '#080e1c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const rpmText = (rpm >= 0 ? '+' : '') + Math.round(rpm);
    ctx.fillText(rpmText, cx, handleY);

    ctx.textBaseline = 'alphabetic';
  }, [value, rpm, alarm]); // 仅在值变化时重绘，无布局回流

  const thrustColor = value > 70 ? 'var(--amb)' : value > 50 ? 'var(--grn)' : value < 30 ? 'var(--amb)' : value < 50 ? 'var(--blu)' : 'var(--tx2)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px', borderRight: '1px solid var(--brd)' }}>
      <div style={{ fontSize: 7, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--tx3)' }}>{label}</div>
      <canvas ref={canvasRef} style={{ width: '100%', flex: 1 }} />
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)', color: thrustColor, lineHeight: 1.2 }}>
        {Math.round(Math.abs(rpm))}<span style={{ fontSize: 8, color: 'var(--tx2)', fontWeight: 400 }}> rpm</span>
      </div>
    </div>
  );
}
