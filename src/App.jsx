/* ═══════════════════════════════════════════════════════════
   页面：主仪表盘 | Main Dashboard
   整体应用根组件，管理所有全局状态，组合所有子面板。
   ─ 正常视图：主机面板 + 电池面板 + 速度板 + 能源网络图
   ─ 节能视图：EcoModeContent（切换 Energy 标签时激活）
   ─ 侧滑面板：杠杆控制面板（点击 Bridge 节点触发）
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import './App.css';
import useLeverHardware from './hooks/useLeverHardware';
import Header from './components/header/Header';
import Sidebar from './components/sidebar/Sidebar';
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
  const [batteryLevel, setBatteryLevel] = useState(100); // 默认100%
  const [rpm, setRpm] = useState(0); // 默认0
  const [alarm, setAlarm] = useState(false); // rpm >400报警
  const [optimizationMarkers, setOptimizationMarkers] = useState(null);

  // ── Real-time hardware lever data (always running in background) ──
  const leverHardware = useLeverHardware();

  // 电量消耗逻辑：每秒根据rpm计算下降
  useEffect(() => {
    const interval = setInterval(() => {
      if (rpm > 0) {
        const consumptionRate = (rpm / 200) * (1 / 5); // % per second at 200rpm (5s for 1%)
        setBatteryLevel(prev => Math.max(0, prev - consumptionRate));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rpm]);

  // rpm计算逻辑：基于lever position作为加速度
  useEffect(() => {
    const currentLeverPos = mode === "manual" ? manualLeverPos : leverHardware.leverPos || 0;
    const interval = setInterval(() => {
      setRpm(prevRpm => {
        let acceleration;
        if (currentLeverPos >= 0) {
          // 加速
          if (prevRpm < 200) {
            acceleration = (currentLeverPos / 100) * 10; // 100% pos: 10 RPM/s to reach 200 in 20s
          } else {
            acceleration = (currentLeverPos / 100) * (200 / 60); // 100% pos: ~3.33 RPM/s to reach 400 in 60s
          }
        } else {
          // 减速
          acceleration = (currentLeverPos / 100) * (prevRpm / 2); // -100% pos: stop in 2s
        }
        const newRpm = Math.max(0, Math.min(500, prevRpm + acceleration));
        return newRpm;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [leverHardware.leverPos, manualLeverPos, mode]);

  // 报警逻辑：rpm > 400
  useEffect(() => {
    setAlarm(rpm > 400);
  }, [rpm]);

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
