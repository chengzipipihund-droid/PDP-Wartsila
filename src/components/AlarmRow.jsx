import RedActive     from '@imgs/red-active.svg'
import MagentaActive from '@imgs/magenta-active.svg'
import YellowActive  from '@imgs/yellow-active.svg'
import GreenActive   from '@imgs/green-active.svg'
import BlueActive    from '@imgs/blue-active.svg'
import RedInactive     from '@imgs/red-inactive.svg'
import MagentaInactive from '@imgs/magenta-inactive.svg'
import YellowInactive  from '@imgs/yellow-inactive.svg'
import GreenInactive   from '@imgs/green-inactive.svg'
import BlueInactive    from '@imgs/blue-inactive.svg'
import BridgeIcon     from '@imgs/Bridge.svg'
import ECRIcon        from '@imgs/ECR.svg'
import BridgeGreyIcon from '@imgs/Bridge-grey.svg'
import ECRGreyIcon    from '@imgs/ECR-grey.svg'

const SEVERITY_ICON = {
  red:     { active: RedActive,     inactive: RedInactive },
  magenta: { active: MagentaActive, inactive: MagentaInactive },
  yellow:  { active: YellowActive,  inactive: YellowInactive },
  green:   { active: GreenActive,   inactive: GreenInactive },
  blue:    { active: BlueActive,    inactive: BlueInactive },
}

export default function AlarmRow({ alarm, isSelected, onToggleSelect, isEven, onRowClick, isHighlighted, expandCell, rowVariant }) {
  const isActive = alarm.state === 'active'
  const textColor      = isActive ? '#111111' : '#727272'
  const respTextColor  = isActive ? '#111111' : '#727272'

  const severityImg = SEVERITY_ICON[alarm.severity]?.[alarm.state] ?? null

  // Split "Role - Full Name" into two parts
  const splitPerson = (person) => {
    const idx = person.indexOf(' - ')
    if (idx === -1) return { role: person, name: '' }
    return { role: person.slice(0, idx), name: person.slice(idx + 3) }
  }

  // Split ISO string into date and time parts
  const formatDateTimeSplit = (dateString) => {
    if (!dateString) return { date: '-', time: '' }
    const date = new Date(dateString)
    const d = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const t = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    return { date: d, time: t }
  }

  const { role, name } = splitPerson(alarm.person)
  const appearance = formatDateTimeSplit(alarm.appearance)
  const restore    = formatDateTimeSplit(alarm.restore)

  const rowBg = isHighlighted
    ? '#E4EDF5'
    : isSelected
      ? '#DDEEFF'
      : rowVariant === 'root'
        ? '#E3E6E9'
        : rowVariant === 'child'
          ? '#EDEEF0'
          : '#F2F2F2'

  return (
    <>
      <tr
        style={{ color: textColor, background: rowBg }}
        className={`border-b border-gray-200 cursor-pointer transition-colors text-xs hover:brightness-95`}
        onClick={() => onRowClick && onRowClick(alarm)}
      >
        {/* Expand / group indicator cell */}
        <td className="w-8 px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          {expandCell ?? null}
        </td>
        {/* Checkbox */}
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: '#3B3D3F' }}
          />
        </td>
        {/* Severity icon */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-center w-8">
            {severityImg && <img src={severityImg} alt={alarm.severity} className="w-5 h-5" />}
          </div>
        </td>
        {/* State – plain text, bold when active */}
        <td className={`px-4 py-3 capitalize${isActive ? ' font-bold' : ''}`}>{alarm.state}</td>
        {/* Type */}
        <td className="px-4 py-3">{alarm.type}</td>
        {/* Description — indent for child rows */}
        <td className="px-4 py-3">
          {rowVariant === 'child' && (
            <span className="inline-block w-3 mr-1 text-[#AAAAAA]">└</span>
          )}
          {alarm.description}
        </td>
        {/* Responsibility – grey icons, text black for active / grey for inactive */}
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5" style={{ color: respTextColor }}>
            <img
              src={alarm.responsibility === 'ECR' ? ECRGreyIcon : BridgeGreyIcon}
              alt={alarm.responsibility}
              className="w-3.5 h-3.5"
            />
            {alarm.responsibility}
          </span>
        </td>
        {/* Person: role on top, name below */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div>{role}</div>
          {name && <div className="opacity-70">{name}</div>}
        </td>
        {/* Appearance: date on top, time below */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div>{appearance.date}</div>
          {appearance.time && <div className="opacity-70">{appearance.time}</div>}
        </td>
        {/* Restore: date on top, time below */}
        <td className="px-4 py-3 whitespace-nowrap">
          {restore.date === '-' ? '-' : (
            <>
              <div>{restore.date}</div>
              {restore.time && <div className="opacity-70">{restore.time}</div>}
            </>
          )}
        </td>
      </tr>
      
    </>
  )
}
