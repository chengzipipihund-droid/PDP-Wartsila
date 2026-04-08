/* ═══════════════════════════════════════════════════════════
   EcoModeContent.jsx — Energy tab body (shown when clicking
   the Energy icon in LeverPopup).

   Row 1 : BatteryPanel (left 50%) | Engine Dashboard (right 50%)
   Row 2 : 4 live arc-gauge canvases — fuel rate / diesel L/h /
           engine kW output / fuel efficiency
   Row 3 : Speed overview (RPM gauge + status)
   ═══════════════════════════════════════════════════════════ */
import { useRef, useEffect, useLayoutEffect } from 'react';
import { useEnergyStore } from '../../stores/energyStore';
import BatteryPanel from '../battery/BatteryPanel';
import SpeedGauge   from './SpeedGauge';

// ── Fallback engine data when live API hasn't responded yet ─────────────
const MOCK_ENGINES = [
  { id: 'ME1', status: 'run',  load: 75 },
  { id: 'ME2', status: 'run',  load: 68 },
  { id: 'ME3', status: 'stop', load: 0  },
  { id: 'ME4', status: 'stop', load: 0  },
];

// ── Root component ──────────────────────────────────────────────────────
export default function EcoModeContent({ batteryLevel, rpm }) {
  const alarm = rpm > 400;
  const { engineData, fuelRateKgh, engineKw } = useEnergyStore();

  const engines = (engineData && engineData.length > 0)
    ? engineData.map(e => ({
        id:     e.id,
        status: e.status,
        load:   e.load_pct ?? e.load ?? 0,
      }))
    : MOCK_ENGINES;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      gap: 3, overflow: 'hidden',
      background: '#EBEBEB',
    }}>

      {/* ── Row 1 : Battery  |  Engine Dashboard ── */}
      <div style={{ flex: '0 0 30%', display: 'flex', gap: 3, minHeight: 0, overflow: 'hidden' }}>

        {/* Battery panel (left half) */}
        <div style={{ flex: '0 0 50%', minWidth: 0, overflow: 'hidden' }}>
          <BatteryPanel batteryLevel={batteryLevel} />
        </div>

        {/* Engine dashboard (right half) */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', background: '#fff' }}>
          <EngineDashboard engines={engines} engineKw={engineKw} />
        </div>
      </div>

      {/* ── Row 2 : Live fuel gauges ── */}
      <FuelGaugeRow rpm={rpm} />

      {/* ── Row 3 : Speed / RPM overview ── */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: '#F7F7F7',
      }}>
        <div style={{ ...PANEL_HEADER, justifyContent: 'center' }}>
          SPEED OVERVIEW
        </div>

        <div style={{
          flex: 1, minHeight: 0,
          display: 'flex', alignItems: 'center',
          padding: '4px 8px', gap: 8, boxSizing: 'border-box',
        }}>
          {/* Arc gauge */}
          <div style={{ flex: '0 0 40%', height: '100%', display: 'flex', alignItems: 'center' }}>
            <SpeedGauge value={rpm} maxValue={500} unit="RPM" alarm={alarm} />
          </div>

          {/* Data labels */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Engine Speed
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: alarm ? '#E74C3C' : '#333', lineHeight: 1 }}>
              {Math.round(rpm)}
              <span style={{ fontSize: 14, fontWeight: 400, color: '#888', marginLeft: 4 }}>RPM</span>
            </div>
            <div style={{ height: 1, background: '#DDD', margin: '2px 0' }} />
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: alarm ? '#E74C3C' : '#4CAF50' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: alarm ? '#E74C3C' : '#4CAF50', flexShrink: 0 }} />
              {alarm ? 'OVERSPEED' : rpm < 1 ? 'IDLE' : 'NORMAL'}
            </div>
            {alarm && (
              <div style={{ fontSize: 11, color: '#E74C3C', marginTop: 2 }}>⚠ Exceeds 400 RPM limit</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared panel header style (matches Battery and Speed headers)
const PANEL_HEADER = {
  height: 32, flexShrink: 0,
  background: '#D9D9D9',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 12px',
  fontWeight: 'bold', fontSize: 14, color: '#333',
  borderBottom: '1px solid #999', letterSpacing: '0.5px',
};

// ── Engine Dashboard ────────────────────────────────────────────────────
function EngineDashboard({ engines, engineKw }) {
  // Only display ME1 and ME2
  const display = engines.filter(e => e.id === 'ME1' || e.id === 'ME2').slice(0, 2);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'JetBrains Mono', monospace" }}>

      {/* Unified header */}
      <div style={PANEL_HEADER}>
        <span>MAIN ENGINE</span>
        <span style={{ fontSize: 11, color: '#555' }}>
          {Math.round(engineKw || 0).toLocaleString()} kW
        </span>
      </div>

      {/* ME1 | ME2 side by side */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1, background: '#ccc',
        overflow: 'hidden',
      }}>
        {display.map(eng => <EngineCard key={eng.id} engine={eng} />)}
      </div>
    </div>
  );
}

