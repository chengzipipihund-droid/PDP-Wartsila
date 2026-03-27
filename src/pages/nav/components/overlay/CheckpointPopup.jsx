import React, { useEffect, useRef } from 'react';
import { useStore } from '../../stores/useShipStore';

export default function CheckpointPopup() {
  const checkpointAlert   = useStore(s => s.checkpointAlert);
  const dismissCheckpoint = useStore(s => s.dismissCheckpoint);
  const timerRef = useRef(null);

  // Auto-dismiss after 7 seconds
  useEffect(() => {
    if (!checkpointAlert) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dismissCheckpoint(), 7000);
    return () => clearTimeout(timerRef.current);
  }, [checkpointAlert]);

  if (!checkpointAlert) return null;

  const { name, label, etaMinutes, grade, recSpeed } = checkpointAlert;

  const gradeColor = grade === 'S' || grade === 'A' ? '#22d68a'
    : grade === 'B' ? '#a78bfa'
    : grade === 'C' ? '#f0a030'
    : '#ff4444';

  return (
    <div style={{
      position: 'absolute',
      top: 54,
      left: '30%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      background: 'rgba(8,14,28,0.94)',
      border: '1px solid rgba(34,214,138,0.5)',
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 200,
      boxShadow: '0 0 24px rgba(34,214,138,0.12)',
      fontFamily: 'var(--mono)',
      pointerEvents: 'auto',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#22d68a', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
            ✓ {name} passed
          </div>
          <div style={{ fontSize: 7, color: 'rgba(100,130,170,0.6)', marginTop: 1, letterSpacing: 1 }}>
            {label}
          </div>
        </div>
        <button
          onClick={dismissCheckpoint}
          style={{
            background: 'none', border: 'none', color: 'rgba(100,130,170,0.5)',
            cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 0 0 8px',
          }}
        >×</button>
      </div>

      {/* Data grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px' }}>
        <DataRow
          label="ETA berth"
          value={etaMinutes != null ? `${etaMinutes} min` : '—'}
        />
        <DataRow
          label="Perf grade"
          value={grade}
          color={gradeColor}
        />
        <DataRow
          label="Next seg spd"
          value={`${recSpeed} kn`}
        />
        <DataRow
          label="Waypoint"
          value={name}
          color="#22d68a"
        />
      </div>

      {/* Countdown bar */}
      <div style={{
        height: 2, marginTop: 8, borderRadius: 1,
        background: 'rgba(34,214,138,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'rgba(34,214,138,0.4)',
          width: '100%',
          animation: 'cpShrink 7s linear forwards',
        }} />
      </div>

      <style>{`
        @keyframes cpShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

function DataRow({ label, value, color }) {
  return (
    <div>
      <div style={{
        fontSize: 6, textTransform: 'uppercase', letterSpacing: 1.5,
        color: 'rgba(100,130,170,0.5)', marginBottom: 1,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: color || 'rgba(180,195,220,0.9)',
      }}>
        {value}
      </div>
    </div>
  );
}
