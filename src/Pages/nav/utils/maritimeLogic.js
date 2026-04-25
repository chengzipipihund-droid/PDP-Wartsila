import { ROUTE } from './constants';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function withOffset(route, dx, dy) {
  return route.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

// Extra traffic lanes used by the map overlay.
export const MOCK_ROUTES = [
  withOffset(ROUTE, -0.06, -0.04),
  withOffset(ROUTE, 0.03, -0.07),
  withOffset(ROUTE, -0.02, 0.06),
];

export function interpolateRoute(route, progress) {
  if (!Array.isArray(route) || route.length === 0) return { x: 0, y: 0 };
  if (route.length === 1) return { x: route[0].x, y: route[0].y };

  const t = clamp01(progress);
  const scaled = t * (route.length - 1);
  const i = Math.floor(scaled);
  const j = Math.min(route.length - 1, i + 1);
  const localT = scaled - i;

  const a = route[i];
  const b = route[j];

  return {
    x: a.x + (b.x - a.x) * localT,
    y: a.y + (b.y - a.y) * localT,
  };
}

export function routeHeading(route, progress) {
  if (!Array.isArray(route) || route.length < 2) return 0;

  const t0 = clamp01(progress);
  const t1 = clamp01(progress + 0.01);

  const p0 = interpolateRoute(route, t0);
  const p1 = interpolateRoute(route, t1);

  return (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
}
