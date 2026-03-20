/* ═══════════════════════════════════════════════════════════
   config.js — Colors, constants, and AI data interface
   ═══════════════════════════════════════════════════════════ */

export const POPUP_WIDTH = 450;
export const POPUP_HEIGHT = 660;

// Left = positive (+acceleration), Right = negative (-deceleration)
export const LEVER_MIN = -100;
export const LEVER_MAX = 100;
export const RPM_MAX = 500;

export const COLORS = {
  panelBg:       "#5a5a5a",
  canvasBg:      "#c4c4c4",
  canvasInner:   "#b6b6b6",
  ringDark:      "#3a3a3a",
  ringMid:       "#888888",
  ringLight:     "#d0d0d0",
  crosshair:     "#666666",
  leverFan:      "#a0a0a0",
  leverFanBorder:"#777777",
  leverHead:     "#707070",
  leverHeadLight:"#909090",
  baseDark:      "#4a4a4a",
  baseMid:       "#777777",
  baseLight:     "#999999",
  text:          "#333333",
  textMid:       "#666666",
  textLight:     "#999999",
  centerBg:      "#dddddd",
  ai:            "#3cb043",
  aiLight:       "#5ed068",
  speedUp:       "#4db850",
  modeActive:    "#3cb043",
  modeInactive:  "#888888",
  tooltipBg:     "rgba(30,30,30,0.94)",
  tooltipText:   "#eeeeee",
  white:         "#ffffff",
};

/*
  AI Energy Model Interface — your future model should return:
  {
    suggestedPosition : number,   // -100 to +100
    energySavingKw    : number,
    energySavingPct   : number,
    fuelSavingLph     : number,
    confidence        : number,   // 0–1
    timestamp         : number,
    modelVersion      : string,
  }
*/
export async function fetchAISuggestion(currentLeverPos, currentRPM) {
  // ── MOCK — replace with your real API call ──
  await new Promise((r) => setTimeout(r, 80));
  const suggested = Math.max(LEVER_MIN, Math.min(LEVER_MAX, currentLeverPos * 0.78 + 2));
  return {
    suggestedPosition: Math.round(suggested * 10) / 10,
    energySavingKw:    +(2.5 + Math.random() * 3.5).toFixed(1),
    energySavingPct:   +(6 + Math.random() * 12).toFixed(1),
    fuelSavingLph:     +(0.8 + Math.random() * 2).toFixed(1),
    confidence:        +(0.7 + Math.random() * 0.25).toFixed(2),
    timestamp:         Date.now(),
    modelVersion:      "mock-v0.1",
  };
}

export function estimateRPM(leverPos) {
  return Math.round(150 + Math.abs(leverPos) * 5.5 + Math.random() * 10);
}
