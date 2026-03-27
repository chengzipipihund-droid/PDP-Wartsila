import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { useStore } from '../../stores/useShipStore';

export default function TopBar() {
  const ship        = useStore(s => s.ship);
  const energy      = useStore(s => s.energy);
  const autoMode    = useStore(s => s.autoMode);
  const setAutoMode = useStore(s => s.setAutoMode);
  const resetVoyage = useStore(s => s.resetVoyage);
  const portLever   = useStore(s => s.portLever);
  const stbdLever   = useStore(s => s.stbdLever);
  const docked      = useStore(s => s.docked);

  const s = {
    top: {
      gridColumn: '1/-1', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 14px',
      background: 'var(--pnl)', borderBottom: '1px solid var(--brd)',
    },
    logo:  { fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 11, letterSpacing: 2, color: 'var(--grn)', textTransform: 'uppercase' },
    badge: { fontSize: 8, padding: '2px 8px', borderRadius: 3, fontFamily: 'var(--mono)', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' },
    stat:  { textAlign: 'center' },
    label: { display: 'block', fontSize: 7, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--tx3)', fontFamily: 'var(--mono)' },
    val:   { fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)' },
    unit:  { fontSize: 7, color: 'var(--tx2)', fontWeight: 400 },
  };

  const avgRpm = (Math.abs(ship.rpmPort) + Math.abs(ship.rpmStbd)) / 2;

  return (
    <div style={s.top}>

      {/* ── Left: brand + mode badges ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={s.logo}>SmartNav</div>
        <div style={{ ...s.badge, background: 'var(--gd)', color: 'var(--grn)' }}>Hybrid Eco</div>
        <div style={{ ...s.badge, background: 'rgba(167,139,250,0.1)', color: 'var(--pur)' }}>Finnsirius</div>
        {autoMode && (
          <div style={{ ...s.badge, background: 'rgba(34,214,138,0.12)', color: 'var(--grn)', border: '1px solid rgba(34,214,138,0.4)' }}>
            AUTO
          </div>
        )}
        {docked && (
          <div style={{ ...s.badge, background: 'rgba(59,139,255,0.12)', color: 'var(--blu)', border: '1px solid rgba(59,139,255,0.4)' }}>
            MOORED
          </div>
        )}
      </div>

      {/* ── Center: nav stats ── */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={s.stat}><span style={s.label}>SOG</span><span style={s.val}>{ship.sog.toFixed(1)}<span style={s.unit}> kn</span></span></div>
        <div style={s.stat}><span style={s.label}>HDG</span><span style={s.val}>{Math.round(ship.heading)}°</span></div>
        <div style={s.stat}><span style={s.label}>ETA</span><span style={s.val}>07:15<span style={s.unit}> EET</span></span></div>
        <div style={s.stat}><span style={s.label}>Fuel</span><span style={{ ...s.val, color: 'var(--grn)' }}>{energy.fuelRate.toFixed(1)}<span style={s.unit}> t/d</span></span></div>
      </div>

      {/* ── Right: lever%, RPM gauge, AUTO button ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Lever % indicator */}
        <LeverGauge portLever={portLever} stbdLever={stbdLever} />

        {/* RPM arc gauge */}
        <RpmGauge rpm={avgRpm} alarm={ship.rpmAlarm} />

        {/* Reset voyage — small */}
        <button
          onClick={resetVoyage}
          title="Reset voyage"
          style={{
            fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
            padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
            letterSpacing: 1, textTransform: 'uppercase',
            background: 'rgba(60,90,140,0.12)',
            border: '1px solid rgba(60,90,140,0.28)',
            color: 'rgba(120,150,190,0.65)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(160,190,230,0.9)'; e.currentTarget.style.borderColor = 'rgba(80,120,180,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(120,150,190,0.65)'; e.currentTarget.style.borderColor = 'rgba(60,90,140,0.28)'; }}
        >
          ↺
        </button>

        {/* AUTO mode toggle — prominent */}
        <button
          onClick={() => !docked && setAutoMode(!autoMode)}
          style={{
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
            padding: '5px 16px', borderRadius: 5,
            cursor: docked ? 'not-allowed' : 'pointer',
            letterSpacing: 2, textTransform: 'uppercase',
            background: autoMode
              ? 'rgba(34,214,138,0.18)'
              : 'rgba(30,50,90,0.5)',
            border: `1.5px solid ${autoMode ? '#22d68a' : 'rgba(80,110,160,0.5)'}`,
            color: autoMode ? '#22d68a' : 'rgba(160,180,210,0.85)',
            boxShadow: autoMode
              ? '0 0 14px rgba(34,214,138,0.35), inset 0 0 8px rgba(34,214,138,0.08)'
              : 'none',
            opacity: docked ? 0.35 : 1,
            transition: 'all 0.2s',
            minWidth: 80,
          }}
        >
          {autoMode ? '● AUTO' : '○ AUTO'}
        </button>

      </div>
    </div>
  );
}

// ── Compact lever% gauge — two side-by-side vertical bars ────────
function LeverGauge({ portLever, stbdLever }) {
  // Normalise: lever 50 = neutral (0%), 100 = full ahead (+100%), 0 = full astern (-100%)
  const portPct = ((portLever - 50) / 50) * 100;
  const stbdPct = ((stbdLever - 50) / 50) * 100;

  const barColor = pct => pct > 10 ? '#22d68a' : pct < -10 ? '#3b8bff' : 'rgba(100,130,170,0.35)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 6, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(100,130,170,0.45)', fontFamily: 'var(--mono)' }}>
        Lever
      </span>
      <div style={{ display: 'flex', gap: 3 }}>
        {[['P', portPct], ['S', stbdPct]].map(([lbl, pct]) => (
          <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            {/* Vertical bar: upper half = ahead, lower half = astern */}
            <div style={{
              width: 14, height: 22,
              background: 'rgba(60,90,140,0.12)',
              border: '1px solid rgba(60,90,140,0.2)',
              borderRadius: 2,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Ahead fill (grows upward from centre) */}
              {pct > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '50%', left: 0, right: 0,
                  height: `${Math.min(50, pct / 2)}%`,
                  background: barColor(pct), opacity: 0.75,
                }} />
              )}
              {/* Astern fill (grows downward from centre) */}
              {pct < 0 && (
                <div style={{
                  position: 'absolute',
                  top: '50%', left: 0, right: 0,
                  height: `${Math.min(50, Math.abs(pct) / 2)}%`,
                  background: barColor(pct), opacity: 0.75,
                }} />
              )}
              {/* Centre line (neutral) */}
              <div style={{
                position: 'absolute', top: '50%', left: 0, right: 0,
                height: 1, background: 'rgba(100,130,170,0.25)',
              }} />
            </div>
            <span style={{ fontSize: 5, color: 'rgba(100,130,170,0.4)', fontFamily: 'var(--mono)' }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compact RPM arc gauge (canvas, 36×36) ────────────────────────
function RpmGauge({ rpm, alarm }) {
  const canvasRef = useRef(null);
  const dimRef    = useRef({ ctx: null, size: 0, ready: false });

  useLayoutEffect(() => {
    const c   = canvasRef.current;
    const ctx = c.getContext('2d');
    const d   = devicePixelRatio || 1;
    const size = 36;
    c.width  = Math.round(size * d);
    c.height = Math.round(size * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    dimRef.current = { ctx, size, ready: true };
  }, []);

  useEffect(() => {
    const { ctx, size, ready } = dimRef.current;
    if (!ready) return;

    const cx = size / 2;
    const cy = size / 2 + 2;
    const r  = 13;
    const startAngle = Math.PI * 0.75;    // 7 o'clock
    const endAngle   = Math.PI * 2.25;   // 5 o'clock
    const fullAngle  = endAngle - startAngle;

    ctx.clearRect(0, 0, size, size);

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(60,90,140,0.22)';
    ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.stroke();

    // Alarm zone: 400–500 RPM (80–100 % of arc)
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle + fullAngle * 0.80, endAngle);
    ctx.strokeStyle = 'rgba(255,80,80,0.18)';
    ctx.lineWidth = 3.5; ctx.stroke();

    // Value arc
    const pct = Math.min(1, Math.max(0, rpm / 500));
    if (pct > 0.005) {
      const arcColor = alarm     ? '#ff4444'
        : rpm > 400              ? '#f0a030'
        : rpm > 200              ? '#22d68a'
        :                          '#3b8bff';
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + fullAngle * pct);
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = 3.5; ctx.stroke();
    }

    // RPM value (centre text)
    const rpmRounded = Math.round(rpm);
    ctx.font = `600 ${rpmRounded > 99 ? 7 : 8}px "JetBrains Mono"`;
    ctx.fillStyle  = alarm ? '#ff4444' : '#c8d4e8';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rpmRounded, cx, cy - 1);

    // "RPM" sub-label
    ctx.font = '400 5px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(100,130,170,0.35)';
    ctx.fillText('RPM', cx, cy + 8);
  }, [rpm, alarm]);

  return <canvas ref={canvasRef} style={{ width: 36, height: 36 }} />;
}
