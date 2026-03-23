import { useRef, useEffect } from 'react';
import { _physics, canvasDraw } from '../../stores/useShipStore';
import { ROUTE, CORRIDOR_WIDTH, ISLANDS } from '../../utils/constants';

// Viewport — zoomed into final approach (WP-3 → Naantali berth), ~1.9× zoom
const VP = { x0: 0.45, y0: 0.30, x1: 0.97, y1: 0.85 };

export default function MapCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W, H;

    function resize() {
      const d = devicePixelRatio || 1;
      const r = canvas.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * d; canvas.height = H * d;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let t = 0;

    function draw() {
      t += 0.016;
      const ship = _physics;

      // Viewport transform helpers
      const scX = W / (VP.x1 - VP.x0);
      const scY = H / (VP.y1 - VP.y0);
      const mx = n => (n - VP.x0) * scX;
      const my = n => (n - VP.y0) * scY;

      // Island radius zoom factors
      const izX = 1 / (VP.x1 - VP.x0);
      const izY = 1 / (VP.y1 - VP.y0);

      // Background
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(30,55,95,0.07)';
      ctx.lineWidth = 0.3;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Islands
      ISLANDS.forEach(isl => {
        ctx.beginPath();
        ctx.ellipse(mx(isl.x), my(isl.y), isl.w / 2 * izX, isl.h / 2 * izY, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#111a2d'; ctx.fill();
        ctx.strokeStyle = 'rgba(80,120,170,0.15)'; ctx.lineWidth = 0.5; ctx.stroke();
        if (isl.name) {
          ctx.font = '300 7px "JetBrains Mono"';
          ctx.fillStyle = 'rgba(70,100,150,0.25)';
          ctx.textAlign = 'center';
          ctx.fillText(isl.name, mx(isl.x), my(isl.y) + 3);
        }
      });

      // Land (Naantali coast)
      ctx.beginPath();
      ctx.moveTo(mx(0.6), -100);
      ctx.quadraticCurveTo(mx(0.58), my(0.2), mx(0.65), my(0.35));
      ctx.quadraticCurveTo(mx(0.75), my(0.42), mx(0.84), my(0.52));
      ctx.lineTo(mx(0.84), my(0.72));
      ctx.lineTo(W + 100, my(0.72));
      ctx.lineTo(W + 100, -100);
      ctx.closePath();
      ctx.fillStyle = '#111a2d'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx(0.6), -100);
      ctx.quadraticCurveTo(mx(0.58), my(0.2), mx(0.65), my(0.35));
      ctx.quadraticCurveTo(mx(0.75), my(0.42), mx(0.84), my(0.52));
      ctx.strokeStyle = 'rgba(80,120,170,0.2)'; ctx.lineWidth = 1; ctx.stroke();

      // Berth
      ctx.beginPath();
      ctx.moveTo(mx(0.83), my(0.56)); ctx.lineTo(mx(0.83), my(0.70));
      ctx.strokeStyle = '#4478aa'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = '500 7px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(80,120,170,0.3)'; ctx.textAlign = 'center';
      ctx.fillText('NAANTALI', mx(0.83) + 22, my(0.63));

      // AI Corridor (width varies)
      ROUTE.forEach((p, i) => {
        if (i >= ROUTE.length - 1) return;
        const next = ROUTE[i + 1];
        const cw = CORRIDOR_WIDTH[i] * 45 * izX;
        const cx = mx((p.x + next.x) / 2);
        const cy = my((p.y + next.y) / 2);
        ctx.beginPath(); ctx.arc(cx, cy, cw, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,214,138,${0.02 + CORRIDOR_WIDTH[i] * 0.015})`;
        ctx.fill();
      });

      // Corridor center line
      ctx.beginPath();
      ROUTE.forEach((p, i) => i === 0 ? ctx.moveTo(mx(p.x), my(p.y)) : ctx.lineTo(mx(p.x), my(p.y)));
      ctx.strokeStyle = 'rgba(34,214,138,0.1)'; ctx.lineWidth = 0.8; ctx.stroke();

      // Corridor edges (dashed)
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(34,214,138,0.15)'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ROUTE.forEach((p, i) => i === 0 ? ctx.moveTo(mx(p.x), my(p.y)) : ctx.lineTo(mx(p.x), my(p.y)));
      ctx.stroke();
      ctx.setLineDash([]);

      // Waypoints
      ROUTE.forEach((wp, i) => {
        if (!wp.name) return;
        const px = mx(wp.x), py = my(wp.y);
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

        ctx.font = '400 7px "JetBrains Mono"';
        ctx.fillStyle = isNext ? '#22d68a' : 'rgba(100,130,170,0.3)';
        ctx.textAlign = 'center';
        ctx.fillText(wp.name, px, py - 10);
      });

      // Ship
      const sx = mx(ship.x), sy = my(ship.y);
      const sa = (ship.heading - 90) * Math.PI / 180;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(sa);
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(-5, 8); ctx.lineTo(5, 8); ctx.closePath();
      ctx.fillStyle = 'rgba(59,139,255,0.6)'; ctx.fill();
      ctx.strokeStyle = 'rgba(59,139,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.shadowColor = 'rgba(59,139,255,0.4)'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -26);
      ctx.strokeStyle = 'rgba(59,139,255,0.2)'; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.restore();
    }

    // Register draw function for game loop (no own rAF loop)
    canvasDraw.fn = draw;
    draw(); // initial render

    return () => {
      canvasDraw.fn = null;
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#080e1c', borderRight: '1px solid var(--brd)', borderBottom: '1px solid var(--brd)' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
