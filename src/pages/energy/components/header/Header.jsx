/* ═══════════════════════════════════════════════════════════
   组件：顶部标题栏 | Header Bar
   ─ 第一行：Wärtsilä Logo + 仪表盘标题 / 日期时间 / Auto-Pilot 状态
   ─ 第二行：副标题栏（模式选择器 + 麦克风 + Wi-Fi）
   ═══════════════════════════════════════════════════════════ */
import React from 'react';
import './Header.css';
import wartssilaLogo from './wartsila-logo.png';
import RobotIcon from './Robot.svg';
import Mic1Icon from './Mic1.svg';
import MicBarIcon from './Mic-Bar.svg';
import WifiIcon from './Wifi.svg';
import ModeButtons from './ModeButtons';

function Header({ alarm }) {
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
          <span className="header-info">10/04/2026</span>
          <span className="header-info">Friday</span>
          <span className="header-info">HH:MM:SS</span>
          {alarm && <span className="alarm-text">ALARM: RPM &gt; 400</span>}
        </div>

        {/* 右侧绿色梯形：Auto-Pilot 信息 */}
        <div className="header-right">
          <span className="header-autopilot-label">Auto-Pilot Mode ✦</span>
          <span className="header-active-for">Active for</span>
          <span className="header-autopilot-time">9h42min</span>
          <img src={RobotIcon} alt="Robot" className="header-robot-icon" />
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
          <div className="subheader-mic-container">
            <img src={Mic1Icon} alt="Microphone" className="subheader-mic-icon" />
            <img src={MicBarIcon} alt="Mic Level" className="subheader-mic-bar" />
          </div>
          <div className="subheader-wifi-container">
            <img src={WifiIcon} alt="Wi-Fi" className="subheader-icon-wifi" />
            <span>Wi-Fi network name</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;
