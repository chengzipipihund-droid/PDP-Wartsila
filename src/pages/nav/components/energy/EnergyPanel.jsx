import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { useStore } from '../../stores/useShipStore';
import { useEnergyStore } from '../../../energy/stores/energyStore';

export default function EnergyPanel({ style, layoutView }) {
  const energy = useStore(s => s.energy);
  const ship   = useStore(s => s.ship);
  
  // Ensure unified data by fetching directly from energyStore
  const fuelRateKgh = useEnergyStore(s => s.fuelRateKgh || 0);
  const batterySoc  = useEnergyStore(s => s.batteryLevel || 0);
  const rpm         = useEnergyStore(s => s.rpm || 0);
  const alarm       = useEnergyStore(s => s.alarm || false);
  
  // Calculate fuel rate in tons/day (t/d)
  const fuelRateTd = (fuelRateKgh * 24) / 1000;

  const fuelColor = fuelRateTd > 48 ? 'var(--red)'
    : fuelRateTd > 38 ? 'var(--amb)'
    : 'var(--grn)';

  const effColor = energy.efficiency > 120 ? 'var(--red)'
    : energy.efficiency > 90 ? 'var(--amb)'
    : 'var(--grn)';

  return (
    <div style={{ background: 'var(--pnl)', borderLeft: layoutView === 'B' ? '1px solid var(--brd)' : 'none', display: 'flex', flexDirection: 'column', overflowY: 'auto', ...style }}>

      {/* ── Hero metrics ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
          Energy dashboard
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <MetricCard label="Fuel rate"   value={fuelRateTd.toFixed(1)}   unit="t/d"   color={fuelColor} />
          <MetricCard label="Efficiency"  value={energy.efficiency > 0 ? energy.efficiency.toFixed(0) : '—'} unit="kg/NM" color={effColor} />
          <MetricCard label="CO₂ saved"   value="2.4"                           unit="t"     color="var(--grn)" />
          <MetricCard label="Battery SOC" value={Math.round(batterySoc)}        unit="%"     color="var(--pur)" />
        </div>
      </div>

      {/* ── RPM Gauge ── */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
            Propeller RPM
          </span>
          {alarm && (
            <span style={{ fontSize: 7, fontFamily: 'var(--mono)', color: 'var(--red)', fontWeight: 600 }}>
              ⚠ OVERSPEED
            </span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <RpmGauge rpm={rpm} alarm={alarm} />
        </div>
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
            left: `${Math.min(99, (ship.routeProgress / 1.0) * 100)}%`,
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
            {Math.round(batterySoc)}<span style={{ fontSize: 9, fontWeight: 400, color: 'var(--tx2)' }}>%</span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(60,90,140,0.15)', border: '1px solid var(--brd)', overflow: 'hidden', marginTop: 5 }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg, var(--pur), var(--grn))',
            width: batterySoc + '%', transition: 'width 1s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 6, fontFamily: 'var(--mono)', color: 'var(--tx3)' }}>
          <span>0%</span>
          <span style={{ color: 'var(--red)' }}>15% reserve</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── Fuel trend ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
          Fuel trend
        </div>
        <FuelChart />
      </div>

      {/* ── Renewable charging efficiency ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
          Renewable charging efficiency
        </div>
        <RenewableChart />
      </div>

      {/* ── Diesel consumption ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
          Diesel consumption
        </div>
        <DieselChart />
      </div>

      {/* ── Engine temperature ── */}
      <div style={{ padding: '8px 12px', flex: 1 }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
          Engine temperature
        </div>
        <EngineTemperatureChart />
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

// ── Compact RPM arc gauge (canvas, 100x100) ────────────────────────
function RpmGauge({ rpm, alarm }) {
  const canvasRef = useRef(null);
  const dimRef    = useRef({ ctx: null, size: 0, ready: false });

  useLayoutEffect(() => {
    const c   = canvasRef.current;
    const ctx = c.getContext('2d');
    const d   = window.devicePixelRatio || 1;
    const size = 100;
    c.width  = Math.round(size * d);
    c.height = Math.round(size * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    dimRef.current = { ctx, size, ready: true };
  }, []);

  useEffect(() => {
    const { ctx, size, ready } = dimRef.current;
    if (!ready) return;

    const cx = size / 2;
    const cy = size / 2 + 5;
    const r  = 40;
    const startAngle = Math.PI * 0.75;
    const endAngle   = Math.PI * 2.25;
    const fullAngle  = endAngle - startAngle;

    ctx.clearRect(0, 0, size, size);

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(60,90,140,0.22)';
    ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.stroke();

    // Alarm zone (80% to 100%)
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle + fullAngle * 0.80, endAngle);
    ctx.strokeStyle = 'rgba(255,80,80,0.18)';
    ctx.lineWidth = 10; ctx.stroke();

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
      ctx.lineWidth = 10; ctx.stroke();
    }

    // RPM value
    const rpmRounded = Math.round(rpm);
    ctx.font = `600 ${rpmRounded > 99 ? 24 : 26}px "JetBrains Mono"`;
    ctx.fillStyle  = alarm ? '#ff4444' : 'var(--tx)';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rpmRounded, cx, cy - 2);

    // "RPM" sub-label
    ctx.font = '400 10px "JetBrains Mono"';
    ctx.fillStyle = 'var(--tx3)';
    ctx.fillText('RPM', cx, cy + 18);
  }, [rpm, alarm]);

  return <canvas ref={canvasRef} style={{ width: 100, height: 100 }} />;
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
      const energyState = useEnergyStore.getState();
      const fuelRateTd = (energyState.fuelRateKgh * 24) / 1000;
      historyRef.current.push(fuelRateTd);
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

// ── Renewable charging efficiency chart (%, 0–100) ───────────────────────
function RenewableChart() {
  const canvasRef  = useRef(null);
  const historyRef = useRef(Array(40).fill(72));

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
      const prev = historyRef.current[historyRef.current.length - 1];
      const next = Math.min(100, Math.max(40, prev + (Math.random() - 0.48) * 2.5));
      historyRef.current.push(next);
      historyRef.current.shift();

      const w    = c.width / devicePixelRatio;
      const h    = 55;
      const data = historyRef.current;
      const step = w / (data.length - 1);
      const minV = 0, maxV = 100;

      ctx.clearRect(0, 0, w, h);

      // 80% reference line
      const refY = h - (80 - minV) / (maxV - minV) * h;
      ctx.beginPath(); ctx.moveTo(0, refY); ctx.lineTo(w, refY);
      ctx.strokeStyle = 'rgba(167,139,250,0.12)'; ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

      // Area fill
      ctx.beginPath(); ctx.moveTo(0, h);
      data.forEach((v, i) => ctx.lineTo(i * step, h - (v - minV) / (maxV - minV) * h));
      ctx.lineTo(w, h); ctx.closePath();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(167,139,250,0.12)');
      grd.addColorStop(1, 'rgba(167,139,250,0)');
      ctx.fillStyle = grd; ctx.fill();

      // Line
      ctx.beginPath();
      data.forEach((v, i) => {
        const y = h - (v - minV) / (maxV - minV) * h;
        i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
      });
      ctx.strokeStyle = 'rgba(167,139,250,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();

      // Value label
      const last  = data[data.length - 1];
      const lastY = h - (last - minV) / (maxV - minV) * h;
      ctx.font = '600 8px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(167,139,250,0.8)'; ctx.textAlign = 'right';
      ctx.fillText(last.toFixed(1) + ' %', w - 2, lastY - 3);
    }, 500);

    return () => { clearInterval(interval); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 55 }} />;
}

// ── Diesel consumption chart (L/h, 200–800) ──────────────────────────────
function DieselChart() {
  const canvasRef  = useRef(null);
  const historyRef = useRef(Array(40).fill(420));

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
      const energyState = useEnergyStore.getState();
      // Derive diesel L/h from fuel rate (density ~0.84 kg/L)
      const lph = Math.min(800, Math.max(200, (energyState.fuelRateKgh / 0.84) + (Math.random() - 0.5) * 15));
      historyRef.current.push(lph);
      historyRef.current.shift();

      const w    = c.width / devicePixelRatio;
      const h    = 55;
      const data = historyRef.current;
      const step = w / (data.length - 1);
      const minV = 200, maxV = 800;

      ctx.clearRect(0, 0, w, h);

      // 500 L/h reference line
      const refY = h - (500 - minV) / (maxV - minV) * h;
      ctx.beginPath(); ctx.moveTo(0, refY); ctx.lineTo(w, refY);
      ctx.strokeStyle = 'rgba(240,160,48,0.12)'; ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

      // Area fill
      ctx.beginPath(); ctx.moveTo(0, h);
      data.forEach((v, i) => ctx.lineTo(i * step, h - (v - minV) / (maxV - minV) * h));
      ctx.lineTo(w, h); ctx.closePath();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(240,160,48,0.12)');
      grd.addColorStop(1, 'rgba(240,160,48,0)');
      ctx.fillStyle = grd; ctx.fill();

      // Line
      ctx.beginPath();
      data.forEach((v, i) => {
        const y = h - (v - minV) / (maxV - minV) * h;
        i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
      });
      ctx.strokeStyle = 'rgba(240,160,48,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();

      // Value label
      const last  = data[data.length - 1];
      const lastY = h - (last - minV) / (maxV - minV) * h;
      ctx.font = '600 8px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(240,160,48,0.8)'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(last) + ' L/h', w - 2, lastY - 3);
    }, 500);

    return () => { clearInterval(interval); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 55 }} />;
}

