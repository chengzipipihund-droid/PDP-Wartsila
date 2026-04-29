import React from 'react';
import { useStore } from '../../stores/useShipStore';

export default function CollisionOverlay() {
  const collision = useStore(s => s.collision);
  const resetVoyage = useStore(s => s.resetVoyage);

  if (!collision) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(28, 8, 8, 0.82)',
      backdropFilter: 'blur(6px)',
      fontFamily: 'var(--mono)',
    }}>
      <div style={{
        background: 'rgba(28, 8, 8, 0.97)',
        border: '1px solid rgba(214, 34, 34, 0.4)',
        borderRadius: 12,
        padding: '22px 28px 18px',
        boxShadow: '0 0 48px rgba(214, 34, 34, 0.12)',
        width: 380,
        position: 'relative',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#d62222', letterSpacing: 2, marginBottom: 14 }}>
          COLLISION DETECTED
        </div>
        <div style={{ fontSize: 12, color: 'rgba(230, 180, 180, 0.8)', marginBottom: 20, lineHeight: 1.5 }}>
          Your vessel has collided with another ship. The simulation will now restart.
        </div>
        <button
          onClick={resetVoyage}
          style={{
            width: '100%', padding: '8px 0',
            fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase',
            background: 'rgba(255, 59, 59, 0.1)',
            border: '1px solid rgba(255, 59, 59, 0.35)',
            borderRadius: 5, color: 'rgba(230, 130, 130, 0.85)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 59, 59, 0.18)';
            e.currentTarget.style.borderColor = 'rgba(255, 59, 59, 0.6)';
            e.currentTarget.style.color = '#e88a8a';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 59, 59, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 59, 59, 0.35)';
            e.currentTarget.style.color = 'rgba(230, 130, 130, 0.85)';
          }}
        >
          ↺  Restart Voyage
        </button>
      </div>
    </div>
  );
}
