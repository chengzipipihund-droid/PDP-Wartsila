import React from 'react';
import { useWebSocket } from './Pages/nav/hooks/useWebSocket';
import { useKeyboardSim } from './Pages/nav/hooks/useKeyboardSim';
import { useGameLoop } from './Pages/nav/hooks/useGameLoop';
import { useBCUControl } from './Pages/nav/hooks/useBCUControl';
import { useSimControl } from './Pages/nav/hooks/useSimControl';

export function GlobalSimulation() {
  const wsConnected = useWebSocket();
  useKeyboardSim(!wsConnected); // keyboard sim only when no hardware WS
  useGameLoop();
  useBCUControl();              // feed BCU lever data into ship physics
  useSimControl();              // feed virtual lever sim into ship physics
  return null;
}
