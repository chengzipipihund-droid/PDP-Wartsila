import useBCUData from './useBCUData'
import { onConnectionChange } from './useHardwareSocket'
import { useState, useEffect } from 'react'

export function estimateRPM(leverPos) {
  return Math.round(150 + Math.abs(leverPos) * 5.5 + Math.random() * 10)
}

/**
 * useLeverHardware — backwards-compatible hook for the Energy dashboard.
 * Now powered by the shared hardware socket instead of its own WebSocket.
 */
export default function useLeverHardware() {
  const { registers, leverPos } = useBCUData()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => onConnectionChange(setIsConnected), [])

  return {
    leverPos:    leverPos ?? 0,
    rpm:         estimateRPM(leverPos ?? 0),
    registers,
    isConnected,
    error:       null,
  }
}
