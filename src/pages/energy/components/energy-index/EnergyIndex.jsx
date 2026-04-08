/* ═══════════════════════════════════════════════════════════
   面板：能源索引网络图 | Energy Index Network
   8 个设备节点（Solar / H₂ / Main Engine / CPP / ESS /
   Bridge / Hotel / Bow Thruster）+ 6 条动态连接线。
   ─ 点击 Bridge → 打开杠杆控制面板
   ─ 点击其他节点 → 打开【设备详情弹窗 | Equipment Detail Modal】
   ─ EnergyFlow 开关控制粒子动画开/关
   ═══════════════════════════════════════════════════════════ */
import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { useEnergyStore } from '../../stores/energyStore';
import Background from './elements/Background.svg';

import Solar      from './elements/solar.svg';
import Hydrogen   from './elements/Hydrogen.svg';
import Engine     from './elements/engine.svg';
import CPP        from './elements/CPP.svg';
import ESS        from './elements/ESS.svg';
import Bridge     from './elements/bridge.svg';
import Hotel      from './elements/hotel.svg';
import Bow        from './elements/bow.svg';
import './EnergyIndex.css';

/**
 * Element positions: { left, top } = center of element as % of container.
 * Container includes heading bar at top (~8% of total height).
 */
const ELEMENTS = [
  { id: 'solar',   src: Solar,    alt: 'Solar Panel',  label: 'SOLAR PANEL',   left: 12, top: 22, cls: 'ei-solar',   noLabel: true                },
  { id: 'h2',      src: Hydrogen, alt: 'H₂',           label: 'H₂',            left: 27, top: 22, cls: 'ei-hydrogen', noLabel: true               },
  { id: 'engine',  src: Engine,   alt: 'Main Engine',  label: 'MAIN ENGINE',   left: 24, top: 65, cls: 'ei-engine',  offsetX: 100, offsetY: -50   },
  { id: 'cpp',     src: CPP,      alt: 'CPP',          label: 'CPP',           left: 12, top: 80, cls: 'ei-cpp'                                    },
  { id: 'ess',     src: ESS,      alt: 'ESS(Battery)', label: 'ESS(Battery)',  left: 51, top: 80, cls: 'ei-ess',     offsetX: 100, offsetY: -17.5  },
  { id: 'bridge',  src: Bridge,   alt: 'Bridge',       label: 'BRIDGE',        left: 58, top: 22, cls: 'ei-bridge'                                 },
  { id: 'hotel',   src: Hotel,    alt: 'Hotel',        label: 'HOTEL',         left: 76, top: 22, cls: 'ei-hotel',  offsetX: 200               },
  { id: 'bow',     src: Bow,      alt: 'Bow Thruster', label: 'BOW THRUSTER',  left: 88, top: 80, cls: 'ei-bow'                                    },
];

/**
 * Connection topology: each entry describes which icon side connects to which.
 * Positions are calculated at runtime via DOM measurement (useLayoutEffect).
 */
const CONNECTIONS = [
  { id: 'h2-ess',    from: 'h2',     fromSide: 'right',  to: 'ess',    toSide: 'top',    dur: '2.6s', label: '15%' },
  { id: 'eng-ess',   from: 'engine', fromSide: 'right',  to: 'ess',    toSide: 'left',   dur: '2.0s', label: '45%', reverseWhen: 'DISCHARGING' },
  { id: 'cpp-ess',   from: 'cpp',    fromSide: 'right',  to: 'ess',    toSide: 'left',   dur: '3.0s', label: '30%', toOffset: 0.25, reverseWhen: 'CHARGING' },
  { id: 'ess-hotel', from: 'ess',    fromSide: 'right',  to: 'hotel',  toSide: 'left',   dur: '1.8s', label: '10%' },
  { id: 'ess-bow',   from: 'ess',    fromSide: 'right',  to: 'bow',    toSide: 'left',   dur: '2.3s', label: '5%' },
];

const GAP = 10;       // px gap between icon edge and line endpoint
const CORNER = 10;    // px corner radius for L-shaped elbows

