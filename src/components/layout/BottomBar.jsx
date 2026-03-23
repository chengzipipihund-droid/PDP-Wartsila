import React, { useState, useEffect } from 'react';

export default function BottomBar() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const d = new Date(Date.now() + 7200000);
      setTime(`${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} EET`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const dot = (color = 'var(--grn)') => (
    <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 3 }} />
  );

  return (
    <div style={{
      gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', background: 'var(--pnl)', borderTop: '1px solid var(--brd)',
      fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--tx3)',
    }}>
      <div>{dot()}GPS {dot()}AIS {dot()}Radar {dot('var(--amb)')}AI v3.2</div>
      <div>Finnsirius · ENC FI5NAANT · {time}</div>
    </div>
  );
}
