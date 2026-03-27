// ── UDP receiver — python/main.py sends typed JSON messages here ─────────────
// Each message: { type: string, ...data }
//   BCU_DATA      { registers: number[] }   — BCU register values -100..100
//   TEMPERATURE   { value: number }         — Arduino temperature °C
//   THRUSTER_DATA { port, starboard, bow }  — thruster setpoints -100..100

import { createSocket } from 'dgram'
import { broadcast } from '../websocket.js'
import { getSensorSimulator } from '../alarm/ai/index.js'

const hardwareState = {
  bcuRegisters: null,
  temperature:  null,
  thruster:     { port: 0, starboard: 0, bow: 0 },
}

const udpHandlers = {
  BCU_DATA ({ registers }) {
    if (!Array.isArray(registers)) return
    hardwareState.bcuRegisters = registers
    broadcast({ type: 'BCU_DATA', registers })
  },

  TEMPERATURE ({ value }) {
    if (typeof value !== 'number') return
    console.log('[UDP] TEMPERATURE received:', value)
    hardwareState.temperature = value
    // Feed into AI alarm system so anomaly detection still works
    getSensorSimulator()._setTemp(value)
    broadcast({ type: 'TEMPERATURE', value })
  },

  THRUSTER_DATA ({ port, starboard, bow }) {
    hardwareState.thruster = { port, starboard, bow }
    broadcast({ type: 'THRUSTER_DATA', port, starboard, bow })
  },
}

export function setupUDP (app) {
  const udp = createSocket('udp4')
  udp.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString())
      const handler = udpHandlers[data.type]
      if (handler) handler(data)
    } catch { /* ignore malformed packets */ }
  })
  udp.bind(3002, () => console.log('UDP listening on port 3002 (python/main.py)'))

  // REST fallback — returns latest hardware snapshot for polling clients
  app.get('/api/hardware-status', (_req, res) => res.json(hardwareState))
}
