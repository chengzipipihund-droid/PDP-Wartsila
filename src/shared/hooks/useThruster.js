import { useState, useEffect } from 'react'
import { subscribe } from './useHardwareSocket'

/**
 * useThruster — live thruster setpoints from hardware.
 *
 * Returns:
 *   port       number   port thruster      -100..100 %
 *   starboard  number   starboard thruster -100..100 %
 *   bow        number   bow thruster       -100..100 %
 */
export default function useThruster() {
  const [port,      setPort]      = useState(0)
  const [starboard, setStarboard] = useState(0)
  const [bow,       setBow]       = useState(0)

  useEffect(() => {
    return subscribe('THRUSTER_DATA', ({ port, starboard, bow }) => {
      setPort(port)
      setStarboard(starboard)
      setBow(bow)
    })
  }, [])

  return { port, starboard, bow }
}
