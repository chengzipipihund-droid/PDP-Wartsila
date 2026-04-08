import { useRef, useEffect, useState } from 'react';
import { _physics, canvasDraw, useStore } from '../../stores/useShipStore';
import { ROUTE, CORRIDOR_WIDTH } from '../../utils/constants';
import { MOCK_ROUTES, interpolateRoute, routeHeading } from '../../utils/maritimeLogic';
import vesselSvgUrl from './Vessel-TopView.svg';

// ── Hardcoded Naantali coastline polygons (world coords 0-1) ──────────────────
// Traced from MarineTraffic satellite view of Naantali Sound.
// Coordinate system: x=(lon-21.780)/0.300, y=(60.582-lat)/0.180
// Anchor: Naantali ferry terminal 60.4679N 22.0241E → world (0.815, 0.630) ✓

// Luonnonmaa island — east shore (west bank of Naantali Sound) + full perimeter
const LUONNONMAA_PTS = [
  // East shore — north tip → south tip (west bank of sound)
  [0.773, 0.422], [0.777, 0.450], [0.770, 0.478], [0.773, 0.500],
  [0.773, 0.528], [0.777, 0.550], [0.783, 0.572], [0.787, 0.594],
  [0.787, 0.611], [0.783, 0.628], [0.780, 0.644], [0.780, 0.667],
  [0.783, 0.683], [0.790, 0.700], [0.793, 0.717],
  // South shore + west shore — closing anti-clockwise back to north tip
  [0.787, 0.733], [0.760, 0.739], [0.727, 0.722], [0.710, 0.700],
  [0.700, 0.667], [0.700, 0.628], [0.700, 0.594], [0.700, 0.550],
  [0.700, 0.500], [0.703, 0.461], [0.710, 0.433], [0.723, 0.422],
  [0.740, 0.417], [0.760, 0.417],
];

// Naantali mainland — west-facing shore of the peninsula (east bank of sound)
// Polygon closes off-screen to the right/top to flood-fill the entire land mass.
const MAINLAND_PTS = [
  [0.800, -0.20], [0.800, 0.433], [0.803, 0.461], [0.807, 0.494],
  [0.810, 0.522], [0.813, 0.544], [0.820, 0.561], [0.823, 0.578],
  [0.827, 0.594], [0.826, 0.611], [0.817, 0.630],   // ← berth face ≈ WP-4
  [0.813, 0.644], [0.815, 0.661], [0.820, 0.678],
  [0.827, 0.694], [0.833, 0.711], [0.843, 0.733],
  [1.20, 0.900], [1.20, -0.20],
];

// ── Viewport initial zoom ─────────────────────────────────────────────────────
const INITIAL_VP = { x0: 0.772, y0: 0.668, x1: 0.828, y1: 0.732 };

// ── Berth world coords (centre of the dock) ───────────────────────────────────
const BERTH = { x: 0.815, y: 0.63 };

// Auto-zoom kicks in from routeProgress=0.80, reaching 2.5× at routeProgress=0.95
const ZOOM_START = 0.80;
const ZOOM_FINAL = 2.5;

// ── Mock ships: each follows one of MOCK_ROUTES ───────────────────────────────
// speed is route-progress units per frame (60 fps).
// 100–150 RPM ≈ 20–30% of max → similar proportion of route-traversal speed.

