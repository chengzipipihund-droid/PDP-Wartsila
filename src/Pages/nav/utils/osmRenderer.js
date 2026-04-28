/**
 * osmRenderer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure Canvas2D drawing functions for OSM coastline data.
 * All functions receive the viewport-transform helpers (mx, my, W, H)
 * from MapCanvas so they integrate seamlessly into the existing draw loop.
 *
 * HOW COASTLINE POLYGONS CLOSE
 * ─────────────────────────────
 * OSM coastline ways are open chains — they don't form a closed polygon by
 * themselves.  To paint the land area, we close each chain by routing its
 * endpoints around the nearest corner of the canvas bounding box:
 *
 *   chain end ──► nearest bbox corner(s) ──► off-canvas right/top ──► chain start
 *
 * This works because the Naantali peninsula is the right-hand land mass.
 * The chain direction (per OSM convention) keeps land to the LEFT.
 * We therefore close with the right / top canvas edges to flood-fill land.
 */

/**
 * Draw OSM coastline chains as filled land polygons.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{pts: Array<{x,y}>, isClosed: boolean}>} coastlines  - assembled chain objects
 * @param {Function} mx  - world-x → canvas-x
 * @param {Function} my  - world-y → canvas-y
 * @param {number}   W   - canvas width
 * @param {number}   H   - canvas height
 */
export function drawOSMCoastlines(ctx, coastlines, mx, my, W, H) {
  if (!coastlines?.length) return;

  ctx.save();
  ctx.fillStyle   = '#C8D0D6';
  ctx.strokeStyle = 'rgba(120,150,180,0.4)';
  ctx.lineWidth   = 1;

  coastlines.forEach(chain => {
    const pts = chain.pts || chain;
    if (!pts || pts.length < 2) return;

    ctx.beginPath();
    pts.forEach((pt, i) => {
      const cx = mx(pt.x), cy = my(pt.y);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });

    if (chain.isClosed) {
      // It's a large island or a closed loop of coastline
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Open segments (e.g. mainland coast clipped by viewport).
      // Heuristic for Naantali: The main landmass is on the EAST.
      // If the chain starts or ends on the East half of the screen, we treat it as mainland.
      const avgX = (pts[0].x + pts[pts.length - 1].x) / 2;
      if (avgX > 0.65) {
        ctx.lineTo(W + 100, my(pts[pts.length - 1].y));
        ctx.lineTo(W + 100, -100);
        ctx.lineTo(mx(pts[0].x), -100);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Just draw the line, don't fill (likely part of an island that was clipped)
        ctx.stroke();
      }
    }
  });

  ctx.restore();
}

/**
 * Draw OSM island polygons.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<Array<{x,y}>>} islands
 * @param {Function} mx
 * @param {Function} my
 * @param {number}  [zoom=1]  - current zoom multiplier (for label scaling)
 */
export function drawOSMIslands(ctx, islands, mx, my, zoom = 1) {
  if (!islands?.length) return;

  ctx.save();

  islands.forEach(ring => {
    if (ring.length < 3) return;

    ctx.beginPath();
    ring.forEach((pt, i) => {
      const cx = mx(pt.x), cy = my(pt.y);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();

    ctx.fillStyle   = '#C8D0D6';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,150,180,0.3)';
    ctx.lineWidth   = 0.6;
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Draw harbour / ferry-terminal footprints with a distinct tint.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<Array<{x,y}>>} harbour
 * @param {Function} mx
 * @param {Function} my
 */
export function drawOSMHarbour(ctx, harbour, mx, my) {
  if (!harbour?.length) return;

  ctx.save();

  harbour.forEach(ring => {
    if (ring.length < 2) return;

    ctx.beginPath();
    ring.forEach((pt, i) => {
      const cx = mx(pt.x), cy = my(pt.y);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();

    ctx.fillStyle   = 'rgba(100,120,150,0.25)';
    ctx.fill();
    ctx.strokeStyle = '#4478aa';
    ctx.lineWidth   = 1.2;
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Draw a debug overlay that shows the OSM bounding box + coordinate grid
 * labelled with lat/lon values.  Call only during development.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} mx
 * @param {Function} my
 * @param {import('./osmConfig').BBOX} bbox
 */
export function drawOSMDebugGrid(ctx, mx, my, bbox) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,100,100,0.25)';
  ctx.lineWidth   = 0.5;
  ctx.setLineDash([4, 4]);

  // Vertical lon lines every 0.05°
  const lonStep = 0.05;
  for (let lon = bbox.LON_MIN; lon <= bbox.LON_MAX + 0.001; lon += lonStep) {
    const x = (lon - bbox.LON_MIN) / (bbox.LON_MAX - bbox.LON_MIN);
    ctx.beginPath();
    ctx.moveTo(mx(x), 0); ctx.lineTo(mx(x), 9999);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,100,100,0.5)';
    ctx.font      = '8px monospace';
    ctx.fillText(lon.toFixed(2) + '°E', mx(x) + 2, 10);
  }

  // Horizontal lat lines every 0.03°
  const latStep = 0.03;
  for (let lat = bbox.LAT_MIN; lat <= bbox.LAT_MAX + 0.001; lat += latStep) {
    const y = (bbox.LAT_MAX - lat) / (bbox.LAT_MAX - bbox.LAT_MIN);
    ctx.beginPath();
    ctx.moveTo(0, my(y)); ctx.lineTo(9999, my(y));
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,100,100,0.5)';
    ctx.fillText(lat.toFixed(2) + '°N', 2, my(y) - 2);
  }

  ctx.setLineDash([]);
  ctx.restore();
}