/** Get the connection point on a given side of a bounding rect. */
function sidePoint(r, side, offset = 0) {
  switch (side) {
    case 'right':  return { x: r.right  + GAP, y: r.top + r.height * (0.5 + offset) };
    case 'left':   return { x: r.left   - GAP, y: r.top + r.height * (0.5 + offset) };
    case 'top':    return { x: r.left   + r.width  * (0.5 + offset), y: r.top    - GAP };
    case 'bottom': return { x: r.left   + r.width  * (0.5 + offset), y: r.bottom + GAP };
    default:       return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
}

const px = n => n.toFixed(1);

/** Build an SVG path string: straight or L-shaped elbow with rounded corner. */
function buildPath(s, e) {
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  if (Math.abs(dy) < 4) return `M ${px(s.x)},${px(s.y)} H ${px(e.x)}`;
  if (Math.abs(dx) < 4) return `M ${px(s.x)},${px(s.y)} V ${px(e.y)}`;
  const r  = Math.min(CORNER, Math.abs(dx) / 2, Math.abs(dy) / 2);
  const h  = e.x + (dx > 0 ? -r :  r);   // last point on horizontal segment
  const v  = s.y + (dy > 0 ?  r : -r);   // first point on vertical segment
  return `M ${px(s.x)},${px(s.y)} H ${px(h)} Q ${px(e.x)},${px(s.y)} ${px(e.x)},${px(v)} V ${px(e.y)}`;
}

function EnergyIndex({ showEnergyFlow, onBridgeClick, onEssClick }) {
  const [activePopup, setActivePopup] = useState(null);

  const { engineKw, propulsionKw, batteryKw, totalDemandKw } = useEnergyStore();

  // ── Runtime line measurement ──────────────────────────
  const containerRef = useRef(null);
  const iconRefs     = useRef({});
  const [lineData, setLineData] = useState({ viewBox: '0 0 100 100', lines: [] });

  const calcLines = useCallback(() => {
    const cEl = containerRef.current;
    if (!cEl) return;
    const cRect = cEl.getBoundingClientRect();
    const { width: W, height: H } = cRect;
    if (!W || !H) return;

    const toLocal = r => ({
      left: r.left - cRect.left, top: r.top - cRect.top,
      right: r.right - cRect.left, bottom: r.bottom - cRect.top,
      width: r.width, height: r.height,
    });

    const lines = CONNECTIONS.map(({ id, from, fromSide, to, toSide, dur, fromOffset = 0, toOffset = 0, reverseWhen, label }) => {
      const fEl = iconRefs.current[from];
      const tEl = iconRefs.current[to];
      if (!fEl || !tEl) return null;
      let sp = sidePoint(toLocal(fEl.getBoundingClientRect()), fromSide, fromOffset);
      let ep = sidePoint(toLocal(tEl.getBoundingClientRect()), toSide,   toOffset);
      
      const midpoint = { x: (sp.x + ep.x) / 2, y: (sp.y + ep.y) / 2 };
      
      // Determine flow direction based on batteryMode
      const currentMode = useEnergyStore.getState().batteryMode;
      const isReversed = reverseWhen && currentMode === reverseWhen;
      const actualPath = isReversed ? buildPath(ep, sp) : buildPath(sp, ep);

      return { id, path: actualPath, sp, ep, dur, midpoint, label };
    }).filter(Boolean);

    setLineData({ viewBox: `0 0 ${Math.round(W)} ${Math.round(H)}`, lines });
  }, []);

  useLayoutEffect(() => {
    calcLines();
    const ro = new ResizeObserver(calcLines);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [calcLines]);

  return (
    <div className="ei-container" ref={containerRef}>

      {/* ── Layer 0: ship background ── */}
      <img src={Background} className="ei-bg" alt="" />

      {/* ── Layer 1: heading bar ── */}
      <div className="ei-heading">ENERGY INDEX</div>

      {/* ── Layer 2: connection lines + flow animation ── */}
      <svg className="ei-lines" viewBox={lineData.viewBox} preserveAspectRatio="none">
        {lineData.lines.map(({ id, path, sp, ep }) => (
          <g key={id}>
            <path d={path} className="ei-line" />
            <circle cx={sp.x} cy={sp.y} r="4" className="ei-line-dot" />
            <circle cx={ep.x} cy={ep.y} r="4" className="ei-line-dot" />
          </g>
        ))}

        {showEnergyFlow && lineData.lines.map(({ id, path, dur, label, midpoint }) => (
          <g key={`flow-group-${id}`}>
            <circle r="5" className="ei-flow-dot">
              <animateMotion dur={dur} repeatCount="indefinite" path={path} />
            </circle>
            {/* Percentage Label Overlay */}
            <text 
              x={midpoint.x} 
              y={midpoint.y - 12} 
              className="ei-line-label"
              textAnchor="middle"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>

      {/* ── Layer 3: equipment icons ── */}
      {ELEMENTS.map(({ id, src, alt, label, left, top, cls, offsetX, offsetY, noLabel }) => (
        <div
          key={id}
          className="ei-element"
          style={{
            left: offsetX ? `calc(${left}% + ${offsetX}px)` : `${left}%`,
            top: offsetY ? `calc(${top}% + ${offsetY}px)` : `${top}%`,
          }}
          onClick={() => {
            if (id === 'bridge' && onBridgeClick) {
              onBridgeClick();
            } else if (id === 'ess' && onEssClick) {
              onEssClick();
            } else {
              setActivePopup(id);
            }
          }}
        >
          <img ref={el => { iconRefs.current[id] = el; }} src={src} alt={alt} className={cls} />
          {!noLabel && <span className="ei-label">{label}</span>}
        </div>
      ))}

      {/* ── Solar + H₂ shared label, centered between the two icons ── */}
      <span
        className="ei-label ei-renewable-label"
        style={{ left: '19.5%', top: 'calc(22% + 60px)' }}
      >
        RENEWABLE ENERGY
      </span>

      {/* ── Popup modal ── */}
      {activePopup && (
        <div className="ei-overlay" onClick={() => setActivePopup(null)}>
          <div className="ei-modal" onClick={e => e.stopPropagation()}>
            <div className="ei-modal-head">
              <span>{activePopup.toUpperCase()} Details</span>
              <button onClick={() => setActivePopup(null)}>✕</button>
            </div>
            <div className="ei-modal-content">
              {activePopup === 'engine' && <p>Total Running Power: {engineKw.toLocaleString()} kW</p>}
              {activePopup === 'ess' && <p>Battery Power Output: {batteryKw.toLocaleString()} kW</p>}
              {activePopup === 'cpp' && <p>Propulsion Demand: {propulsionKw.toLocaleString()} kW</p>}
              {activePopup === 'hotel' && <p>Hotel Load: {(totalDemandKw - propulsionKw).toLocaleString()} kW</p>}
              {(!['engine','ess','cpp','hotel'].includes(activePopup)) && <p>System Nominal. Power Flow OK.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnergyIndex;