// ── Single engine card ──────────────────────────────────────────────────
function EngineCard({ engine }) {
  const { id, status, load } = engine;
  const isRun = status === 'run';

  // Derived sensor values (physics-plausible from load %)
  const kw       = Math.round((load / 100) * 9000);
  const coolant  = isRun ? Math.round(72 + load * 0.30) : 22;
  const boost    = isRun ? (5.8 + load * 0.028).toFixed(1) : '0.0';
  const exhaust  = isRun ? Math.round(305 + load * 2.0)  : 25;
  const fuelFlw  = isRun ? Math.round(load * 0.55) : 0; // kg/h per engine

  const loadColor = load > 88 ? '#e74c3c' : load > 72 ? '#f0a030' : '#22d68a';

  return (
    <div style={{
      background: '#fff', padding: '5px 8px',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      {/* Engine ID + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#1a1a2e', fontFamily: "'JetBrains Mono', monospace" }}>
          {id}
          <span style={{ fontSize: 7, color: '#aaa', fontWeight: 400, marginLeft: 4 }}>Wärtsilä 46F</span>
        </span>
        <span style={{
          fontSize: 7, fontWeight: 700, letterSpacing: 0.5,
          color: isRun ? '#22d68a' : '#999',
          background: isRun ? 'rgba(34,214,138,0.1)' : 'rgba(0,0,0,0.05)',
          border: `1px solid ${isRun ? 'rgba(34,214,138,0.3)' : '#ddd'}`,
          borderRadius: 3, padding: '1px 5px',
        }}>
          {isRun ? '● RUN' : '○ STOP'}
        </span>
      </div>

      {/* Load bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#aaa', marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>ENGINE LOAD</span>
          <span style={{ color: loadColor, fontWeight: 700 }}>{load}%</span>
        </div>
        <div style={{ height: 5, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${load}%`, background: loadColor, borderRadius: 3, transition: 'width 1s' }} />
        </div>
      </div>

      {/* Metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 4px' }}>
        <EngMetric label="OUTPUT"  value={kw > 0 ? kw.toLocaleString() : '—'} unit="kW"  color="#3498db" />
        <EngMetric label="COOLANT" value={coolant} unit="°C"  color={coolant > 88 ? '#e74c3c' : '#555'} />
        <EngMetric label="FUEL"    value={fuelFlw} unit="kg/h" color="#f0a030" />
        <EngMetric label="BOOST"   value={boost}   unit="bar" color="#555" />
        <EngMetric label="EXHAUST" value={exhaust} unit="°C"  color={exhaust > 470 ? '#e74c3c' : '#e67e22'} />
        <EngMetric label="VIBR"    value={isRun ? (1.2 + load * 0.012).toFixed(1) : '0.0'} unit="mm/s" color={load > 85 ? '#e74c3c' : '#555'} />
      </div>
    </div>
  );
}

function EngMetric({ label, value, unit, color }) {
  return (
    <div>
      <div style={{ fontSize: 6, color: '#bbb', letterSpacing: 0.3, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: color || '#333', fontFamily: "'JetBrains Mono', monospace" }}>
        {value}<span style={{ fontSize: 6, fontWeight: 400, color: '#bbb', marginLeft: 1 }}>{unit}</span>
      </div>
    </div>
  );
}

// ── Live fuel gauge row ─────────────────────────────────────────────────
function FuelGaugeRow({ rpm }) {
  const hasRpm = rpm > 1;

  return (
    <div style={{ flex: '0 0 33%', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Unified header */}
      <div style={PANEL_HEADER}>
        <span>FUEL &amp; POWER</span>
        {!hasRpm && (
          <span style={{ fontSize: 10, fontWeight: 400, color: '#999' }}>— engine idle</span>
        )}
      </div>

      {/* Gauges */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', minHeight: 0 }}>
        <ArcGaugeCanvas storeKey="fuelRateKgh" max={200}   label="FUEL RATE"   unit="kg/h"  color="#f0a030" warningAt={150} forceZero={!hasRpm} />
        <div style={{ width: 1, background: '#eee', margin: '10px 0' }} />
        <ArcGaugeCanvas storeKey="dieselLph"   max={240}   label="DIESEL CONS" unit="L/h"   color="#e74c3c" warningAt={200} forceZero={!hasRpm} />
        <div style={{ width: 1, background: '#eee', margin: '10px 0' }} />
        <ArcGaugeCanvas storeKey="engineKw"    max={18000} label="ENG OUTPUT"  unit="kW"    color="#3498db" forceZero={!hasRpm} />
        <div style={{ width: 1, background: '#eee', margin: '10px 0' }} />
        <ArcGaugeCanvas storeKey="efficiency"  max={260}   label="EFFICIENCY"  unit="g/kWh" color="#9b59b6" warningAt={210} forceZero={!hasRpm} />
      </div>
    </div>
  );
}

// ── Arc gauge drawn on canvas, polls store every 150 ms ─────────────────
function ArcGaugeCanvas({ storeKey, max, label, unit, color, warningAt, forceZero }) {
  const canvasRef = useRef(null);
  const valRef    = useRef(0);
  const sizeRef   = useRef(80);

  // Size canvas once on mount
  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const par = c.parentElement;
    const size = Math.min(par.offsetWidth * 0.88, par.offsetHeight * 0.88, 120);
    sizeRef.current = size;
    const d = devicePixelRatio || 1;
    c.width  = Math.round(size * d);
    c.height = Math.round(size * d);
    c.style.width  = size + 'px';
    c.style.height = size + 'px';
    c.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
  }, []);

  useEffect(() => {
    const c   = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');

    const interval = setInterval(() => {
      // ── Fetch target from store (zero everything when engine is idle) ──
      const state = useEnergyStore.getState();
      let target = 0;
      if (!forceZero) {
        if      (storeKey === 'fuelRateKgh') target = state.fuelRateKgh || 0;
        else if (storeKey === 'dieselLph')   target = (state.fuelRateKgh || 0) / 0.84;
        else if (storeKey === 'engineKw')    target = state.engineKw || 0;
        else if (storeKey === 'efficiency') {
          const kw = state.engineKw || 0;
          target = kw > 10 ? ((state.fuelRateKgh || 0) / kw) * 1000 : 0;
        }
      }

      // ── Smooth interpolation ──
      valRef.current += (target - valRef.current) * 0.12;
      const v    = valRef.current;
      const size = sizeRef.current;
      const cx   = size / 2;
      const cy   = size * 0.52;
      const r    = size * 0.36;
      const lw   = size * 0.09;
      const pct  = Math.min(1, Math.max(0, v / max));
      const sA   = Math.PI * 0.75;
      const eA   = Math.PI * 2.25;
      const span = eA - sA;
      const isHot   = warningAt && v > warningAt;
      const arcCol  = isHot ? '#E74C3C' : color;

      ctx.clearRect(0, 0, size, size);

      // Background track
      ctx.beginPath(); ctx.arc(cx, cy, r, sA, eA);
      ctx.strokeStyle = '#EEEEEE'; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.stroke();

      // Warning zone (last 20%)
      if (warningAt) {
        const wPct = 1 - (warningAt / max);
        ctx.beginPath(); ctx.arc(cx, cy, r, sA + span * (1 - wPct), eA);
        ctx.strokeStyle = 'rgba(231,76,60,0.12)'; ctx.lineWidth = lw;
        ctx.stroke();
      }

      // Value arc
      if (pct > 0.01) {
        ctx.beginPath(); ctx.arc(cx, cy, r, sA, sA + span * pct);
        ctx.strokeStyle = arcCol; ctx.lineWidth = lw; ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Tick marks at 0 / 25 / 50 / 75 / 100 %
      ctx.lineCap = 'butt'; ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      [0, 0.25, 0.5, 0.75, 1].forEach(p => {
        const a = sA + span * p;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r - lw * 0.6), cy + Math.sin(a) * (r - lw * 0.6));
        ctx.lineTo(cx + Math.cos(a) * (r + lw * 0.4), cy + Math.sin(a) * (r + lw * 0.4));
        ctx.stroke();
      });

      // Center numeric value
      const dispStr = v > 9999 ? (v / 1000).toFixed(1) + 'k' : Math.round(v).toString();
      ctx.font = `700 ${Math.round(size * 0.18)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = isHot ? '#E74C3C' : '#1a1a1a';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(dispStr, cx, cy - size * 0.04);

      // Unit label
      ctx.font = `500 ${Math.round(size * 0.09)}px monospace`;
      ctx.fillStyle = '#999';
      ctx.fillText(unit, cx, cy + size * 0.14);

      // Channel label below gauge arc
      ctx.font = `600 ${Math.round(size * 0.085)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#666';
      ctx.fillText(label, cx, cy + size * 0.34);

    }, 150);

    return () => clearInterval(interval);
  }, [storeKey, max, label, unit, color, warningAt, forceZero]);

  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
