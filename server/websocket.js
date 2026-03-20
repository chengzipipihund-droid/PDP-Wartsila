// ── WebSocket handler + broadcast ───────────────────────────────────────────
import { WebSocket } from 'ws'
import { state, withSuggestions } from './state.js'

const clients = new Set()

// Hook called for every new client — AI subsystem registers this to send catch-up messages
let _newClientHook = null
export function setNewClientHook(fn) { _newClientHook = fn }

export function attachWebSocket(wss) {
  // Ping all clients every 25 s to keep ngrok (and other proxies) from dropping idle connections
  const pingInterval = setInterval(() => {
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.ping()
    })
  }, 25000)

  wss.on('close', () => clearInterval(pingInterval))

  wss.on('connection', (ws) => {
    console.log('New client connected')
    clients.add(ws)

    // Send current alarm state on connect
    ws.send(JSON.stringify({ type: 'INIT', data: state.alarms.map(withSuggestions) }))

    // Send AI catch-up messages (if an episode is in progress)
    if (_newClientHook) {
      const msgs = _newClientHook()
      msgs.forEach(m => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m))
      })
    }

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
