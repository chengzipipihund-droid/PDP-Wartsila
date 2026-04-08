/* ═══════════════════════════════════════════════════════════
   组件：顶部标题栏 | Header Bar
   ─ 第一行：Wärtsilä Logo + 仪表盘标题 / 日期时间 / Auto-Pilot 状态
   ─ 第二行：副标题栏（模式选择器 + 麦克风 + Wi-Fi）
   ═══════════════════════════════════════════════════════════ */
import React, { useState, useEffect } from 'react';
import './Header.css';
import wartssilaLogo from './wartsila-logo.png';
import RobotIcon from './Robot.svg';
import Mic1Icon from './Mic1.svg';
import MicBarIcon from './Mic-Bar.svg';
import WifiIcon from './Wifi.svg';
import ModeButtons from './ModeButtons';
import { useEnergyStore, resetAll } from '../../stores/energyStore';

function ModeTimer() {
  const modeStartTime = useEnergyStore(s => s.modeStartTime);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - modeStartTime) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - modeStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [modeStartTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

const MODE_STYLES = {
  SMART_NAV: { label: 'Smart Nav ✦', bg: '#4FBF65', icon: <img src={RobotIcon} alt="Smart Nav" className="header-robot-icon" /> },
  HYBRID:    { label: 'Hybrid ⟳', bg: '#2A81E4', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="header-robot-icon" style={{marginLeft:'8px', marginTop: '2px'}}><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> },
  ECO_MODE:  { label: 'Eco Mode ❦', bg: '#7CB342', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="header-robot-icon" style={{marginLeft:'8px', marginTop: '2px'}}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><line x1="2" y1="22" x2="11" y2="13"></line></svg> },
  FULL_SPEED:{ label: 'Full Speed ⚡', bg: '#D99B08', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="header-robot-icon" style={{marginLeft:'8px', marginTop: '2px'}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> }
};

function Header({ alarm }) {
  const operatingMode = useEnergyStore((state) => state.operatingMode);
  const activeStyle = MODE_STYLES[operatingMode] || MODE_STYLES.SMART_NAV;

  // Real-time clock state
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const d = time.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const w = time.toLocaleDateString('en-US', { weekday: 'long' });
  const t = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <>
      {/* 第一行：主 Header */}
      <div className="header">
        {/* 左侧白色梯形：Logo + 标题 */}
        <div className="header-left">
          <img src={wartssilaLogo} alt="Wärtsilä" className="header-logo" />
          <span className="header-title">Energy Dashboard</span>
        </div>

        {/* 中间深色区域：日期 / 星期 / 时间 */}
        <div className="header-center">
          <span className="header-info">{d}</span>
          <span className="header-info">{w}</span>
          <span className="header-info">{t}</span>
          {alarm && <span className="alarm-text">ALARM: RPM &gt; 400</span>}
        </div>

        {/* 右侧动态模式指示区域 */}
        <div className="header-right" style={{ background: activeStyle.bg, transition: 'background-color 0.3s ease' }}>
          <span className="header-autopilot-label">{activeStyle.label}</span>
          <span className="header-active-for">Active for</span>
          <span className="header-autopilot-time"><ModeTimer /></span>
          {activeStyle.icon}
        </div>
      </div>

      {/* 第二行：副 Header */}
      <div className="sub-header">
        <div className="subheader-left">
          <ModeButtons />
        </div>
        <div className="subheader-center">
        </div>
        <div className="subheader-right">
          <button
            onClick={resetAll}
            style={{
              padding: '3px 12px', fontSize: 12, fontWeight: 'bold',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 20, color: '#fff', cursor: 'pointer', outline: 'none',
              transition: 'background 0.2s', marginRight: 10,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            Reset All
          </button>
          <div className="subheader-mic-container">
            <img src={Mic1Icon} alt="Microphone" className="subheader-mic-icon" />
            <img src={MicBarIcon} alt="Mic Level" className="subheader-mic-bar" />
          </div>
          <div className="subheader-wifi-container">
            <img src={WifiIcon} alt="Wi-Fi" className="subheader-icon-wifi" />
            <span>R03-4520</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;
