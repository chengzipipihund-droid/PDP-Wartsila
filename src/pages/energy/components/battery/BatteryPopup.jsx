/* ═══════════════════════════════════════════════════════════
   BatteryPopup.jsx — Battery side panel (从右侧弹出)
   
   严格参照 Pop-up.svg 设计：
   • 上部黑色区域（标题）
   • 中间白色区域（内容）
   • 下部黑色区域（控制按钮）
   ═══════════════════════════════════════════════════════════ */
import { useState } from 'react';
import './BatteryPopup.css';
import BatteryGauge from './BatteryGauge';
import EnergyDistributionChart from './EnergyDistributionChart';
import BatteryCurveChart from './BatteryCurveChart';
import HealthGauge from './HealthGauge';
import { useEnergyStore } from '../../stores/energyStore';


// 模拟电池数据
const mockData = {
  voltage: '690 V',
  current: '174 A',
  temperature: 32,
  remainingTime: '20.6h',
  mode: 'DISCHARGING',
  powerFlow: '-85 kW',
  soc: 76,
  soh: 94,
  cycles: 1247,
  bmsOnline: true,
  energyIndex: '160 g/kWh',
  batteryContribution: '35%',
  avgDischargeRate: '-62 kW/h',
  consumptionData: {
    propulsion: 55,
    hotelLoad: 25,
    bridgeSystems: 10,
    bowThruster: 7,
    auxiliary: 3,
  },
  energyTimeline: [
    { time: '04:00', ess: 20, engine: 80, renewable: 0 },
    { time: '06:00', ess: 25, engine: 75, renewable: 0 },
    { time: '08:00', ess: 30, engine: 70, renewable: 0 },
    { time: '10:00', ess: 35, engine: 65, renewable: 0 },
    { time: '12:00', ess: 40, engine: 60, renewable: 0 },
    { time: '14:00', ess: 45, engine: 55, renewable: 0 },
  ],
  alerts: [
    { type: 'warning', time: '09:42', message: '温度升高 32°C' },
    { type: 'success', time: '08:15', message: '系统测试通过' },
    { type: 'info', time: '07:30', message: '充电完成' },
  ],
};

