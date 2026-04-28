/**
 * useOSMCoastline.js
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that fetches real Naantali coastline data from OSM Overpass API,
 * assembles the way segments into continuous polygon chains, and returns them
 * in normalised world-coord format ready for Canvas2D rendering.
 *
 * Data is cached in localStorage for 24 h to avoid hammering the public API.
 * A hand-drawn fallback is returned if fetch fails (so the map always works).
 *
 * USAGE in a component:
 *   const { coastlines, islands, harbour, loading } = useOSMCoastline();
 *
 *   coastlines  — Array<Array<{x,y}>>  assembled land polygon chains
 *   islands     — Array<Array<{x,y}>>  closed island polygons
 *   harbour     — Array<Array<{x,y}>>  port/terminal footprints
 *   loading     — boolean
 *   error       — Error | null
 */

import { useState, useEffect } from 'react';
import {
  BBOX, OVERPASS_QUERY, OVERPASS_URL,
  OSM_CACHE_KEY, OSM_CACHE_TTL,
  geoToWorld,
} from '../utils/osmConfig';
import { LAND_POLYGON } from '../utils/maritimeLogic';

// ── Fallback: hand-drawn polygon (always available, used if fetch fails) ──────
const FALLBACK_COAST = [LAND_POLYGON.map(([x, y]) => ({ x, y }))];

// ── Snap tolerance for assembling way segments ─────────────────────────────
// Two endpoints are considered the same node if they differ by less than this
// in world units. ~5 m at Naantali latitude ≈ 0.00002 world units.
const SNAP_DIST = 0.0003;

// ──────────────────────────────────────────────────────────────────────────────

export function useOSMCoastline() {
  const [state, setState] = useState({
    coastlines: null,
    islands:    null,
    harbour:    null,
    loading:    false,
    error:      null,
    source:     'none',   // 'cache' | 'network' | 'fallback'
  });

  useEffect(() => {
    // ── 1. Try localStorage cache ──────────────────────────────────────────
    try {
      const raw = localStorage.getItem(OSM_CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < OSM_CACHE_TTL) {
          setState({ ...data, loading: false, error: null, source: 'cache' });
          return;
        }
      }
    } catch {}

    // ── 2. Fetch from Overpass ─────────────────────────────────────────────
    setState(s => ({ ...s, loading: true }));

    fetch(OVERPASS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'data=' + encodeURIComponent(OVERPASS_QUERY),
    })
      .then(r => {
        if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        const processed = processOverpassResponse(json);

        // Cache for 24 h
        try {
          localStorage.setItem(
            OSM_CACHE_KEY,
            JSON.stringify({ data: processed, ts: Date.now() })
          );
        } catch {}

        setState({ ...processed, loading: false, error: null, source: 'network' });
      })
      .catch(err => {
        console.warn('[OSM] Fetch failed, using fallback coastline:', err.message);
        setState({
          coastlines: FALLBACK_COAST,
          islands:    [],
          harbour:    [],
          loading:    false,
          error:      err,
          source:     'fallback',
        });
      });
  }, []);

  return state;
}

// ── Overpass response processor ───────────────────────────────────────────────

function processOverpassResponse(json) {
  const coastWays  = [];
  const islandPolys = [];
  const harbourPolys = [];

  for (const el of json.elements) {
    if (!el.geometry || el.geometry.length < 2) continue;

    // Convert geometry to world coords
    const pts = el.geometry.map(({ lat, lon }) => geoToWorld(lon, lat));

    const tags = el.tags || {};

    if (tags.natural === 'coastline') {
      coastWays.push(pts);
    } else if (
      tags.place === 'island' || tags.place === 'islet' ||
      tags.natural === 'island'
    ) {
      islandPolys.push(pts);
    } else if (
      tags.landuse === 'harbour' || tags.amenity === 'ferry_terminal' ||
      tags.harbour || tags.man_made === 'pier'
    ) {
      harbourPolys.push(pts);
    }
  }

  // Assemble coastline ways into continuous chains
  const coastlines = assembleChains(coastWays);

  // Close each island polygon
  const islands = islandPolys.map(pts => closeRing(pts));

  return { coastlines, islands, harbour: harbourPolys };
}

// ── Chain assembly ────────────────────────────────────────────────────────────
/**
 * Join individual OSM way segments into continuous chains by matching their
 * start/end node positions.
 *
 * OSM convention: land is to the LEFT of the way direction (i.e., ways run
 * counter-clockwise around land when viewed with north up).
 */
function assembleChains(ways) {
  if (!ways.length) return FALLBACK_COAST.map(pts => ({ pts, isClosed: false }));

  const result  = [];
  const used    = new Set();

  for (let si = 0; si < ways.length; si++) {
    if (used.has(si)) continue;

    let chain = [...ways[si]];
    used.add(si);

    // Extend chain forward and backward
    let extended = true;
    while (extended) {
      extended = false;
      const head = chain[0];
      const tail = chain[chain.length - 1];

      for (let i = 0; i < ways.length; i++) {
        if (used.has(i)) continue;
        const w0 = ways[i][0];
        const wN = ways[i][ways[i].length - 1];

        // Tail -> Head of new segment
        if (dist(tail, w0) < SNAP_DIST) {
          chain = chain.concat(ways[i].slice(1));
          used.add(i); extended = true; break;
        }
        // Tail -> Tail of new segment (reverse new)
        if (dist(tail, wN) < SNAP_DIST) {
          chain = chain.concat([...ways[i]].reverse().slice(1));
          used.add(i); extended = true; break;
        }
        // Head -> Tail of new segment
        if (dist(head, wN) < SNAP_DIST) {
          chain = ways[i].concat(chain.slice(1));
          used.add(i); extended = true; break;
        }
        // Head -> Head of new segment (reverse new)
        if (dist(head, w0) < SNAP_DIST) {
          chain = [...ways[i]].reverse().concat(chain.slice(1));
          used.add(i); extended = true; break;
        }
      }
    }

    const first = chain[0], last = chain[chain.length - 1];
    const isClosed = dist(first, last) < SNAP_DIST;
    result.push({ pts: chain, isClosed });
  }

  return result.length ? result : FALLBACK_COAST.map(pts => ({ pts, isClosed: false }));
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function closeRing(pts) {
  if (!pts.length) return pts;
  const first = pts[0], last = pts[pts.length - 1];
  if (dist(first, last) > SNAP_DIST) return [...pts, first];
  return pts;
}
