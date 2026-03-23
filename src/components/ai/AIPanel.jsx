import React from 'react';
import { useStore } from '../../stores/useShipStore';

export default function AIPanel() {
  const ai = useStore(s => s.ai);
  const log = useStore(s => s.log);

  const color = (v) => v >= 80 ? 'var(--grn)' : v >= 60 ? 'var(--amb)' : 'var(--red)';

  return (
    <div style={{ background: 'var(--pnl)', borderRight: '1px solid var(--brd)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Scoring */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--brd)' }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
          AI navigation assessment
        </div>
        <ScoreBar label="Corridor" value={ai.corridor} />
        <ScoreBar label="Speed opt" value={ai.speedOpt} />
        <ScoreBar label="Timing" value={ai.timing} />
        <ScoreBar label="Fuel eff" value={ai.fuelEff} />
        <ScoreBar label="Smoothness" value={ai.smoothness} />
        {/* Total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--brd)' }}>
          <span style={{ fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--tx)', minWidth: 70, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
            Total
          </span>
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(60,90,140,0.2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: ai.total + '%', borderRadius: 3, background: color(ai.total), transition: 'width 0.5s, background 0.5s' }} />
          </div>
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: color(ai.total), minWidth: 40, textAlign: 'right' }}>
            {ai.grade} {ai.total}%
          </span>
        </div>
      </div>

      {/* Decision Log */}
      <div style={{ padding: '8px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
          AI decision log
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {log.map((entry, i) => (
            <LogEntry key={i} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }) {
  const c = value >= 80 ? 'var(--grn)' : value >= 60 ? 'var(--amb)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <span style={{ fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--tx3)', minWidth: 70, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(60,90,140,0.2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: value + '%', borderRadius: 2, background: c, transition: 'width 0.5s, background 0.5s' }} />
      </div>
      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 500, color: c, minWidth: 30, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  );
}

function LogEntry({ entry }) {
  const borderColor = entry.type === 'r' ? 'var(--red)' : entry.type === 'w' ? 'var(--amb)' : entry.type === 'i' ? 'var(--blu)' : 'var(--grn)';
  const ts = entry.ts instanceof Date
    ? `${String(entry.ts.getHours()).padStart(2, '0')}:${String(entry.ts.getMinutes()).padStart(2, '0')}`
    : '';

  return (
    <div style={{
      display: 'flex', gap: 5, padding: '3px 6px', fontSize: 8, fontFamily: 'var(--mono)',
      borderLeft: `2px solid ${borderColor}`, animation: 'fadeIn 0.4s ease-out',
    }}>
      <span style={{ color: 'var(--tx3)', flexShrink: 0 }}>{ts}</span>
      <span style={{ color: 'var(--tx2)', lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: entry.msg }} />
    </div>
  );
}
