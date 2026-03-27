/* ═══════════════════════════════════════════════════════════
   页面：主仪表盘 | Main Dashboard
   整体应用根组件，管理所有全局状态，组合所有子面板。
   ─ 正常视图：主机面板 + 电池面板 + 速度板 + 能源网络图
   ─ 节能视图：EcoModeContent（切换 Energy 标签时激活）
   ─ 侧滑面板：杠杆控制面板（点击 Bridge 节点触发）
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import './App.css';
import useLeverHardware from '../../shared/hooks/useLeverHardware';
import { useEnergyStore, setManualLever } from './stores/energyStore';
import Header from './components/header/Header';
import Sidebar from '../../layout/Sidebar/Sidebar';
import BottomBar from './components/bottombar/BottomBar';
import MainEnginePanel from './components/main-engine/MainEnginePanel';
import BatteryPanel from './components/battery/BatteryPanel';
import EnergyDataboard from './components/energy-databoard/EnergyDataboard';
import EnergyIndex from './components/energy-index/EnergyIndex';
import LeverPopup from './components/lever-popup/LeverPopup';
import EcoModeContent from './components/lever-popup/EcoModeContent';
import EnergyOptimizer from './components/energy-optimizer/EnergyOptimizer';

function App() {
  const [energyFlowOn, setEnergyFlowOn] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [leverOpen, setLeverOpen] = useState(false);
  const [ecoMode, setEcoMode] = useState(false);
  const [leverPos, setLeverPos] = useState(0);
  const [mode, setMode] = useState("copilot");
  const [manualLeverPos, setManualLeverPos] = useState(0);
  const { rpm, batteryLevel, alarm } = useEnergyStore();
  const [optimizationMarkers, setOptimizationMarkers] = useState(null);

  // ── Real-time hardware lever data (always running in background) ──
  const leverHardware = useLeverHardware();

  // Feed manual lever position into the persistent energy store
  useEffect(() => {
    setManualLever(mode === 'manual' ? manualLeverPos : null);
  }, [mode, manualLeverPos]);

  return (
    <div className={`dashboard ${nightMode ? 'night' : 'day'}`}>
      <Header alarm={alarm} />
      <Sidebar
        nightMode={nightMode}
        onToggleNight={() => setNightMode(!nightMode)}
      />
      <main className="body">
        {/* ── Dashboard content (normal or eco mode) ── */}
        <div className="body-content" style={{ position: 'relative' }}>
          {ecoMode ? (
            <div key="eco" className="eco-mode-enter" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <EcoModeContent batteryLevel={batteryLevel} rpm={rpm} />
            </div>
          ) : (
            <>
              <div className="body-top-row">
                <MainEnginePanel />
                <BatteryPanel batteryLevel={batteryLevel} />
                <EnergyDataboard rpm={rpm} />
              </div>
              <div className="body-bottom-row">
                <EnergyIndex
                  showEnergyFlow={energyFlowOn}
                  onBridgeClick={() => setLeverOpen(true)}
                  optimizationMarkers={optimizationMarkers}
                />
              </div>
              {/* ── AI Energy Optimizer floating widget (bottom-right) ── */}
              <EnergyOptimizer onMarkersChange={setOptimizationMarkers} />
            </>
          )}
        </div>

        {/* ── Lever Mapping popup panel (slides in from right) ── */}
        <div className={`lever-panel-wrap ${leverOpen ? 'open' : ''}`}>
          <LeverPopup
            leverData={leverHardware}
            onClose={() => { setLeverOpen(false); setEcoMode(false); }}
            onEcoMode={setEcoMode}
            rpm={rpm}
            batteryLevel={batteryLevel}
            leverPos={leverPos}
            setLeverPos={setLeverPos}
            mode={mode}
            setMode={setMode}
            manualLeverPos={manualLeverPos}
            setManualLeverPos={setManualLeverPos}
          />
        </div>
      </main>
      <BottomBar
        energyFlowOn={energyFlowOn}
        onToggleEnergyFlow={() => setEnergyFlowOn(!energyFlowOn)}
      />
    </div>
  );
}

export default App;
