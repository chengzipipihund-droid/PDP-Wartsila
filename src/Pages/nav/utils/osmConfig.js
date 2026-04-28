/**
 * osmConfig.js
 * Geographic bounding box for the Naantali simulation area, calibrated so
 * that world-coord (0,0)–(1,1) maps precisely to the Naantali archipelago.
 *
 * Anchor verification:
 *   Naantali ferry terminal  60.4679 N, 22.0241 E → world (0.815, 0.630) ✓
 *   WP-2 "Lövskär narrows"  60.465  N, 21.864  E → world (0.280, 0.650) ✓
 *   WP-3 "Innamo turn"      60.499  N, 21.945  E → world (0.550, 0.461) ✓
 */
export const BBOX = {
  LAT_MIN: 60.402,
  LAT_MAX: 60.582,
  LON_MIN: 21.780,
  LON_MAX: 22.080,
};

/** Convert WGS-84 lon/lat → normalised world coords {x, y} */
export function geoToWorld(lon, lat) {
  return {
    x: (lon - BBOX.LON_MIN) / (BBOX.LON_MAX - BBOX.LON_MIN),
    y: (BBOX.LAT_MAX - lat) / (BBOX.LAT_MAX - BBOX.LAT_MIN),
  };
}

/** Convert normalised world coords → WGS-84 {lon, lat} (useful for debugging) */
export function worldToGeo(x, y) {
  return {
    lon: BBOX.LON_MIN + x * (BBOX.LON_MAX - BBOX.LON_MIN),
    lat: BBOX.LAT_MAX - y * (BBOX.LAT_MAX - BBOX.LAT_MIN),
  };
}

/**
 * Overpass QL query — fetches everything needed to render the port area:
 *   1. Coastline ways  (natural=coastline)
 *   2. Island land polygons (place=island / place=islet)
 *   3. Ferry terminal footprint
 *   4. Harbour / marina areas
 *
 * Bbox format: (south, west, north, east)
 */
export const OVERPASS_QUERY = `
[out:json][timeout:30];
(
  way["natural"="coastline"]
    (${BBOX.LAT_MIN},${BBOX.LON_MIN},${BBOX.LAT_MAX},${BBOX.LON_MAX});
  relation["natural"="coastline"]
    (${BBOX.LAT_MIN},${BBOX.LON_MIN},${BBOX.LAT_MAX},${BBOX.LON_MAX});
  way["place"~"island|islet"]
    (${BBOX.LAT_MIN},${BBOX.LON_MIN},${BBOX.LAT_MAX},${BBOX.LON_MAX});
  relation["place"~"island|islet"]
    (${BBOX.LAT_MIN},${BBOX.LON_MIN},${BBOX.LAT_MAX},${BBOX.LON_MAX});
  way["landuse"="harbour"]
    (${BBOX.LAT_MIN},${BBOX.LON_MIN},${BBOX.LAT_MAX},${BBOX.LON_MAX});
  way["amenity"="ferry_terminal"]
    (${BBOX.LAT_MIN},${BBOX.LON_MIN},${BBOX.LAT_MAX},${BBOX.LON_MAX});
);
out geom;
`.trim();

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/** localStorage cache key — bump version suffix to force re-fetch */
export const OSM_CACHE_KEY = 'osm_naantali_v3';
/** Cache TTL: 24 hours */
export const OSM_CACHE_TTL = 86_400_000;
