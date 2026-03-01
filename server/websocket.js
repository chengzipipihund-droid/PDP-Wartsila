// ── WebSocket handler + broadcast ───────────────────────────────────────────
import { WebSocket } from 'ws'
import { state, withSuggestions } from './state.js'

const clients = new Set()

export function attachWebSocket(wss) {
  wss.on('connection', (ws) => {
    console.log('New client connected')
    clients.add(ws)

    // Send current alarm state on connect
    ws.send(JSON.stringify({ type: 'INIT', data: state.alarms.map(withSuggestions) }))

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message)
        console.log('Received:', data)
      } catch (err) {
        console.error('Error parsing WS message:', err)
      }
    })

    ws.on('close', () => {
      console.log('Client disconnected')
      clients.delete(ws)
    })
  })
}

export function broadcast(data) {
  const payload = JSON.stringify(data)
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  })
}
