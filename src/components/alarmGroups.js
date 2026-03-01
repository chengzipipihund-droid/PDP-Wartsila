// ── Root-cause groupings shared between App.jsx and AlarmList.jsx ──
// Each group: { rootId, childIds[] }
export const GROUPS = [
  { rootId: 1, childIds: [47, 22, 15] },         // ME lube oil pump failure
  { rootId: 5, childIds: [9, 13, 14, 33] },       // Main switchboard blackout
  { rootId: 3, childIds: [12, 30] },              // Steering gear complete failure
  { rootId: 2, childIds: [4, 7] },                // ME cylinder scavenge fire
]

export const ROOT_IDS = new Set(GROUPS.map(g => g.rootId))

export const CHILD_TO_ROOT = {}  // childId → rootId
export const ROOT_TO_GROUP = {}  // rootId  → group obj
GROUPS.forEach(g => {
  ROOT_TO_GROUP[g.rootId] = g
  g.childIds.forEach(cid => { CHILD_TO_ROOT[cid] = g.rootId })
})

export const CHILD_IDS = new Set(Object.keys(CHILD_TO_ROOT).map(Number))

/**
 * Given the full sorted alarm list and the current expandedGroups Set,
 * returns only the alarms that are currently visible (root-cause children
 * are hidden until their group is expanded).
 */
export function getVisibleAlarms(alarms, expandedGroups) {
  const result = []
  alarms.forEach(alarm => {
    const rootId  = CHILD_TO_ROOT[alarm.id]
    const isChild = rootId !== undefined

    if (isRoot(alarm.id)) {
      // Push root row
      result.push(alarm)
      // Immediately push children (if expanded) — keeps them right below root
      if (expandedGroups.has(alarm.id)) {
        const group = ROOT_TO_GROUP[alarm.id]
        group.childIds.forEach(cid => {
          const child = alarms.find(a => a.id === cid)
          if (child) result.push(child)
        })
      }
    } else if (!isChild) {
      // Standalone alarm (not part of any group)
      result.push(alarm)
    }
    // isChild but not expanded → skip (already handled above under root)
  })
  return result
}

export function isRoot(id) { return ROOT_IDS.has(id) }
