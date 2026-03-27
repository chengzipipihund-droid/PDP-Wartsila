import React, { useState, useEffect } from 'react';
import { useStore } from '../../stores/useShipStore';

export default function ArrivalOverlay() {
  const docked       = useStore(s => s.docked);
  const shorePower   = useStore(s => s.shorePower);
  const ai           = useStore(s => s.ai);
  const energy       = useStore(s => s.energy);
  const resetVoyage  = useStore(s => s.resetVoyage);
  const [dismissed, setDismissed] = useState(false);

  // Re-show whenever a new voyage ends (docked goes true again after reset)
  useEffect(() => {
    if (docked) setDismissed(false);
  }, [docked]);

  if (!docked || dismissed) return null;

  // ── Shore power ──────────────────────────────────────────────
  const spColor = shorePower === 2 ? '#22d68a'
    : shorePower === 1 ? '#f0a030'
    : 'rgba(100,130,170,0.35)';
  const spLabel = shorePower === 2 ? 'Connected'
    : shorePower === 1 ? 'Connecting…'
    : 'Awaiting connection';
  const spIcon = shorePower === 2 ? '⚡' : shorePower === 1 ? '◎' : '○';

  // ── Grade colour ─────────────────────────────────────────────
  const gradeColor = ai.grade === 'S' || ai.grade === 'A' ? '#22d68a'
    : ai.grade === 'B' ? '#a78bfa'
    : ai.grade === 'C' ? '#f0a030'
    : '#ff4444';

  // ── Metric rows with weights ─────────────────────────────────
  const metrics = [
    { label: 'Corridor accuracy', score: ai.corridor,   weight: 0.25, color: '#3b8bff' },
    { label: 'Speed optimisation', score: ai.speedOpt,  weight: 0.20, color: '#22d68a' },
    { label: 'Timing',             score: ai.timing,    weight: 0.20, color: '#a78bfa' },
    { label: 'Fuel efficiency',    score: ai.fuelEff,   weight: 0.20, color: '#22d68a' },
    { label: 'Smoothness',         score: ai.smoothness, weight: 0.15, color: '#f0a030' },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,14,28,0.82)',
      backdropFilter: 'blur(6px)',
      fontFamily: 'var(--mono)',
    }}>
      <div style={{
        background: 'rgba(8,14,28,0.97)',
        border: '1px solid rgba(34,214,138,0.40)',
        borderRadius: 12,
        padding: '22px 28px 18px',
        boxShadow: '0 0 48px rgba(34,214,138,0.12)',
        width: 380,
        position: 'relative',
      }}>
        {/* ── Close ── */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            position: 'absolute', top: 10, right: 12,
            background: 'none', border: 'none',
            color: 'rgba(100,130,170,0.4)', cursor: 'pointer',
            fontSize: 18, lineHeight: 1, padding: 0,
          }}
        >×</button>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 3, color: 'rgba(100,130,170,0.45)', marginBottom: 4 }}>
            Berthing complete
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#22d68a', letterSpacing: 2 }}>
            NAANTALI
          </div>
          <div style={{ fontSize: 7, color: 'rgba(100,130,170,0.35)', letterSpacing: 1, marginTop: 1 }}>
            Finnsirius — Berth A · 07:14 EET
          </div>
        </div>

        <Divider />

        {/* ── Grade + total ── */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 28, marginBottom: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={labelStyle}>Grade</div>
            <div style={{ fontSize: 52, fontWeight: 700, color: gradeColor, lineHeight: 1 }}>{ai.grade}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={labelStyle}>Total score</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: gradeColor, lineHeight: 1 }}>{ai.total}</div>
            <div style={{ fontSize: 7, color: 'rgba(100,130,170,0.35)', marginTop: 1 }}>/100 pts</div>
          </div>
        </div>

        <Divider />

        {/* ── Performance breakdown ── */}
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(100,130,170,0.4)', marginBottom: 8 }}>
          Performance breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
          {metrics.map(m => (
            <MetricRow key={m.label} {...m} />
          ))}
        </div>

        <Divider />

        {/* ── Voyage stats ── */}
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(100,130,170,0.4)', marginBottom: 8 }}>
          Voyage stats
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px', marginBottom: 14 }}>
          <StatRow label="Avg fuel rate"   value={energy.fuelRate.toFixed(1)} unit="t/d" />
          <StatRow label="Efficiency"      value={energy.efficiency > 0 ? energy.efficiency.toFixed(0) : '—'} unit="kg/NM" />
          <StatRow label="Battery SOC"     value={`${energy.batterySoc}`}   unit="%" />
          <StatRow label="CO₂ saved"       value="2.4"                      unit="t" />
        </div>

        <Divider />

        {/* ── Shore power ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 12px', marginBottom: 14,
          background: shorePower === 2 ? 'rgba(34,214,138,0.05)' : 'rgba(60,90,140,0.07)',
          border: `1px solid ${spColor}`, borderRadius: 5,
          transition: 'border-color 0.4s',
        }}>
          <span style={{ fontSize: 15, color: spColor }}>{spIcon}</span>
          <div>
            <div style={{ fontSize: 6, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(100,130,170,0.4)' }}>Shore power</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: spColor }}>{spLabel}</div>
          </div>
        </div>

        {/* ── Reset button ── */}
        <button
          onClick={() => {
            setDismissed(true);
            resetVoyage();
          }}
          style={{
            width: '100%', padding: '8px 0',
            fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase',
            background: 'rgba(59,139,255,0.10)',
            border: '1px solid rgba(59,139,255,0.35)',
            borderRadius: 5, color: 'rgba(130,170,230,0.85)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(59,139,255,0.18)';
            e.currentTarget.style.borderColor = 'rgba(59,139,255,0.6)';
            e.currentTarget.style.color = '#8ab4e8';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(59,139,255,0.10)';
            e.currentTarget.style.borderColor = 'rgba(59,139,255,0.35)';
            e.currentTarget.style.color = 'rgba(130,170,230,0.85)';
          }}
        >
          ↺  Reset Voyage
        </button>

      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: 'rgba(60,90,140,0.2)', marginBottom: 12 }} />;
}

const labelStyle = {
  fontSize: 6, textTransform: 'uppercase', letterSpacing: 1.5,
  color: 'rgba(100,130,170,0.4)', marginBottom: 2,
};

function MetricRow({ label, score, weight, color }) {
  const barColor = score >= 80 ? color : score >= 50 ? '#f0a030' : '#ff4444';
  const contrib  = (score * weight).toFixed(1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Label */}
      <span style={{ fontSize: 7, color: 'rgba(140,165,200,0.7)', width: 120, flexShrink: 0 }}>{label}</span>
      {/* Bar */}
      <div style={{ flex: 1, height: 4, background: 'rgba(60,90,140,0.15)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: barColor, borderRadius: 2, transition: 'width 0.8s' }} />
      </div>
      {/* Score */}
      <span style={{ fontSize: 9, fontWeight: 600, color: barColor, width: 24, textAlign: 'right' }}>{score}</span>
      {/* Weight × contribution */}
      <span style={{ fontSize: 6, color: 'rgba(100,130,170,0.35)', width: 52, textAlign: 'right' }}>
        ×{(weight * 100).toFixed(0)}% = {contrib}
      </span>
    </div>
  );
}

function StatRow({ label, value, unit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 7, color: 'rgba(100,130,170,0.45)' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(180,200,230,0.85)' }}>
        {value}<span style={{ fontSize: 7, color: 'rgba(100,130,170,0.4)', marginLeft: 2 }}>{unit}</span>
      </span>
    </div>
  );
}
