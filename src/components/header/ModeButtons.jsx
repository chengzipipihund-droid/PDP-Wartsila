/* ═══════════════════════════════════════════════════════════
   组件：模式选择器 | Mode Selector（副标题栏左侧）
   4 个可点击按钮覆盖在 ModeIcon.svg 上：
   AI Mode / Mode 2 / Mode 3 / Mode 4
   当前激活按钮显示绿色边框。
   ═══════════════════════════════════════════════════════════ */
import { useState } from 'react';
import ModeIconSvg from './ModeIcon.svg';

// SVG viewBox is 0 0 199 42.  Button rects in SVG coords:
//  B0: x=1,   width=49.26  (active state in SVG, green border)
//  B1: x=63,  width=38.3
//  B2: x=112, width=38.3
//  B3: x=159, width=38.3
const SLOTS = [
  { id: 0, x: 1,       w: 49.26, label: 'AI Mode'  },
  { id: 1, x: 63,      w: 38.30, label: 'Mode 2'   },
  { id: 2, x: 112.257, w: 38.30, label: 'Mode 3'   },
  { id: 3, x: 159.275, w: 38.30, label: 'Mode 4'   },
];
const SVG_W = 199;
const SVG_H = 42;

export default function ModeButtons({ onModeChange }) {
  const [active, setActive] = useState(0);

  const handle = (id) => {
    setActive(id);
    onModeChange?.(id);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 38, flexShrink: 0, alignSelf: 'center' }}>

      {/* Static SVG background */}
      <img
        src={ModeIconSvg}
        alt="Mode"
        style={{ height: 38, width: 'auto', display: 'block', pointerEvents: 'none' }}
      />

      {/* Clickable overlays */}
      {SLOTS.map(({ id, x, w, label }) => {
        const isActive = id === active;
        const leftPct  = (x        / SVG_W * 100).toFixed(2) + '%';
        const widthPct = (w        / SVG_W * 100).toFixed(2) + '%';
        const heightPct = (33.58   / SVG_H * 100).toFixed(2) + '%';
        const r = id === 0 ? 5 : 4; // border-radius matches SVG

        return (
          <button
            key={id}
            title={label}
            onClick={() => handle(id)}
            style={{
              position: 'absolute',
              top: 0,
              left: leftPct,
              width: widthPct,
              height: heightPct,
              background: 'transparent',
              border: `2px solid ${isActive ? '#4FBF65' : 'transparent'}`,
              borderRadius: r,
              cursor: 'pointer',
              padding: 0,
              boxSizing: 'border-box',
              outline: 'none',
              // Subtle hover for inactive buttons
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = '#4FBF6566'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'transparent'; }}
          />
        );
      })}
    </div>
  );
}
