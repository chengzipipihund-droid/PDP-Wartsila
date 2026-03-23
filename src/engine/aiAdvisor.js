import { ROUTE, SPEED_PROFILE } from '../utils/constants';

/**
 * Check conditions and return advisory messages if needed.
 * Called at ~1Hz from the advisor interval.
 */
export function checkAdvisories(state) {
  const advisories = [];
  const { ship, ai, portLever, stbdLever } = state;

  // Get recommended speed for current position
  const n = SPEED_PROFILE.length - 1;
  const seg = Math.min(Math.floor(ship.routeProgress * n), n - 1);
  const recSpeed = SPEED_PROFILE[seg];

  // 1. Off corridor
  if (ai.corridor < 60) {
    advisories.push({
      msg: `Corridor deviation — adherence <b>${ai.corridor}%</b>. Adjust heading.`,
      type: 'r',
    });
  } else if (ai.corridor < 80) {
    advisories.push({
      msg: `Approaching corridor edge — <b>${ai.corridor}%</b>`,
      type: 'w',
    });
  }

  // 2. Over/under speed
  if (ship.sog > recSpeed + 3) {
    advisories.push({
      msg: `Speed <b>${ship.sog.toFixed(1)} kn</b> exceeds recommendation ${recSpeed} kn — fuel waste`,
      type: 'w',
    });
  } else if (ship.sog < recSpeed - 4 && ship.sog > 1) {
    advisories.push({
      msg: `Speed <b>${ship.sog.toFixed(1)} kn</b> below recommendation — may miss berth window`,
      type: 'w',
    });
  }

  // 3. Rough operation
  const diff = Math.abs(portLever - stbdLever);
  if (diff > 35) {
    advisories.push({
      msg: `High lever differential <b>${diff.toFixed(0)}</b> — excessive turning force`,
      type: 'w',
    });
  }

  // 4. Good operation feedback
  if (ai.total >= 90 && advisories.length === 0) {
    advisories.push({
      msg: `Excellent operation — grade <b>${ai.grade}</b>, corridor <b>${ai.corridor}%</b>`,
      type: 'i',
    });
  }

  // 5. Approaching waypoint
  const nextWP = ROUTE.find((r, i) => r.name && i / (ROUTE.length - 1) > ship.routeProgress);
  if (nextWP) {
    const wpProgress = ROUTE.indexOf(nextWP) / (ROUTE.length - 1);
    const dist = wpProgress - ship.routeProgress;
    if (dist > 0 && dist < 0.05) {
      advisories.push({
        msg: `Approaching <b>${nextWP.label}</b> — reduce to <b>${nextWP.speed} kn</b>`,
        type: '',
      });
    }
  }

  return advisories;
}
