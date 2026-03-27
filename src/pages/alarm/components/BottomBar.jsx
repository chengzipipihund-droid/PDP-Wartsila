import { useState } from 'react'

// ── scroll icons (hover only, no on state) ──
import TopOff    from '@filters/top-filter-off.svg'
import TopHover  from '@filters/top-filter-hover.svg'
import BotOff    from '@filters/bottom-filter-off.svg'
import BotHover  from '@filters/bottom-filter-hover.svg'

// ── toggle icons ──
import AllOff      from '@filters/all-filter-off.svg'
import AllOn       from '@filters/all-filter-on.svg'
import RedOff      from '@filters/Red-filter-0ff.svg'
import RedOn       from '@filters/red-filter-on.svg'
import MagentaOff  from '@filters/magenta-filter-off.svg'
import MagentaOn   from '@filters/meganta-filter-on.svg'
import YellowOff   from '@filters/yellow-filter-off.svg'
import YellowOn    from '@filters/yellow-filter-on.svg'
import GreenOff    from '@filters/green-filter-off.svg'
import GreenOn     from '@filters/green-filter-on.svg'
import BlueOff     from '@filters/blue-filter-off.svg'
import BlueOn      from '@filters/blue-filter-on.svg'
import ECROff      from '@filters/ECR-filter-off.svg'
import ECROn       from '@filters/ECR-filter-on.svg'
import BridgeOff   from '@filters/bridge-filter-off.svg'
import BridgeOn    from '@filters/bridge-filter-on.svg'

export default function BottomBar({ activeSeverities, activeResps, onToggleSeverity, onToggleResp, onScrollTop, onScrollBottom }) {
  const [topHover, setTopHover]    = useState(false)
  const [botHover, setBotHover]    = useState(false)

  const allActive = activeSeverities.size === 0 && activeResps.size === 0

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-6"
      style={{ background: '#3B3D3F', height: '48px' }}
    >
      {/* Wrapper: relative so we can absolutely-center the 5 colors */}
      <div className="relative flex items-center w-full h-full">

        {/* ── Absolute center: ALL  |  5 colors  |  ECR/Bridge ── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">

          {/* ALL */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80"
            onClick={() => onToggleSeverity('all')}
          >
            <img src={allActive ? AllOn : AllOff} alt="all" className="w-7 h-7" />
          </button>

          {/* small gap */}
          <div className="w-3" />

          {/* 5 severity colors */}
          {[
            { id: 'red',     off: RedOff,     on: RedOn     },
            { id: 'yellow',  off: YellowOff,  on: YellowOn  },
            { id: 'blue',    off: BlueOff,    on: BlueOn    },
            { id: 'magenta', off: MagentaOff, on: MagentaOn },
            { id: 'green',   off: GreenOff,   on: GreenOn   },
          ].map(({ id, off, on }) => (
            <button
              key={id}
              className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80"
              onClick={() => onToggleSeverity(id)}
            >
              <img src={activeSeverities.has(id) ? on : off} alt={id} className="w-7 h-7" />
            </button>
          ))}

          {/* small gap */}
          <div className="w-3" />

          {/* ECR / Bridge */}
          {[
            { id: 'ECR',    off: ECROff,    on: ECROn    },
            { id: 'Bridge', off: BridgeOff, on: BridgeOn },
          ].map(({ id, off, on }) => (
            <button
              key={id}
              className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80"
              onClick={() => onToggleResp(id)}
            >
              <img src={activeResps.has(id) ? on : off} alt={id} className="w-7 h-7" />
            </button>
          ))}
        </div>

        {/* ── Far left: scroll top / bottom ── */}
        <div className="flex items-center gap-1">
          <button
            className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80"
            onMouseEnter={() => setTopHover(true)}
            onMouseLeave={() => setTopHover(false)}
            onClick={onScrollTop}
          >
            <img src={topHover ? TopHover : TopOff} alt="Scroll to top" className="w-7 h-7" />
          </button>
          <button
            className="flex items-center justify-center w-9 h-9 rounded transition-opacity hover:opacity-80"
            onMouseEnter={() => setBotHover(true)}
            onMouseLeave={() => setBotHover(false)}
            onClick={onScrollBottom}
          >
            <img src={botHover ? BotHover : BotOff} alt="Scroll to bottom" className="w-7 h-7" />
          </button>
        </div>

      </div>
    </div>
  )
}
