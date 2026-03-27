// Finnsirius Superstar-class specs
export const SHIP = {
  name: 'Finnsirius',
  length: 235, // meters
  beam: 33.3,
  grossTonnage: 65692,
  enginePower: 4 * 7200, // kW total
  batteryCapacity: 5, // MWh
  iceClass: '1A Super',
  maxSpeed: 20.5, // knots
  designSpeed: 16,
  draft: 7.2,
};

// Naantali approach route (normalized 0-1 coordinates)
// From archipelago entry to berth
export const ROUTE = [
  { x: 0.05, y: 0.80, name: 'WP-1', label: 'Utö pilot stn', speed: 16 },
  { x: 0.15, y: 0.75, name: null, speed: 15 },
  { x: 0.28, y: 0.65, name: 'WP-2', label: 'Lövskär narrows', speed: 13 },
  { x: 0.42, y: 0.55, name: null, speed: 12 },
  { x: 0.55, y: 0.46, name: 'WP-3', label: 'Innamo turn', speed: 10.5 },
  { x: 0.65, y: 0.44, name: null, speed: 9 },
  { x: 0.73, y: 0.48, name: null, speed: 8 },
  { x: 0.80, y: 0.56, name: null, speed: 6 },
  { x: 0.84, y: 0.65, name: 'WP-4', label: 'Naantali berth', speed: 3 },
];

// Corridor width at each route segment (narrower in archipelago)
// Normalized: 1.0 = wide open, 0.3 = narrow channel
export const CORRIDOR_WIDTH = [1.0, 0.9, 0.7, 0.55, 0.4, 0.35, 0.4, 0.45, 0.5];

// Recommended speed profile (knots) at each route segment
export const SPEED_PROFILE = ROUTE.map(p => p.speed);

// ETA target
export const TARGET_ETA = { hour: 7, minute: 15 }; // 07:15 EET

// Berth window
export const BERTH_WINDOW = { earliest: { h: 7, m: 10 }, latest: { h: 7, m: 25 } };

// Islands for map rendering (normalized coords)
export const ISLANDS = [
  { x: 0.35, y: 0.12, w: 42, h: 28, name: 'Lövskär' },
  { x: 0.50, y: 0.16, w: 52, h: 24, name: 'Innamo' },
  { x: 0.25, y: 0.09, w: 38, h: 20, name: 'Seili' },
  { x: 0.42, y: 0.24, w: 30, h: 18 },
  { x: 0.30, y: 0.28, w: 22, h: 14 },
  { x: 0.48, y: 0.36, w: 26, h: 16 },
  { x: 0.62, y: 0.15, w: 20, h: 12 },
  { x: 0.15, y: 0.19, w: 46, h: 24 },
  { x: 0.56, y: 0.29, w: 16, h: 10 },
  { x: 0.68, y: 0.36, w: 28, h: 15 },
];

// March weather defaults
export const WEATHER = {
  wind: { direction: 'W', speed: 8, gust: 12, unit: 'm/s' },
  current: { direction: 'NW', speed: 0.4, unit: 'kn' },
  airTemp: 1,
  seaTemp: 0,
  ice: 'Thin patches 0.5-2cm',
  visibility: 'Good',
};
