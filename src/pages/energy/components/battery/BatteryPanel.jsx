/* ═══════════════════════════════════════════════════════════
   面板：电池/储能面板 | Battery Panel (ESS)
   动态显示电池电量百分比与充放电图标（6 档状态图标）。
   ═══════════════════════════════════════════════════════════ */
import BatteryIcon0 from './BatteryState/0-10.svg';
import BatteryIcon10 from './BatteryState/10-25.svg';
import BatteryIcon25 from './BatteryState/25-50.svg';
import BatteryIcon50 from './BatteryState/50-75.svg';
import BatteryIcon75 from './BatteryState/75-90.svg';
import BatteryIcon90 from './BatteryState/90-100.svg';
import Remaining from './Remaining.svg';
import Arrow from './arrow.svg';
import './BatteryPanel.css';

function BatteryPanel({ batteryLevel }) {
  const getBatteryIcon = (level) => {
    if (level <= 10) return BatteryIcon0;
    if (level <= 25) return BatteryIcon10;
    if (level <= 50) return BatteryIcon25;
    if (level <= 75) return BatteryIcon50;
    if (level <= 90) return BatteryIcon75;
    return BatteryIcon90;
  };

  return (
    <div className="battery-container">
      <div className="battery-header">BATTERY (ESS)</div>
      <div className="battery-content">
        <div className="battery-info">
          <div className="percentage-wrapper">
            <span className="battery-percentage">{Math.round(batteryLevel)}%</span>
          </div>
          <img src={Remaining} alt="Remaining" />
        </div>
        <img src={Arrow} alt="Arrow" className="battery-arrow" />
        <img src={getBatteryIcon(batteryLevel)} alt="Battery" className="battery-icon" />
      </div>
    </div>
  );
}

export default BatteryPanel;
