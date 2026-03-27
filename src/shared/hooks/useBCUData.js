import { useState, useEffect } from 'react'
import { subscribe } from './useHardwareSocket'

/**
 * useBCUData — live BCU register values from hardware.
 *
 * Returns:
 *   registers  number[6]   raw register values scaled -100..100
 *   leverPos   number      primary lever position (registers[0])
 */
export default function useBCUData() {
  const [registers, setRegisters] = useState(null)
  const [leverPos,  setLeverPos]  = useState(0)

  useEffect(() => {
    return subscribe('BCU_DATA', ({ registers }) => {
      setRegisters(registers)
      setLeverPos(registers[0] ?? 0)
    })
  }, [])

  return { registers, leverPos }
}