// ── Engine temperature chart (°C, 60–110) ────────────────────────────────
function EngineTemperatureChart() {
  const canvasRef  = useRef(null);
  const historyRef = useRef(Array(40).fill(78));

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
      const prev = historyRef.current[historyRef.current.length - 1];
      const next = Math.min(110, Math.max(60, prev + (Math.random() - 0.48) * 1.2));
      historyRef.current.push(next);
      historyRef.current.shift();

      const w    = c.width / devicePixelRatio;
      const h    = 55;
      const data = historyRef.current;
      const step = w / (data.length - 1);
      const minV = 60, maxV = 110;

      ctx.clearRect(0, 0, w, h);

      // 95°C warning reference line
      const refY = h - (95 - minV) / (maxV - minV) * h;
      ctx.beginPath(); ctx.moveTo(0, refY); ctx.lineTo(w, refY);
      ctx.strokeStyle = 'rgba(255,80,80,0.12)'; ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

      // Colour by temperature
      const last = data[data.length - 1];
      const hot  = last > 95;
      const lineC = hot ? 'rgba(255,80,80,0.6)' : 'rgba(59,139,255,0.6)';
      const areaC = hot ? 'rgba(255,80,80,0.10)' : 'rgba(59,139,255,0.10)';

      // Area fill
      ctx.beginPath(); ctx.moveTo(0, h);
      data.forEach((v, i) => ctx.lineTo(i * step, h - (v - minV) / (maxV - minV) * h));
      ctx.lineTo(w, h); ctx.closePath();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, areaC);
      grd.addColorStop(1, 'rgba(59,139,255,0)');
      ctx.fillStyle = grd; ctx.fill();

      // Line
      ctx.beginPath();
      data.forEach((v, i) => {
        const y = h - (v - minV) / (maxV - minV) * h;
        i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
      });
      ctx.strokeStyle = lineC; ctx.lineWidth = 1.2; ctx.stroke();

      // Value label
      const lastY = h - (last - minV) / (maxV - minV) * h;
      ctx.font = '600 8px "JetBrains Mono"';
      ctx.fillStyle = hot ? 'rgba(255,80,80,0.85)' : 'rgba(59,139,255,0.8)';
      ctx.textAlign = 'right';
      ctx.fillText(last.toFixed(1) + ' °C', w - 2, lastY - 3);
    }, 500);

    return () => { clearInterval(interval); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 55 }} />;
}
