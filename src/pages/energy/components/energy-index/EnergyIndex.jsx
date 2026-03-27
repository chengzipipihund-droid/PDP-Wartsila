/* ═══════════════════════════════════════════════════════════
   面板：能源索引网络图 | Energy Index Network
   8 个设备节点（Solar / H₂ / Main Engine / CPP / ESS /
   Bridge / Hotel / Bow Thruster）+ 6 条动态连接线。
   ─ 点击 Bridge → 打开杠杆控制面板
   ─ 点击其他节点 → 打开【设备详情弹窗 | Equipment Detail Modal】
   ─ EnergyFlow 开关控制粒子动画开/关
   ═══════════════════════════════════════════════════════════ */
import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import Background from './elements/Background.svg';
import Heading    from './elements/Heading.svg';
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
  { id: 'h2-ess',    from: 'h2',     fromSide: 'right',  to: 'ess',    toSide: 'top',                        dur: '2.6s' },
  { id: 'br-ess',    from: 'bridge', fromSide: 'bottom', to: 'ess',    toSide: 'top',                        dur: '2.5s' },
  { id: 'eng-ess',   from: 'engine', fromSide: 'right',  to: 'ess',    toSide: 'left',  toOffset: -0.25,     dur: '2.0s' },
  { id: 'cpp-ess',   from: 'cpp',    fromSide: 'right',  to: 'ess',    toSide: 'left',  toOffset:  0.25,     dur: '3.0s' },
  { id: 'ess-hotel', from: 'ess',    fromSide: 'right',  to: 'hotel',  toSide: 'left',                       dur: '1.8s' },
  { id: 'ess-bow',   from: 'ess',    fromSide: 'right',  to: 'bow',    toSide: 'left',                       dur: '2.3s' },
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

function EnergyIndex({ showEnergyFlow, onBridgeClick, optimizationMarkers }) {
  const [activePopup, setActivePopup] = useState(null);

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

    const lines = CONNECTIONS.map(({ id, from, fromSide, to, toSide, dur, fromOffset = 0, toOffset = 0 }) => {
      const fEl = iconRefs.current[from];
      const tEl = iconRefs.current[to];
      if (!fEl || !tEl) return null;
      const sp = sidePoint(toLocal(fEl.getBoundingClientRect()), fromSide, fromOffset);
      const ep = sidePoint(toLocal(tEl.getBoundingClientRect()), toSide,   toOffset);
      const midpoint = { x: (sp.x + ep.x) / 2, y: (sp.y + ep.y) / 2 };
      return { id, path: buildPath(sp, ep), sp, ep, dur, midpoint };
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
      <img src={Heading} className="ei-heading" alt="Energy Index" />

      {/* ── Layer 2: connection lines + flow animation ── */}
      <svg className="ei-lines" viewBox={lineData.viewBox} preserveAspectRatio="none">
        {lineData.lines.map(({ id, path, sp, ep }) => (
          <g key={id}>
            <path d={path} className="ei-line" />
            <circle cx={sp.x} cy={sp.y} r="4" className="ei-line-dot" />
            <circle cx={ep.x} cy={ep.y} r="4" className="ei-line-dot" />
          </g>
        ))}

        {showEnergyFlow && lineData.lines.map(({ id, path, dur }) => (
          <circle key={`flow-${id}`} r="5" className="ei-flow-dot">
            <animateMotion dur={dur} repeatCount="indefinite" path={path} />
          </circle>
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

      {/* ── Layer 4: AI optimization badges on connection lines ── */}
      {optimizationMarkers && optimizationMarkers.map(marker => {
        const line = lineData.lines.find(l => l.id === marker.connectionId);
        if (!line) return null;
        const { x, y } = line.midpoint;
        const isPositive = marker.saving.startsWith('+');
        return (
          <div
            key={marker.connectionId}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              animation: 'eo-badge-in 0.35s cubic-bezier(0.22,1,0.36,1) both, eo-badge-glow 2.2s ease-in-out 0.4s infinite',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              background: isPositive ? '#1C3A1C' : '#2A2010',
              border: `1.5px solid ${isPositive ? '#4FBF65' : '#FFB347'}`,
              borderRadius: 8,
              padding: '3px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: isPositive
                ? '0 0 10px rgba(79,191,101,0.45)'
                : '0 0 10px rgba(255,179,71,0.45)',
            }}>
              <span style={{
                color: isPositive ? '#4FBF65' : '#FFB347',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.3,
                lineHeight: 1.2,
              }}>
                {marker.saving}
              </span>
              <span style={{
                color: isPositive ? '#7AC87A' : '#C8965A',
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: 0.5,
                lineHeight: 1.2,
              }}>
                {marker.label}
              </span>
            </div>
          </div>
        );
      })}

      {/* ── Popup modal ── */}
      {activePopup && (
        <div className="ei-overlay" onClick={() => setActivePopup(null)}>
          <div className="ei-modal" onClick={e => e.stopPropagation()}>
            <div className="ei-modal-head">
              <span>{activePopup.toUpperCase()} Details</span>
              <button onClick={() => setActivePopup(null)}>✕</button>
            </div>
            <div className="ei-modal-content">
              <p>这里放 {activePopup} 的详细内容</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnergyIndex;
