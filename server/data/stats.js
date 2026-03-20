// ── Alarm statistics (occurrences last 30 days + average resolve time) ──────

export const alarmStats = {
   1: { occurrences: 21, avgResolveTime: '2h 30min' },
   2: { occurrences:  6, avgResolveTime: '4h 15min' },
   3: { occurrences:  4, avgResolveTime: '5h 00min' },
   4: { occurrences:  3, avgResolveTime: '6h 20min' },
   5: { occurrences:  8, avgResolveTime: '3h 45min' },
   6: { occurrences:  5, avgResolveTime: '4h 30min' },
   7: { occurrences: 12, avgResolveTime: '2h 50min' },
   8: { occurrences:  4, avgResolveTime: '5h 10min' },
   9: { occurrences:  9, avgResolveTime: '3h 05min' },
  10: { occurrences:  7, avgResolveTime: '3h 40min' },
  11: { occurrences: 14, avgResolveTime: '2h 10min' },
  12: { occurrences:  6, avgResolveTime: '4h 00min' },
  13: { occurrences: 10, avgResolveTime: '2h 55min' },
  14: { occurrences:  5, avgResolveTime: '4h 45min' },
  15: { occurrences: 11, avgResolveTime: '2h 25min' },
  16: { occurrences: 18, avgResolveTime: '1h 50min' },
  17: { occurrences:  8, avgResolveTime: '3h 20min' },
  18: { occurrences: 13, avgResolveTime: '2h 00min' },
  19: { occurrences:  9, avgResolveTime: '2h 40min' },
  20: { occurrences: 22, avgResolveTime: '1h 35min' },
  21: { occurrences: 17, avgResolveTime: '1h 45min' },
  22: { occurrences: 24, avgResolveTime: '1h 20min' },
  23: { occurrences: 15, avgResolveTime: '2h 05min' },
  24: { occurrences: 11, avgResolveTime: '2h 30min' },
  25: { occurrences: 19, avgResolveTime: '1h 40min' },
  26: { occurrences: 28, avgResolveTime: '0h 55min' },
  27: { occurrences: 20, avgResolveTime: '1h 30min' },
  28: { occurrences: 32, avgResolveTime: '0h 40min' },
  29: { occurrences: 16, avgResolveTime: '1h 55min' },
  30: { occurrences: 23, avgResolveTime: '1h 15min' },
  31: { occurrences: 18, avgResolveTime: '1h 50min' },
  32: { occurrences: 26, avgResolveTime: '1h 05min' },
  33: { occurrences: 29, avgResolveTime: '0h 50min' },
  34: { occurrences: 34, avgResolveTime: '0h 35min' },
  35: { occurrences: 21, avgResolveTime: '1h 25min' },
  36: { occurrences: 38, avgResolveTime: '0h 25min' },
  37: { occurrences: 25, avgResolveTime: '1h 10min' },
  38: { occurrences: 30, avgResolveTime: '0h 45min' },
  39: { occurrences: 27, avgResolveTime: '0h 55min' },
  40: { occurrences: 22, avgResolveTime: '1h 20min' },
  41: { occurrences: 33, avgResolveTime: '0h 40min' },
  42: { occurrences: 40, avgResolveTime: '0h 20min' },
  43: { occurrences: 35, avgResolveTime: '0h 30min' },
  44: { occurrences: 42, avgResolveTime: '0h 15min' },
  45: { occurrences: 28, avgResolveTime: '0h 50min' },
  46: { occurrences: 45, avgResolveTime: '0h 10min' },
  47: { occurrences: 31, avgResolveTime: '0h 45min' },
  48: { occurrences: 48, avgResolveTime: '0h 08min' },
  49: { occurrences: 36, avgResolveTime: '0h 30min' },
  50: { occurrences: 39, avgResolveTime: '0h 20min' },
}

// ── Alarm group / failure-tree relationships ─────────────────────────────────
// Mirrors alarmGroups.js on the frontend.
export const ALARM_GROUPS = [
  { rootId:  1, childIds: [47, 22, 15] },
  { rootId:  5, childIds: [9, 13, 14, 33] },
  { rootId:  3, childIds: [12, 30] },
  { rootId:  2, childIds: [4, 7] },
]

// Build lookup tables once at startup
export const childToRoot    = {}   // childId  -> rootId
export const rootToChildren = {}   // rootId   -> childIds[]
ALARM_GROUPS.forEach(g => {
  rootToChildren[g.rootId] = g.childIds
  g.childIds.forEach(cid => { childToRoot[cid] = g.rootId })
})

// ── Deterministic pseudo-random from integer seed ────────────────────────────
export function seededRand(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// ── Parse "Xh Ymin" string to total minutes ──────────────────────────────────
export function parseMinutes(s) {
  const h = parseInt(s.match(/(\d+)h/)?.[1]  ?? 0)
  const m = parseInt(s.match(/(\d+)min/)?.[1] ?? 0)
  return h * 60 + m
}