export default function MapCanvas({ style }) {
  const canvasRef      = useRef(null);
  const vesselImgRef   = useRef(null);
  const vpRef          = useRef({ ...INITIAL_VP });
  // Track last manual wheel time to temporarily suppress auto-zoom
  const lastWheelRef   = useRef(0);
  // Gate: post to alarm page only ONCE per voyage (reset on resetVoyage)
  const alarmSentRef   = useRef(false);

  // ── Zustand subscriptions (React state for overlay re-renders) ────────────
  const wp4Passed   = useStore(s => s.wp4Passed);
  const setAutoMode = useStore(s => s.setAutoMode);
  const docked      = useStore(s => s.docked);
  // Track voyageStartTime so we can snap viewport back on reset
  const voyageStartTime = useStore(s => s.voyageStartTime);

  const [showBotMsg, setShowBotMsg]   = useState(true);
  const [botMessage, setBotMessage]   = useState({
    title: 'Fleet Ops (HQ)',
    text: 'Connection verified.<br/><span style="color:var(--tx2);font-size:9px">No new directives. Proceed to Naantali.</span>',
    color: '#4478aa',
    dot: 'var(--grn)'
  });
  // Dismissed-once flag for auto-berth button (per voyage)
  const [autoBerthDismissed, setAutoBerthDismissed] = useState(false);

  // ── Auto-dismiss bot message ──────────────────────────────────────────────
  useEffect(() => {
    if (showBotMsg) {
      const timer = setTimeout(() => setShowBotMsg(false), 30000);
      return () => clearTimeout(timer);
    }
  }, [showBotMsg]);

  // ── Reset viewport on new voyage ─────────────────────────────
  useEffect(() => {
    vpRef.current        = { ...INITIAL_VP };
    alarmSentRef.current = false;
    setAutoBerthDismissed(false);
  }, [voyageStartTime]);

  // ── Canvas setup + draw loop ──────────────────────────────────────────────
  useEffect(() => {
    const img  = new Image();
    img.src    = vesselSvgUrl;
    vesselImgRef.current = img;

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H;

    function resize() {
      const d = devicePixelRatio || 1;
      const r = canvas.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width  = W * d; canvas.height = H * d;
      canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Manual wheel zoom (suppresses auto-zoom for 4 s) ─────────────────
    const onWheel = (e) => {
      e.preventDefault();
      lastWheelRef.current = performance.now();
      const rect = canvas.getBoundingClientRect();
      const fx   = (e.clientX - rect.left)  / rect.width;
      const fy   = (e.clientY - rect.top)   / rect.height;
      const vp   = vpRef.current;
      const cw   = vp.x1 - vp.x0;
      const ch   = vp.y1 - vp.y0;
      const worldX = vp.x0 + fx * cw;
      const worldY = vp.y0 + fy * ch;
      const factor = e.deltaY > 0 ? 1.015 : 0.985;
      const newCw  = Math.min(Math.max(cw * factor, 0.04), 1.5);
      const newCh  = Math.min(Math.max(ch * factor, 0.04), 1.5);
      vp.x0 = worldX - fx * newCw;  vp.x1 = vp.x0 + newCw;
      vp.y0 = worldY - fy * newCh;  vp.y1 = vp.y0 + newCh;
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    
    // ── Double click to reset view ──────────────────────────────────────
    const onDoubleClick = () => {
      vpRef.current = { ...INITIAL_VP };
    };
    canvas.addEventListener('dblclick', onDoubleClick);

    let t = 0;

    function draw() {
      t += 0.016;
      const ship = _physics;
      const vp   = vpRef.current;

      // ── Auto-follow and auto-zoom logic ────────────────────────────────
      const sinceWheel = performance.now() - lastWheelRef.current;
      if (sinceWheel > 4000 && !ship.docked) {
        let zoomMul = 1.0;
        // Apply additional zoom during the final approach phase
        if (ship.routeProgress > ZOOM_START && ship.routeProgress <= 0.95) {
          const zoomT = Math.min(1, (ship.routeProgress - ZOOM_START) / (0.95 - ZOOM_START));
          zoomMul = 1 + (ZOOM_FINAL - 1) * zoomT;
        }

        const baseW = INITIAL_VP.x1 - INITIAL_VP.x0;
        const baseH = INITIAL_VP.y1 - INITIAL_VP.y0;
        const tgtW = baseW / zoomMul;
        const tgtH = baseH / zoomMul;

        // Always center the view on the ship's current position
        const cx = ship.x;
        const cy = ship.y;

        const tgtVP = {
          x0: cx - tgtW / 2,
          x1: cx + tgtW / 2,
          y0: cy - tgtH / 2,
          y1: cy + tgtH / 2,
        };

        const lf = ship.docked ? 0.04 : 0.02; // Use a slightly faster lerp for smoother following
        vp.x0 += (tgtVP.x0 - vp.x0) * lf;
        vp.x1 += (tgtVP.x1 - vp.x1) * lf;
        vp.y0 += (tgtVP.y0 - vp.y0) * lf;
        vp.y1 += (tgtVP.y1 - vp.y1) * lf;
      }

      // ── Viewport helpers ─────────────────────────────────────────────────
      const scX  = W / (vp.x1 - vp.x0);
      const scY  = H / (vp.y1 - vp.y0);
      const mx   = n => (n - vp.x0) * scX;
      const my   = n => (n - vp.y0) * scY;
      const zoomLevel = (INITIAL_VP.x1 - INITIAL_VP.x0) / (vp.x1 - vp.x0);

      const izX  = 1 / (vp.x1 - vp.x0);   // used for corridor glow width

      // ── Background (Ocean) ───────────────────────────────────────────────
      ctx.fillStyle = '#D0E0EE';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(100,120,150,0.1)';
      ctx.lineWidth   = 0.3;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ── Hardcoded coastlines (traced from MarineTraffic satellite view) ──────
      const drawPoly = (pts) => {
        ctx.beginPath();
        pts.forEach(([wx, wy], i) =>
          i === 0 ? ctx.moveTo(mx(wx), my(wy)) : ctx.lineTo(mx(wx), my(wy))
        );
        ctx.closePath();
        ctx.fillStyle   = '#C8D0D6'; ctx.fill();
        ctx.strokeStyle = 'rgba(120,150,180,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      };
      drawPoly(LUONNONMAA_PTS);  // Luonnonmaa island (west bank of Naantali Sound)
      drawPoly(MAINLAND_PTS);    // Naantali mainland (east bank of sound + port)

      // ── Berth marker ─────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(mx(0.815), my(0.56)); ctx.lineTo(mx(0.815), my(0.70));
      ctx.strokeStyle = '#4478aa'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font        = '500 7px "JetBrains Mono"';
      ctx.fillStyle   = 'rgba(80,120,170,0.3)'; ctx.textAlign = 'center';
      ctx.fillText('NAANTALI', mx(0.815) + 22, my(0.63));

      // ── Extra berth detail when zoomed in ────────────────────────────────
      if (zoomLevel > 1.8) {
        const alpha = Math.min(1, (zoomLevel - 1.8) / 0.7);
        // Dock bollards
        [0.57, 0.60, 0.63, 0.66, 0.69].forEach(dy => {
          ctx.beginPath();
          ctx.arc(mx(0.83), my(dy), 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(80,120,170,${alpha * 0.7})`; ctx.fill();
        });
        // Terminal building outline
        ctx.strokeStyle = `rgba(80,120,170,${alpha * 0.25})`;
        ctx.lineWidth   = 1;
        ctx.strokeRect(mx(0.84), my(0.57), mx(0.90) - mx(0.84), my(0.68) - my(0.57));
        ctx.font      = `500 ${Math.round(7 * Math.min(zoomLevel, 2.5) / 2)}px "JetBrains Mono"`;
        ctx.fillStyle = `rgba(80,120,170,${alpha * 0.5})`;
        ctx.textAlign = 'center';
        ctx.fillText('TERMINAL', mx(0.87), my(0.62));
        // Approach depth marker
        ctx.font      = '300 6px "JetBrains Mono"';
        ctx.fillStyle = `rgba(60,100,160,${alpha * 0.5})`;
        ctx.fillText('≈ 9.5 m', mx(0.79), my(0.63));
      }

      // ── AI Corridor glow ─────────────────────────────────────────────────
      ROUTE.forEach((p, i) => {
        if (i >= ROUTE.length - 1) return;
        const next = ROUTE[i + 1];
        const cw   = CORRIDOR_WIDTH[i] * 45 * izX;
        const cx   = mx((p.x + next.x) / 2);
        const cy   = my((p.y + next.y) / 2);
        ctx.beginPath(); ctx.arc(cx, cy, cw, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,214,138,${0.02 + CORRIDOR_WIDTH[i] * 0.015})`;
        ctx.fill();
      });

      // ── Green corridor centre line ────────────────────────────────────────
      ctx.beginPath();
      ROUTE.forEach((p, i) =>
        i === 0 ? ctx.moveTo(mx(p.x), my(p.y)) : ctx.lineTo(mx(p.x), my(p.y))
      );
      ctx.strokeStyle = '#22D68A'; ctx.lineWidth = 1.6;
      ctx.setLineDash([8, 6]); ctx.stroke();

      // Corridor edges (dashed)
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(34,214,138,0.25)'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ROUTE.forEach((p, i) =>
        i === 0 ? ctx.moveTo(mx(p.x), my(p.y)) : ctx.lineTo(mx(p.x), my(p.y))
      );
      ctx.stroke();

      // ── Gray traffic routes ──────────────────────────────────────────────
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(140,150,170,0.6)'; ctx.lineWidth = 1;
      MOCK_ROUTES.forEach(route => {
        ctx.beginPath();
        route.forEach((p, i) => i === 0 ? ctx.moveTo(mx(p.x), my(p.y)) : ctx.lineTo(mx(p.x), my(p.y)));
        ctx.stroke();
      });

      ctx.setLineDash([]);

      // ── Waypoints ────────────────────────────────────────────────────────
      ROUTE.forEach((wp, i) => {
        if (!wp.name) return;
        const px    = mx(wp.x), py = my(wp.y);
        const wpProg = i / (ROUTE.length - 1);
        const isPassed = wpProg < ship.routeProgress - 0.02;
        const isNext   = !isPassed && wpProg < ship.routeProgress + 0.15;

        if (isPassed) {
          ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100,130,170,0.2)'; ctx.fill();
        } else if (isNext) {
          const pr = 5 + Math.sin(t * 3) * 2;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(34,214,138,0.25)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#22d68a'; ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(100,130,170,0.3)'; ctx.lineWidth = 0.7; ctx.stroke();
        }

        ctx.font      = '400 7px "JetBrains Mono"';
        ctx.fillStyle = isNext ? '#22d68a' : 'rgba(100,130,170,0.3)';
        ctx.textAlign = 'center';
        ctx.fillText(wp.name, px, py - 10);
      });

      // ── Mock ships (state from useShipStore) ──────────────────────
      _physics.mockShips.forEach(ms => {
        const route = MOCK_ROUTES[ms.routeIdx];

        // Position and progress are updated in the store's tick function.
        // We just need to read the state and draw.

        const heading = routeHeading(route, ms.progress);
        const mh      = heading * Math.PI / 180;

        const spx = mx(ms.x);
        const spy = my(ms.y);

        // Proximity check (2 NM ≈ 0.185 world units)
        const distSq = (ms.x - ship.x) ** 2 + (ms.y - ship.y) ** 2;
        if (distSq < 0.185 ** 2 && !ms.alarmed) {
          ms.alarmed = true;
          setBotMessage({
            title: 'PROXIMITY ALERT',
            text: `${ms.id} within 2 NM.<br/><span style="color:#E57373;font-size:9px">Monitor and maintain safe distance.</span>`,
            color: '#E57373',
            dot: '#E57373'
          });
          setShowBotMsg(true);
          // Post to alarm page only once per voyage regardless of how many ships trigger
          if (!alarmSentRef.current) {
            alarmSentRef.current = true;
            fetch('/api/alarms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                description: `AIS Proximity: ${ms.id} within 2 NM`,
                severity: 'red', type: 'Navigation',
                state: 'active', responsibility: 'Bridge', person: 'Duty Officer',
              })
            }).catch(() => {});
          }
        }

        // Draw ship triangle oriented along route heading
        const v_dx = -Math.cos(mh) * scX;
        const v_dy = -Math.sin(mh) * scY;
        const sa   = Math.atan2(v_dy, v_dx) + Math.PI / 2;

        ctx.save();
        ctx.translate(spx, spy);
        ctx.rotate(sa);
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(-2.5, 3); ctx.lineTo(2.5, 3); ctx.closePath();
        ctx.fillStyle   = ms.alarmed ? '#E57373' : ms.color; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.restore();

        ctx.font      = '300 6px "JetBrains Mono"';
        ctx.fillStyle = ms.alarmed ? '#E57373' : 'rgba(100,120,150,0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(ms.id, spx, spy - 7);
      });

      // ── Proximity alarm overlay (drawn between alarmed vessel and Finnsirius) ──
      // Pre-compute player screen coords (needed before the Player ship block below)
      const sxAlarm = mx(ship.x), syAlarm = my(ship.y);
      _physics.mockShips.forEach(ms => {
        if (!ms.alarmed) return;
        const spx = mx(ms.x);
        const spy = my(ms.y);
        const pulse = 0.55 + Math.abs(Math.sin(t * 5)) * 0.45;

        // Red dashed line between ships
        ctx.save();
        ctx.strokeStyle = `rgba(229,115,115,${pulse * 0.8})`;
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sxAlarm, syAlarm);
        ctx.lineTo(spx, spy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pulsing red ring around the nearby vessel
        const ringR = 10 + Math.abs(Math.sin(t * 5)) * 5;
        ctx.strokeStyle = `rgba(229,115,115,${pulse})`;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(spx, spy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Warning label on line midpoint
        const midX = (sxAlarm + spx) / 2;
        const midY = (syAlarm + spy) / 2;
        ctx.fillStyle = `rgba(18,12,12,${pulse * 0.7})`;
        ctx.fillRect(midX - 44, midY - 11, 88, 14);
        ctx.font      = `600 7px "JetBrains Mono"`;
        ctx.fillStyle = `rgba(229,115,115,${pulse})`;
        ctx.textAlign = 'center';
        ctx.fillText(`⚠ PROXIMITY — ${ms.id}`, midX, midY);
        ctx.restore();
      });

      // ── Player ship ───────────────────────────────────────────────────────
      const sx   = mx(ship.x), sy = my(ship.y);
      const H_rad = ship.heading * Math.PI / 180;
      const v_dx  = -Math.cos(H_rad) * scX;
      const v_dy  = -Math.sin(H_rad) * scY;
      const sa    = Math.atan2(v_dy, v_dx) + Math.PI / 2;

      ctx.save(); ctx.translate(sx, sy); ctx.rotate(sa);
      if (vesselImgRef.current?.complete && vesselImgRef.current.naturalWidth > 0) {
        const imgW = 12, imgH = 51;
        ctx.drawImage(vesselImgRef.current, -imgW / 2, -imgH / 2, imgW, imgH);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -12); ctx.lineTo(-5, 8); ctx.lineTo(5, 8); ctx.closePath();
        ctx.fillStyle   = 'rgba(59,139,255,0.6)'; ctx.fill();
        ctx.strokeStyle = 'rgba(59,139,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
    }

    canvasDraw.fn = draw;
    draw();

    return () => {
      canvasDraw.fn = null;
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDoubleClick);
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-berth overlay: visible after WP4, until dismissed or docked ─────
  const showAutoBerth = wp4Passed && !docked && !autoBerthDismissed;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#D0E0EE', borderRight: '1px solid var(--brd)', borderBottom: '1px solid var(--brd)', ...style }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* ── Scale bar ── */}
      <div style={{ position: 'absolute', bottom: 15, left: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ borderLeft: '1.5px solid rgba(100,120,150,0.85)', borderRight: '1.5px solid rgba(100,120,150,0.85)', borderBottom: '1.5px solid rgba(100,120,150,0.85)', height: 6, width: 60 }} />
        <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'rgba(100,120,150,0.95)', marginTop: 3, fontWeight: 600 }}>1 NM</span>
      </div>

      {/* ── AIS info (top right) ── */}
      <div style={{ position: 'absolute', top: 15, right: 15, background: 'rgba(240,248,255,0.85)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brd)', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--tx2)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ fontWeight: 700, color: 'var(--tx)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          FINNSIRIUS AIS
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--grn)', animation: 'slowPulse 3s infinite alternate ease-in-out' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <span>WIND: <b style={{ color: 'var(--blu)' }}>14 kn SSW</b></span>
          <span>CURR: <b style={{ color: '#E57373' }}>0.4 kn NW</b></span>
        </div>
      </div>

      {/* ── Auto-berth button (appears after WP4) ── */}
      {showAutoBerth && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '20px',
          transform: 'translateY(-50%)',
          zIndex: 80,
          background: 'rgba(8,14,28,0.93)',
          border: '1px solid rgba(34,214,138,0.55)',
          borderRadius: 8,
          padding: '10px 16px',
          boxShadow: '0 0 24px rgba(34,214,138,0.15)',
          fontFamily: 'var(--mono)',
          textAlign: 'center',
          minWidth: 180,
        }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: '#22d68a', textTransform: 'uppercase', marginBottom: 6 }}>
            WP-4 — Naantali Approach
          </div>
          <div style={{ fontSize: 10, color: 'rgba(180,200,230,0.8)', marginBottom: 12, lineHeight: 1.5 }}>
            Activate auto-berthing?<br />
            <span style={{ fontSize: 8, color: 'rgba(100,130,170,0.55)' }}>
              AI will reduce speed to 3 kn and<br />align for maximum energy efficiency.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => { setAutoMode(true); setAutoBerthDismissed(true); }}
              style={{
                padding: '6px 14px', fontSize: 10, fontWeight: 700,
                background: 'rgba(34,214,138,0.15)',
                border: '1px solid rgba(34,214,138,0.6)',
                borderRadius: 6, color: '#22d68a', cursor: 'pointer',
                fontFamily: 'var(--mono)', letterSpacing: 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,214,138,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,214,138,0.15)'; }}
            >
              AUTO BERTH
            </button>
            <button
              onClick={() => setAutoBerthDismissed(true)}
              style={{
                padding: '6px 14px', fontSize: 10,
                background: 'rgba(60,90,140,0.12)',
                border: '1px solid rgba(60,90,140,0.3)',
                borderRadius: 6, color: 'rgba(130,160,200,0.7)', cursor: 'pointer',
                fontFamily: 'var(--mono)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(60,90,140,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(60,90,140,0.12)'; }}
            >
              Manual
            </button>
          </div>
        </div>
      )}

      {/* ── Onshore Ops bot (bottom right) ── */}
      <div style={{ position: 'absolute', bottom: 15, right: 15, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 45 }}>
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(163,213,255,0.5)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '8px 12px', borderRadius: '12px 12px 4px 12px',
          marginBottom: 8, fontSize: 10, color: 'var(--tx)',
          fontFamily: 'var(--mono)', width: 170,
          opacity: showBotMsg ? 1 : 0,
          pointerEvents: showBotMsg ? 'auto' : 'none',
          transition: 'opacity 0.8s ease-out',
        }}>
          <div style={{ color: botMessage.color, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: botMessage.dot }} />
              {botMessage.title}
            </div>
            <div style={{ cursor: 'pointer', padding: '0 4px', color: 'var(--tx2)', fontSize: 13, lineHeight: '10px' }}
              onClick={() => setShowBotMsg(false)} title="Dismiss">×</div>
          </div>
          <div dangerouslySetInnerHTML={{ __html: botMessage.text }} />
        </div>
        <div
          style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #E5EDF4, #CFD9E1)', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => setShowBotMsg(v => !v)} title="Contact Onshore Base"
        >
          📡
        </div>
      </div>
    </div>
  );
}
