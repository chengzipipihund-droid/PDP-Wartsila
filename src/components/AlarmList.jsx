import { useState } from 'react'
import AlarmRow from './AlarmRow'
import { ROOT_IDS, CHILD_TO_ROOT, ROOT_TO_GROUP, isRoot, getVisibleAlarms } from './alarmGroups'
import AcknowledgeIcon from '@imgs/acknowledge-icon.svg'

export default function AlarmList({ alarms, selectedAlarms, setSelectedAlarms, onRowClick, selectedAlarmId, expandedGroups, toggleGroup, onAcknowledge }) {

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAlarms(new Set(alarms.map(a => a.id)))
    } else {
      setSelectedAlarms(new Set())
    }
  }

  // Checkbox toggle: if root alarm → cascade-select/deselect all its children too
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedAlarms)
    if (newSelected.has(id)) {
      newSelected.delete(id)
      // If root, deselect children as well
      if (isRoot(id)) {
        ROOT_TO_GROUP[id].childIds.forEach(cid => newSelected.delete(cid))
      }
    } else {
      newSelected.add(id)
      // If root, select all children present in the alarm list
      if (isRoot(id)) {
        ROOT_TO_GROUP[id].childIds.forEach(cid => {
          if (alarms.find(a => a.id === cid)) newSelected.add(cid)
        })
      }
    }
    setSelectedAlarms(newSelected)
  }

  const allSelected = alarms.length > 0 && selectedAlarms.size === alarms.length

  // Build visible rows: roots are followed immediately by their children (if expanded)
  const flatAlarms = getVisibleAlarms(alarms, expandedGroups)

  const visibleRows = flatAlarms.map(alarm => {
    const rootId  = CHILD_TO_ROOT[alarm.id]
    const isChild = rootId !== undefined

    if (isChild) {
      return { alarm, rowVariant: 'child', expandCell: null }
    }

    if (isRoot(alarm.id)) {
      const group      = ROOT_TO_GROUP[alarm.id]
      const isOpen     = expandedGroups.has(alarm.id)
      const childCount = group.childIds.length
      return {
        alarm,
        rowVariant: 'root',
        expandCell: (
          <button
            onClick={(e) => { e.stopPropagation(); toggleGroup(alarm.id) }}
            title={isOpen ? `Collapse (${childCount} related)` : `Expand (${childCount} related)`}
            className="w-6 h-6 rounded flex items-center justify-center transition-all duration-150 hover:bg-[#C8CDD1] text-[#666] text-[10px] font-bold"
            style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▶
          </button>
        ),
      }
    }

    return { alarm, rowVariant: null, expandCell: null }
  })

  return (
    <div className="bg-[#F2F2F2] rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#C8CDD1]">
            <tr>
              {/* Expand toggle column */}
              <th className="w-8 px-2 py-3" />
              <th className="w-12 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: '#3B3D3F' }}
                />
              </th>
              <th className="px-4 py-1 text-left text-gray-600 font-semibold">Severity</th>
              <th className="px-4 py-1 text-left text-gray-600 font-semibold">State</th>
              <th className="px-4 py-1 text-left text-gray-600 font-semibold">Type</th>
              <th className="px-4 py-1 text-left text-gray-600 font-semibold">Description</th>
              <th className="px-4 py-1 text-left text-gray-600 font-semibold">Responsibility</th>
              <th className="px-4 py-1 text-left text-gray-600 font-semibold">Person</th>
              <th className="px-4 py-1 text-left text-gray-600 font-semibold">Appearance</th>
              <th className="px-4 py-1 text-left text-gray-600 font-semibold">Restore</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ alarm, rowVariant, expandCell }) => (
              <AlarmRow
                key={alarm.id}
                alarm={alarm}
                isSelected={selectedAlarms.has(alarm.id)}
                onToggleSelect={() => toggleSelect(alarm.id)}
                onRowClick={onRowClick}
                isHighlighted={alarm.id === selectedAlarmId}
                expandCell={expandCell}
                rowVariant={rowVariant}
              />
            ))}
          </tbody>
        </table>
        
        {alarms.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <p>No alarms to display</p>
          </div>
        )}
      </div>

      {/* ── Acknowledge popup panel (right side, fixed) ─────────────────── */}
      {selectedAlarms.size > 0 && (
        <>
          {/* Panel */}
          <div
            className="fixed right-0 z-50 flex flex-col items-center justify-center bg-[#E6E6E6] shadow-2xl"
            style={{ width: 345, top: 48, bottom: 48, padding: '2.5rem 2rem' }}
          >
            {/* Icon */}
            <img src={AcknowledgeIcon} alt="acknowledge" className="w-20 h-20 mb-6" />

            {/* Title */}
            <h2 className="text-base font-semibold text-center text-gray-900 mb-3">
              Acknowledge the selected alarms ?
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-500 text-left mb-8 leading-relaxed w-full">
              You will take responsibility of these alarms.<br />
              Inactive alarms will be disappeared on live alarm after acknowledging them.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setSelectedAlarms(new Set())}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors bg-white"
              >
                Cancel
              </button>
              <button
                onClick={() => onAcknowledge && onAcknowledge(selectedAlarms)}
                className="flex-1 py-2.5 bg-[#3B3D3F] hover:bg-[#2a2c2e] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
