/* ═══════════════════════════════════════════════════════════
   面板：主机面板 | Main Engine Panel
   显示 4 台主机状态图标（ME1 大图 + ME2/ME3/ME4 列表）。
   ═══════════════════════════════════════════════════════════ */
import ME1 from './ME1.svg';
import ME2 from './ME2.svg';
import ME3 from './ME3.svg';
import ME4 from './ME4.svg';
import './MainEnginePanel.css';

function MainEnginePanel() {
  return (
    <div className="main-engine-container">
      <div className="engine-header">MAIN ENGINE</div>
      <div className="engine-content">
        <div className="engine-large">
          <img src={ME1} alt="ME1" />
        </div>
        <div className="engine-list">
          <img src={ME2} alt="ME2" />
          <img src={ME3} alt="ME3" />
          <img src={ME4} alt="ME4" />
        </div>
      </div>
    </div>
  );
}
export default MainEnginePanel;