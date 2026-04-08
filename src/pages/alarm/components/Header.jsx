import WartsilaLogo from '@imgs/wartsila_logo.svg'
import { resetAll } from '../../energy/stores/energyStore'
import BridgeIcon   from '@imgs/Bridge.svg'
import ECRIcon      from '@imgs/ECR.svg'

// Active severity icons
import RedActive     from '@imgs/red-active.svg'
import MagentaActive from '@imgs/magenta-active.svg'
import YellowActive  from '@imgs/yellow-active.svg'
import GreenActive   from '@imgs/green-active.svg'
import BlueActive    from '@imgs/blue-active.svg'

// Inactive severity icons
import RedInactive     from '@imgs/red-inactive.svg'
import MagentaInactive from '@imgs/magenta-inactive.svg'
import YellowInactive  from '@imgs/yellow-inactive.svg'
import GreenInactive   from '@imgs/green-inactive.svg'
import BlueInactive    from '@imgs/blue-inactive.svg'

const ACTIVE_ICONS = {
  red:     RedActive,
  magenta: MagentaActive,
  yellow:  YellowActive,
  green:   GreenActive,
  blue:    BlueActive,
}

const INACTIVE_ICONS = {
  red:     RedInactive,
  magenta: MagentaInactive,
  yellow:  YellowInactive,
  green:   GreenInactive,
  blue:    BlueInactive,
}

const SEVERITIES = ['red', 'yellow', 'blue', 'magenta', 'green']

function SeverityCount({ icon, count }) {
  if (count === 0) return null
  return (
    <span className="flex items-center gap-[3px]">
      <img src={icon} alt="" className="w-4 h-4" />
      <span className="text-white text-sm font-medium leading-none">{count}</span>
    </span>
  )
}

export default function Header({ stats, activeSeverities = new Set(), activeResps = new Set(), sensorTemp = null, onOpenDatabase, onSimulateAnomaly, onReset, onClearAll }) {
  const {
    total = 0,
    active = 0,
    inactive = 0,
    activeBySeverity   = {},
    inactiveBySeverity = {},
    bridge = 0,
    ecr    = 0,
  } = stats

  // Which severity icons to show in active/inactive blocks
  const sevFilter = activeSeverities.size === 0 ? SEVERITIES : SEVERITIES.filter(s => activeSeverities.has(s))
  const singleSev = sevFilter.length === 1

  // Active block
  const ActiveBlock = () => (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {singleSev ? (
        // Single color: "Active:" icon count  (no total number)
        <>
          <span className="text-white text-sm font-medium">Active:</span>
          <SeverityCount icon={ACTIVE_ICONS[sevFilter[0]]} count={activeBySeverity[sevFilter[0]] ?? 0} />
        </>
      ) : (
        // All or multi-color: "Active: N" then per-color icons
        <>
          <span className="text-white text-sm font-medium">
            Active:&nbsp;<span className="font-bold">{active}</span>
          </span>
          {sevFilter.map(s => (
            <SeverityCount key={s} icon={ACTIVE_ICONS[s]} count={activeBySeverity[s] ?? 0} />
          ))}
        </>
      )}
    </div>
  )

  // Inactive block
  const InactiveBlock = () => (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {singleSev ? (
        <>
          <span className="text-white text-sm font-medium">Inactive:</span>
          <SeverityCount icon={INACTIVE_ICONS[sevFilter[0]]} count={inactiveBySeverity[sevFilter[0]] ?? 0} />
        </>
      ) : activeSeverities.size === 0 ? (
        // All: show total only, no per-color breakdown
        <span className="text-white text-sm font-medium">
          Inactive:&nbsp;<span className="font-bold">{inactive}</span>
        </span>
      ) : (
        // Multi-color selected: show total + per-color
        <>
          <span className="text-white text-sm font-medium">
            Inactive:&nbsp;<span className="font-bold">{inactive}</span>
          </span>
          {sevFilter.map(s => (
            <SeverityCount key={s} icon={INACTIVE_ICONS[s]} count={inactiveBySeverity[s] ?? 0} />
          ))}
        </>
      )}
    </div>
  )

  // Bridge/ECR: show only the active filter(s), or both if no resp filter
  const showBridge = activeResps.size === 0 || activeResps.has('Bridge')
  const showECR    = activeResps.size === 0 || activeResps.has('ECR')

  return (
    <header className="flex items-stretch h-[48px] w-full overflow-hidden">

      {/* ── White section: logo + title, diagonal right edge ── */}
      <div
        className="flex items-center gap-5 bg-white shrink-0 pl-4 pr-14 relative z-10"
        style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 28px) 100%, 0 100%)' }}
      >
        <img src={WartsilaLogo} alt="Wärtsilä" className="h-6" />
        <span className="text-black font-semibold text-base tracking-wide whitespace-nowrap">
          Alarm List
        </span>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex items-center flex-1 bg-wartsila-black -ml-7 pl-10 pr-5 gap-5 overflow-x-auto">

        {/* Total */}
        <span className="text-white text-sm whitespace-nowrap font-medium">
          Total:&nbsp;<span className="font-bold">{total}</span>
        </span>

        <ActiveBlock />
        <InactiveBlock />

        {/* Bridge */}
        {showBridge && (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <img src={BridgeIcon} alt="Bridge" className="w-5 h-5" />
            <span className="text-white text-sm font-bold">{bridge}</span>
          </span>
        )}

        {/* ECR */}
        {showECR && (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <img src={ECRIcon} alt="ECR" className="w-5 h-5" />
            <span className="text-white text-sm font-bold">{ecr}</span>
          </span>
        )}

        <span className="flex-1" />

        {/* Live temperature (from Arduino/DS18B20) */}
        <span className="flex items-center gap-1 text-white text-sm font-medium whitespace-nowrap mr-4">
          <span style={{
            display: 'inline-block',
            width: 8, height: 8,
            borderRadius: '50%',
            background: sensorTemp != null ? '#22d68a' : '#6b7280',
            flexShrink: 0,
          }} />
          Temp:&nbsp;<span className="font-bold">{sensorTemp != null ? `${sensorTemp.toFixed(2)}°C` : '--'}</span>
        </span>

        <button
          onClick={resetAll}
          className="text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
        >
          Reset All
        </button>
        <button
          onClick={onSimulateAnomaly}
          className="text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
          style={{ background: '#8B0000', color: '#FFD0D0' }}
        >
          ⚡ Simulate Anomaly
        </button>
        <button
          onClick={onReset}
          className="text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
          style={{ background: '#4A5568', color: '#E2E8F0' }}
        >
          ↺ Reset
        </button>
        <button
          onClick={onClearAll}
          className="text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
          style={{ background: '#2D3748', color: '#E2E8F0' }}
        >
          ✕ Clear All
        </button>
        <button
          onClick={onOpenDatabase}
          className="text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
          style={{ background: '#5A5C5E', color: '#E0E0E0' }}
        >
          Database
        </button>

      </div>
    </header>
  )
}
