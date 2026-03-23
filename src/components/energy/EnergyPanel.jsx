import React, { useRef, useEffect } from 'react';
import { useStore } from '../../stores/useShipStore';

export default function EnergyPanel() {
  const energy = useStore(s => s.energy);
  const ship   = useStore(s => s.ship);

  const fuelColor = energy.fuelRate > 48 ? 'var(--red)'
    : energy.fuelRate > 38 ? 'var(--amb)'
    : 'var(--grn)';

  const effColor = energy.efficiency > 120 ? 'var(--red)'
    : energy.efficiency > 90 ? 'var(--amb)'
    : 'var(--grn)';

  return (
    <div style={{ background: 'var(--pnl)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      {/* ── Hero metrics ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
          Energy dashboard
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <MetricCard label="Fuel rate"   value={energy.fuelRate.toFixed(1)}   unit="t/d"   color={fuelColor} />
          <MetricCard label="Efficiency"  value={energy.efficiency > 0 ? energy.efficiency.toFixed(0) : '—'} unit="kg/NM" color={effColor} />
          <MetricCard label="CO₂ saved"   value="2.4"                           unit="t"     color="var(--grn)" />
          <MetricCard label="Battery SOC" value={energy.batterySoc}             unit="%"     color="var(--pur)" />
        </div>
      </div>

      {/* ── RPM bar ── */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
            Propeller RPM
          </span>
          {ship.rpmAlarm && (
            <span style={{ fontSize: 7, fontFamily: 'var(--mono)', color: 'var(--red)', fontWeight: 600 }}>
              ⚠ OVERSPEED
            </span>
          )}
        </div>
        <RpmBar label="PORT" rpm={ship.rpmPort ?? 0} alarm={ship.rpmAlarm} />
        <div style={{ height: 3 }} />
        <RpmBar label="STBD" rpm={ship.rpmStbd ?? 0} alarm={ship.rpmAlarm} />
      </div>

      {/* ── Power mode timeline ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
          Power mode
        </div>
        <div style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--brd)' }}>
          <div style={{ flex: 55, background: 'rgba(100,110,130,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontFamily: 'var(--mono)', color: 'rgba(180,190,210,0.5)', textTransform: 'uppercase' }}>
            Diesel+PTO
          </div>
          <div style={{ flex: 25, background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontFamily: 'var(--mono)', color: 'var(--pur)', textTransform: 'uppercase' }}>
            Hybrid
          </div>
          <div style={{ flex: 20, background: 'rgba(34,214,138,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontFamily: 'var(--mono)', color: 'var(--grn)', textTransform: 'uppercase' }}>
            Electric
          </div>
        </div>
        <div style={{ position: 'relative', height: 2, marginTop: 3 }}>
          <div style={{
            position: 'absolute', width: 8, height: 8, borderRadius: '50%',
            background: 'var(--pur)', top: -3,
            left: `${Math.min(99, (ship.routeProgress / 0.92) * 100)}%`,
            boxShadow: '0 0 8px var(--pur)', transition: 'left 0.5s linear',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 6, fontFamily: 'var(--mono)', color: 'var(--tx3)' }}>
          <span>Kapellskär</span><span>Långnäs</span><span>Innamo</span><span>Naantali</span>
        </div>
      </div>

      {/* ── Battery bar ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
            Battery SOC
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--pur)' }}>
            {energy.batterySoc}<span style={{ fontSize: 9, fontWeight: 400, color: 'var(--tx2)' }}>%</span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(60,90,140,0.15)', border: '1px solid var(--brd)', overflow: 'hidden', marginTop: 5 }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg, var(--pur), var(--grn))',
            width: energy.batterySoc + '%', transition: 'width 1s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 6, fontFamily: 'var(--mono)', color: 'var(--tx3)' }}>
          <span>0%</span>
          <span style={{ color: 'var(--red)' }}>15% reserve</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── Fuel trend ── */}
      <div style={{ padding: '8px 12px', flex: 1 }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
          Fuel trend
        </div>
        <FuelChart />
      </div>
    </div>
  );
}

// ── MetricCard：更大的主数字，颜色阈值 ──────────────────────────────────
function MetricCard({ label, value, unit, color }) {
  return (
    <div style={{ background: 'var(--crd)', border: '1px solid var(--brd)', borderRadius: 5, padding: '6px 10px' }}>
      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', marginTop: 2, lineHeight: 1.1, color: color || 'var(--tx)' }}>
        {value}
        <span style={{ fontSize: 9, color: 'var(--tx2)', fontWeight: 400, marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}

// ── RPM 条形显示 ─────────────────────────────────────────────────────────
function RpmBar({ label, rpm, alarm }) {
  const pct   = Math.min(100, (Math.abs(rpm) / 500) * 100);
  const color = alarm ? 'var(--red)' : Math.abs(rpm) > 300 ? 'var(--amb)' : 'var(--grn)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 6, fontFamily: 'var(--mono)', color: 'var(--tx3)', width: 24, textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(60,90,140,0.15)', border: '1px solid var(--brd)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: color, width: pct + '%', transition: 'width 0.1s' }} />
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, fontFamily: 'var(--mono)', color, width: 44, textAlign: 'right' }}>
        {(rpm >= 0 ? '+' : '')}{Math.round(rpm)}<span style={{ fontSize: 7, fontWeight: 400, color: 'var(--tx3)' }}> rpm</span>
      </span>
    </div>
  );
}

// ── Fuel trend chart ─────────────────────────────────────────────────────
function FuelChart() {
  const canvasRef  = useRef(null);
  const historyRef = useRef(Array(40).fill(28));

  useEffect(() => {
    const c   = canvasRef.current;
    const ctx = c.getContext('2d');

    function resize() {
      const d = devicePixelRatio || 1;
      const r = c.parentElement.getBoundingClientRect();
      c.width  = r.width * d; c.height = 55 * d;
      c.style.width = r.width + 'px'; c.style.height = '55px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const interval = setInterval(() => {
      const { energy } = useStore.getState();
      historyRef.current.push(energy.fuelRate);
      historyRef.current.shift();

      const w    = c.width / devicePixelRatio;
      const h    = 55;
      const data = historyRef.current;
      const step = w / (data.length - 1);

      ctx.clearRect(0, 0, w, h);

      // Optimal reference line at ~28 t/d
      const refY = h - (28 - 15) / (55 - 15) * h;
      ctx.beginPath(); ctx.moveTo(0, refY); ctx.lineTo(w, refY);
      ctx.strokeStyle = 'rgba(34,214,138,0.12)'; ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

      // Area fill
      ctx.beginPath(); ctx.moveTo(0, h);
      data.forEach((v, i) => ctx.lineTo(i * step, h - (v - 15) / (55 - 15) * h));
      ctx.lineTo(w, h); ctx.closePath();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(34,214,138,0.10)');
      grd.addColorStop(1, 'rgba(34,214,138,0)');
      ctx.fillStyle = grd; ctx.fill();

      // Line
      ctx.beginPath();
      data.forEach((v, i) => {
        const y = h - (v - 15) / (55 - 15) * h;
        i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
      });
      ctx.strokeStyle = 'rgba(34,214,138,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();

      // Current value label
      const last  = data[data.length - 1];
      const lastY = h - (last - 15) / (55 - 15) * h;
      ctx.font = '600 8px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(34,214,138,0.7)'; ctx.textAlign = 'right';
      ctx.fillText(last.toFixed(1) + ' t/d', w - 2, lastY - 3);
    }, 500);

    return () => { clearInterval(interval); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 55 }} />;
}
