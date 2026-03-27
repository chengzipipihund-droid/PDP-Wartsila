import React, { useEffect, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardSim } from './hooks/useKeyboardSim';
import { useGameLoop } from './hooks/useGameLoop';
import { useBCUControl } from './hooks/useBCUControl';
import { useStore } from './stores/useShipStore';
import { checkAdvisories } from './engine/aiAdvisor';
import TopBar from './components/layout/TopBar';
import BottomBar from './components/layout/BottomBar';
import MapCanvas from './components/map/MapCanvas';
import LeverPanel from './components/lever/LeverPanel';
import AIPanel from './components/ai/AIPanel';
import EnergyPanel from './components/energy/EnergyPanel';
import CheckpointPopup from './components/overlay/CheckpointPopup';
import ArrivalOverlay from './components/overlay/ArrivalOverlay';
import Sidebar from '../../layout/Sidebar/Sidebar';
import './styles/global.css';

export default function NavPage() {
  const wsConnected = useWebSocket();
  useKeyboardSim(!wsConnected); // keyboard sim only when no hardware WS
  useGameLoop();
  useBCUControl();              // feed BCU lever data into ship physics

  // AI advisor interval (~1.5s)
  const addLog = useStore(s => s.addLog);
  const lastAdvisory = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useStore.getState();
      const now = Date.now();
      if (now - lastAdvisory.current < 3000) return;

      const advisories = checkAdvisories(state);
      if (advisories.length > 0) {
        addLog(advisories[0].msg, advisories[0].type);
        lastAdvisory.current = now;
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', display: 'flex' }}>
      {/* Nav content */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60fr 40fr',
          gridTemplateRows: '44px 62fr 38fr 28px',
          height: '100%',
          width: '100%',
        }}>
          <TopBar />
          <MapCanvas />
          <LeverPanel />
          <AIPanel />
          <EnergyPanel />
          <BottomBar />
        </div>

        {/* Floating overlay layers */}
        <CheckpointPopup />
        <ArrivalOverlay />
      </div>

      {/* Shared sidebar — right side, matches Energy page layout */}
      <Sidebar />
    </div>
  );
}
