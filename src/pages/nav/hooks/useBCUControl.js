import { useEffect, useRef } from 'react'
import { subscribe } from '../../../shared/hooks/useHardwareSocket'
import { useStore, _physics } from '../stores/useShipStore'

/**
 * useBCUControl — feeds real-time BCU hardware data into Nav ship physics.
 *
 * Register mapping (all values -100..100):
 *   IR0 + IR1  average → CPP1 / portLever  (converted to 0..100)
 *   IR2 + IR3  average → CPP2 / stbdLever  (converted to 0..100)
 *   IR4                → Bow Thruster 1    (-100..100)
 *   IR5                → Bow Thruster 2    (-100..100)
 */
export function useBCUControl() {
  const setLevers    = useStore(s => s.setLevers)
  const setAutoMode  = useStore(s => s.setAutoMode)
  const wasActiveRef = useRef(false)

  useEffect(() => {
    return subscribe('BCU_DATA', ({ registers }) => {
      if (!registers || registers.length < 6) return

      // CPP1: IR0+IR1 average → 0..100 lever scale
      const cpp1 = Math.max(0, Math.min(100, ((registers[0] + registers[1]) / 2 + 100) / 2))
      // CPP2: IR2+IR3 average → 0..100 lever scale
      const cpp2 = Math.max(0, Math.min(100, ((registers[2] + registers[3]) / 2 + 100) / 2))

      // Bow thrusters: keep raw -100..100
      const bow1 = registers[4]
      const bow2 = registers[5]

      setLevers(cpp1, cpp2)

      // Store bow values in physics (for heading effect + display)
      _physics.bow1 = bow1
      _physics.bow2 = bow2
      _physics.bowThruster = (bow1 + bow2) / 2 / 100  // combined -1..1 for heading

      // Switch off auto-route-follow when hardware is actively moved
      const isActive = Math.abs(registers[0]) > 5 || Math.abs(registers[2]) > 5
        || Math.abs(bow1) > 5 || Math.abs(bow2) > 5
      if (isActive && !wasActiveRef.current) {
        setAutoMode(false)
        wasActiveRef.current = true
      }
    })
  }, [setLevers, setAutoMode])
}
