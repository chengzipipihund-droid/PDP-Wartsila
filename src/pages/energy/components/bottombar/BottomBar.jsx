/* ═══════════════════════════════════════════════════════════
   组件：底部控制栏 | Bottom Control Bar
   ─ 左侧：EnergyFlow 开关（控制能源网络图流动动画）
   ─ 右侧：搜索框（Search module，暂为占位）
   ═══════════════════════════════════════════════════════════ */
import './BottomBar.css';

function BottomBar({ energyFlowOn, onToggleEnergyFlow }) {
  return (
    <div className="bottombar">
      <div className="bottombar-left">
        <span className="bottombar-label">EnergyFlow</span>
        <button
          className={`toggle-switch ${energyFlowOn ? 'on' : 'off'}`}
          onClick={onToggleEnergyFlow}
        >
          <span className="toggle-knob" />
          <span className="toggle-text">{energyFlowOn ? 'On' : 'Off'}</span>
        </button>
      </div>
      <div className="bottombar-right">
        <div className="search-box">
          <span>🔍</span>
          <span>Search module</span>
        </div>
      </div>
    </div>
  );
}

export default BottomBar;