/* ═══════════════════════════════════════════════════════════
   面板：电池/储能面板 | Battery Panel (ESS)
   动态显示电池电量百分比与充放电图标（6 档状态图标）。
   点击可打开电池详细信息 Pop-up。
   ═══════════════════════════════════════════════════════════ */
import BatteryIcon0 from './BatteryState/0-10.svg';
import BatteryIcon10 from './BatteryState/10-25.svg';
import BatteryIcon25 from './BatteryState/25-50.svg';
import BatteryIcon50 from './BatteryState/50-75.svg';
import BatteryIcon75 from './BatteryState/75-90.svg';
import BatteryIcon90 from './BatteryState/90-100.svg';
import Arrow from './arrow.svg';
import './BatteryPanel.css';
import { useEnergyStore } from '../../stores/energyStore';

// Format a decimal-hours value → "Xh Ym" / "Xm" / "> 99h"
function formatHours(h) {
  if (h >= 99) return '> 99h';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  if (hh === 0) return `${mm}m`;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
}

function BatteryPanel({ batteryLevel, onBatteryClick }) {
  const batteryKw       = useEnergyStore(s => s.batteryKw       ?? 0);
  const batteryEnergyKwh = useEnergyStore(s => s.batteryEnergyKwh ?? 5000);
  const batteryMode     = useEnergyStore(s => s.batteryMode     ?? 'IDLE');

  // Usable energy above the 15 % reserve floor
  const reservePct   = 15;
  const usableSoc    = Math.max(0, (batteryLevel ?? 0) - reservePct);
  const usableKwh    = (usableSoc / 100) * batteryEnergyKwh;

  // Derive remaining / charge-to-full time
  let remainLabel, remainSub;
  if (batteryMode === 'DISCHARGING' && batteryKw > 0.5) {
    const h = usableKwh / batteryKw;
    remainLabel = formatHours(h);
    remainSub   = 'remaining';
  } else if (batteryMode === 'CHARGING' && batteryKw < -0.5) {
    const toFullKwh = ((100 - (batteryLevel ?? 0)) / 100) * batteryEnergyKwh;
    const h = toFullKwh / Math.abs(batteryKw);
    remainLabel = formatHours(h);
    remainSub   = 'to full';
  } else {
    remainLabel = formatHours(usableKwh / 50); // assume 50 kW hotel standby load
    remainSub   = 'at standby';
  }

  const getBatteryIcon = (level) => {
    if (level <= 10) return BatteryIcon0;
    if (level <= 25) return BatteryIcon10;
    if (level <= 50) return BatteryIcon25;
    if (level <= 75) return BatteryIcon50;
    if (level <= 90) return BatteryIcon75;
    return BatteryIcon90;
  };

  return (
    <div 
      className="battery-container"
      onClick={onBatteryClick}
      style={{ cursor: 'pointer' }}
      title="点击查看更多详情"
    >
      <div className="battery-header">BATTERY (ESS)</div>
      <div className="battery-content">
        <div className="battery-info">
          <div className="percentage-wrapper">
            <span className="battery-percentage">{Math.round(batteryLevel)}%</span>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', lineHeight: 1.15,
          }}>
            <span style={{ fontSize: 11, color: '#888', fontFamily: 'Arial, sans-serif', letterSpacing: 0.3 }}>
              {remainSub}
            </span>
            <span style={{
              fontSize: 22, fontWeight: 700,
              color: batteryMode === 'DISCHARGING' && usableSoc < 20 ? '#E74C3C' : '#111',
              fontFamily: 'Arial, sans-serif',
              whiteSpace: 'nowrap',
            }}>
              {remainLabel}
            </span>
          </div>
        </div>
        <img src={Arrow} alt="Arrow" className="battery-arrow" />
        <img src={getBatteryIcon(batteryLevel)} alt="Battery" className="battery-icon" />
      </div>
    </div>
  );
}

export default BatteryPanel;
