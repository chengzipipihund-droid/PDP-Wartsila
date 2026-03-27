import { useState, useEffect } from 'react'
import { subscribe } from './useHardwareSocket'

/**
 * useTemperature — live temperature reading from the Arduino sensor.
 *
 * Returns:
 *   temperature  number | null   latest °C reading, null if sensor unavailable
 */
export default function useTemperature() {
  const [temperature, setTemperature] = useState(null)

  useEffect(() => {
    return subscribe('TEMPERATURE', ({ value }) => setTemperature(value))
  }, [])

  return { temperature }
}
