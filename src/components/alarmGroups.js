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
 * Dynamically register an AI alarm group (called when AI_ANALYSIS_READY fires).
 * Automatically removes any previously registered AI group first.
 */
let _lastAIRootId = null

export function registerAIGroup(rootId, childIds) {
  // Clean up any previous AI group before registering the new one
  if (_lastAIRootId) unregisterAIGroup(_lastAIRootId)
  _lastAIRootId = rootId
  ROOT_IDS.add(rootId)
  ROOT_TO_GROUP[rootId] = { rootId, childIds }
  childIds.forEach(cid => { CHILD_TO_ROOT[cid] = rootId })
}

export function unregisterAIGroup(rootId) {
  if (!rootId) return
  const group = ROOT_TO_GROUP[rootId]
  if (!group) return
  ROOT_IDS.delete(rootId)
  group.childIds.forEach(cid => { delete CHILD_TO_ROOT[cid] })
  delete ROOT_TO_GROUP[rootId]
  if (_lastAIRootId === rootId) _lastAIRootId = null
}

/**
 * Given the full sorted alarm list and the current expandedGroups Set,
 * returns only the alarms that are currently visible (root-cause children
 * are hidden until their group is expanded).
 *
 * extraGroup — optional { rootId, childIds[] } from React state (avoids
 *   relying on module-level mutations which React can miss during renders)
 */
export function getVisibleAlarms(alarms, expandedGroups, extraGroup = null) {
  // Merge module-level maps with any extra group passed via React state
  const isRootFn = (id) => ROOT_IDS.has(id) || (extraGroup && extraGroup.rootId === id)
  const isChildFn = (id) => {
    if (CHILD_TO_ROOT[id] !== undefined) return true
    if (extraGroup && extraGroup.childIds.includes(id)) return true
    return false
  }
  const getGroupFn = (id) => {
    if (ROOT_TO_GROUP[id]) return ROOT_TO_GROUP[id]
    if (extraGroup && extraGroup.rootId === id) return extraGroup
    return null
  }

  const result = []
  alarms.forEach(alarm => {
    if (isRootFn(alarm.id)) {
      // Push root row
      result.push(alarm)
      // Immediately push children (if expanded) — keeps them right below root
      if (expandedGroups.has(alarm.id)) {
        const group = getGroupFn(alarm.id)
        group.childIds.forEach(cid => {
          const child = alarms.find(a => a.id === cid)
          if (child) result.push(child)
        })
      }
    } else if (!isChildFn(alarm.id)) {
      // Standalone alarm (not part of any group)
      result.push(alarm)
    }
    // isChild but not expanded → skip
  })
  return result
}

export function isRoot(id) { return ROOT_IDS.has(id) }
