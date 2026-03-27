/* ═══════════════════════════════════════════════════════════
   面板：速度与转速板 | Speed Databoard
   显示 RPM 仪表盘（0-500）及速度模式图标。
   ═══════════════════════════════════════════════════════════ */
import RpmGauge from './RpmGauge.jsx';
import Mode from './Mode.svg';
import './EnergyDataboard.css';

function EnergyDataboard({ rpm }) {
  return (
    <div className="databoard-container">
      <div className="databoard-header">SPEED OVER GROUND</div>
      <div className="databoard-content">
        <RpmGauge rpm={rpm} />
        <img src={Mode} alt="Mode" className="databoard-mode" />
      </div>
    </div>
  );
}

export default EnergyDataboard;
