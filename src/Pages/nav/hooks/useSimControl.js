import { useEffect, useRef } from 'react';
import { useEnergyStore } from '../../energy/stores/energyStore';
import { useStore, _physics } from '../stores/useShipStore';

export function useSimControl() {
  const simLevers = useEnergyStore(s => s.simLevers);
  const useSimLevers = useEnergyStore(s => s.useSimLevers);
  const setLevers = useStore(s => s.setLevers);
  const setAutoMode = useStore(s => s.setAutoMode);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (!useSimLevers) return;

    // Convert -100..100 to 0..100
    const cpp1 = (simLevers.cpp_port + 100) / 2;
    const cpp2 = (simLevers.cpp_stbd + 100) / 2;
    const bow1 = simLevers.thr_ps;
    const bow2 = simLevers.thr_sb;

    setLevers(cpp1, cpp2);

    _physics.bow1 = bow1;
    _physics.bow2 = bow2;
    _physics.bowThruster = (bow1 + bow2) / 2 / 100;

    const isActive = Math.abs(simLevers.cpp_port) > 5 || Math.abs(simLevers.cpp_stbd) > 5
      || Math.abs(bow1) > 5 || Math.abs(bow2) > 5;
      
    if (isActive && !wasActiveRef.current) {
      setAutoMode(false);
      wasActiveRef.current = true;
    }
    if (!isActive) {
      wasActiveRef.current = false;
    }
  }, [simLevers, useSimLevers, setLevers, setAutoMode]);
}
