import React, { useState, useEffect } from 'react';
import './NavHeader.css';
import { useStore } from '../../stores/useShipStore';
import { useEnergyStore, resetAll } from '../../../energy/stores/energyStore';

import wartssilaLogo from '../../../energy/components/header/wartsila-logo.png';
import RobotIcon from '../../../energy/components/header/Robot.svg';
import Mic1Icon from '../../../energy/components/header/Mic1.svg';
import MicBarIcon from '../../../energy/components/header/Mic-Bar.svg';
import WifiIcon from '../../../energy/components/header/Wifi.svg';

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
  SMART_NAV: { label: 'Smart Nav ✦', bg: '#4FBF65', icon: <img src={RobotIcon} alt="Smart Nav" className="header-robot-icon" style={{ height: 35, width: 35, marginLeft: 5 }} /> },
  HYBRID:    { label: 'Hybrid ⟳', bg: '#2A81E4', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="header-robot-icon" style={{marginLeft:'8px', marginTop: '2px'}}><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> },
  ECO_MODE:  { label: 'Eco Mode ❦', bg: '#7CB342', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="header-robot-icon" style={{marginLeft:'8px', marginTop: '2px'}}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><line x1="2" y1="22" x2="11" y2="13"></line></svg> },
  FULL_SPEED:{ label: 'Full Speed ⚡', bg: '#D99B08', icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="header-robot-icon" style={{marginLeft:'8px', marginTop: '2px'}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> }
};

export default function NavHeader({ setLayout, layoutView }) {
  const operatingMode = useEnergyStore((state) => state.operatingMode);
  const activeStyle = MODE_STYLES[operatingMode] || MODE_STYLES.SMART_NAV;
  const ship = useStore(state => state.ship);
  const resetVoyage = useStore(state => state.resetVoyage);

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const d = time.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const w = time.toLocaleDateString('en-US', { weekday: 'long' });
  const t = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  // Approach progress: 0% at routeProgress=0.80, 100% at routeProgress=0.97 (when docking starts)
  const rp = ship?.routeProgress || 0;
  const approachProgress = Math.round(Math.max(0, Math.min(1, (rp - 0.80) / 0.17)) * 100);
  const docked = useStore(state => state.docked);

  // Colour shifts green as approach completes
  const barColor = approachProgress >= 90 ? '#22D68A'
    : approachProgress >= 60 ? '#4FBF65'
    : '#4478aa';

  // Dummy location data
  return (
    <div className="nav-header-container">
      {/* 行1: 主 Header */}
      <div className="nav-header">
        <div className="nav-header-left">
          <img src={wartssilaLogo} alt="Wärtsilä" className="nav-header-logo" />
          <span className="nav-header-title">Navigation</span>
        </div>

        <div className="nav-header-center">
          <span className="nav-header-info">{d}</span>
          <span className="nav-header-info">{w}</span>
          <span className="nav-header-info">{t}</span>
          <span className="nav-header-pos">LAT: 59° 54.498' N | LON: 24° 55.123' E</span>
        </div>

        <div className="nav-header-right" style={{ background: activeStyle.bg, transition: 'background-color 0.3s ease' }}>
          <span className="nav-header-autopilot-label">{activeStyle.label}</span>
          <span className="nav-header-active-for">Active for</span>
          <span className="nav-header-autopilot-time"><ModeTimer /></span>
          {activeStyle.icon}
        </div>
      </div>

      {/* 行2: 副 Header */}
      <div className="nav-sub-header">
        <div className="nav-subheader-left" style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#E6E9EC', marginRight: 8, width: 50, fontWeight: 'bold', letterSpacing: 1 }}>
            {docked ? 'BERTHED' : 'BERTH:'}
          </span>
          <div className="nav-progress-bar" style={{ position: 'relative' }}>
            <div className="nav-progress-fill" style={{ width: `${approachProgress}%`, background: barColor, transition: 'width 0.5s ease, background 0.5s ease' }}></div>
          </div>
          <span style={{ fontSize: 13, color: barColor, marginLeft: 14, fontWeight: 'bold', width: 35, transition: 'color 0.5s' }}>{approachProgress}%</span>
          <button
             onClick={resetVoyage}
             title="Reset to start of final approach"
             style={{ marginLeft: 12, padding: '3px 10px', fontSize: 10, fontWeight: 'bold', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 20, color: '#fff', cursor: 'pointer', outline: 'none', transition: 'background 0.2s', whiteSpace: 'nowrap' }}
             onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
             onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            ↺ Reset Voyage
          </button>
        </div>
        <div className="nav-subheader-center">
          <button
              onClick={() => setLayout(prev => prev === 'A' ? 'B' : 'A')}
              style={{
                  padding: '3px 12px',
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: layoutView === 'B' ? 'var(--blu)' : 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: 20,
                  color: '#fff',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background 0.2s',
                  marginRight: '10px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = layoutView === 'B' ? 'var(--blu)' : 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = layoutView === 'B' ? 'var(--blu)' : 'rgba(255,255,255,0.15)'}
          >
              Toggle View
          </button>
          <button
              onClick={resetAll}
              style={{
                  padding: '3px 12px',
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: 20,
                  color: '#fff',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
              Reset All
          </button>
        </div>
        <div className="nav-subheader-right">
          <div className="nav-subheader-wifi-container">
            <img src={WifiIcon} alt="Wi-Fi" style={{ height: 24, width: 24 }} />
            <span>eduroam</span>
          </div>
        </div>
      </div>
    </div>
  );
}