export default function BatteryPopup({ onClose }) {
  const [currentPage, setCurrentPage] = useState(0);

  const {
    batteryLevel,
    batteryMode,
    batteryKw,
    batteryRemaining,
    batteryEnergyKwh
  } = useEnergyStore();

  const handlePageChange = (direction) => {
    let newPage = currentPage + direction;
    if (newPage < 0) newPage = 2;
    if (newPage > 2) newPage = 0;
    setCurrentPage(newPage);
  };

  return (
    <div className="battery-popup-container">
      {/* ══════════════════════════════════════════════════════════
          顶部黑色区域（参照 Pop-up.svg）
          ══════════════════════════════════════════════════════════ */}
      <div className="battery-popup-header">
        <div className="battery-popup-title-wrapper">
          <div className="battery-popup-code">SCA021ES512</div>
          <div className="battery-popup-title">BATTERY (ESS)</div>
        </div>
        <button className="battery-popup-close" onClick={onClose}>✕</button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          中间白色区域（内容滚动区域）
          ══════════════════════════════════════════════════════════ */}
      <div className="battery-popup-content">
        {/* Page 1: Battery Overview */}
        {currentPage === 0 && (
          <div className="battery-page battery-page-1">
            {/* SOC Gauge Row */}
            <div className="battery-gauge-section">
              <div className="battery-gauge-box">
                <BatteryGauge value={batteryLevel} />
              </div>
              <div className="battery-status-box">
                <div className="status-item status-mode">
                  <span className="status-label">MODE</span>
                  <span className="status-value">{batteryMode}</span>
                </div>
                <div className="status-item status-power">
                  <span className="status-label">POWER</span>
                  <span className={batteryKw >= 0 ? "status-value power-negative" : "status-value power-positive"}>
                    {batteryKw > 0 ? '-' : '+'}{Math.abs(batteryKw)} kW
                  </span>
                </div>
              </div>
            </div>

            {/* Data Strip */}
            <div className="battery-data-strip">
              <div className="data-item">
                <span className="data-label">Voltage</span>
                <span className="data-value">{mockData.voltage}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Current</span>
                <span className="data-value">{mockData.current}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Temp</span>
                <span className="data-value">{mockData.temperature}°C</span>
              </div>
              <div className="data-item">
                <span className="data-label">Time</span>
                <span className="data-value">{batteryRemaining === 99 ? '> 99h' : `${batteryRemaining}h`}</span>
              </div>
            </div>

            {/* BMS Status */}
            <div className="battery-bms-status">
              <div className="bms-dot online"></div>
              <span className="bms-label">BMS ONLINE</span>
              <span className="bms-value">{mockData.voltage}</span>
            </div>

            {/* Power Curve */}
            <BatteryCurveChart />
          </div>
        )}

        {/* Page 2: Energy Consumption */}
        {currentPage === 1 && (
          <div className="battery-page battery-page-2">
            {/* Energy Distribution Chart */}
            <div className="energy-chart-section">
              <EnergyDistributionChart data={mockData.consumptionData} />
            </div>

            {/* Metrics */}
            <div className="energy-metrics">
              <div className="metric-item">
                <span className="metric-label">Energy Index</span>
                <span className="metric-value">{mockData.energyIndex}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">ESS Contribution</span>
                <span className="metric-value">{mockData.batteryContribution}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Avg. Discharge</span>
                <span className="metric-value">{mockData.avgDischargeRate}</span>
              </div>
            </div>

            {/* 6-Hour Timeline */}
            <div className="energy-timeline">
              <div className="timeline-title">6-Hour Energy Mix</div>
              <div className="timeline-bars">
                {mockData.energyTimeline.map((item, idx) => (
                  <div key={idx} className="timeline-bar-item">
                    <div className="timeline-bar-label">{item.time}</div>
                    <div className="timeline-bar">
                      <div className="bar-segment ess" style={{ height: `${item.ess}%` }}></div>
                      <div className="bar-segment engine" style={{ height: `${item.engine}%` }}></div>
                      <div className="bar-segment renewable" style={{ height: `${item.renewable}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Page 3: Health & Alerts */}
        {currentPage === 2 && (
          <div className="battery-page battery-page-3">
            {/* SOH Gauge */}
            <div className="health-gauge-section">
              <HealthGauge value={mockData.soh} />
            </div>

            {/* Cycles */}
            <div className="health-cycles">
              <span className="cycles-label">Cycles</span>
              <span className="cycles-value">{mockData.cycles}</span>
            </div>

            {/* Temperature Gradient */}
            <div className="health-temperature">
              <div className="temp-label">Temperature</div>
              <div className="temp-gradient">
                <span className="temp-min">28°C</span>
                <div className="gradient-bar"></div>
                <span className="temp-max">38°C</span>
              </div>
              <div className="temp-info">Min 28°C — Max 38°C</div>
            </div>

            {/* Alerts */}
            <div className="alerts-section">
              <div className="alerts-title">Recent Alerts</div>
              <div className="alerts-list">
                {mockData.alerts.map((alert, idx) => (
                  <div key={idx} className={`alert-item alert-${alert.type}`}>
                    <span className="alert-time">{alert.time}</span>
                    <span className="alert-msg">{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          底部黑色区域（页面导航）
          ══════════════════════════════════════════════════════════ */}
      <div className="battery-popup-footer">
        <button className="nav-btn nav-prev" onClick={() => handlePageChange(-1)}>◀</button>
        <div className="page-dots">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              className={`page-dot ${currentPage === idx ? 'active' : ''}`}
              onClick={() => setCurrentPage(idx)}
            ></button>
          ))}
        </div>
        <button className="nav-btn nav-next" onClick={() => handlePageChange(1)}>▶</button>
      </div>
    </div>
  );
}
