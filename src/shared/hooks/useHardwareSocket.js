/**
 * useHardwareSocket — singleton WebSocket shared by all hardware hooks.
 *
 * Usage in a hook:
 *   import { subscribe, onConnectionChange } from './useHardwareSocket'
 *
 *   useEffect(() => {
 *     const unsub = subscribe('BCU_DATA', (msg) => { ... })
 *     return unsub
 *   }, [])
 */

const subscribers = {}          // { [msgType]: Set<callback> }
const connectionListeners = new Set()

let socket = null
let reconnectTimer = null
let connected = false

function getUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws`
}

function connect() {
  if (socket && (socket.readyState === WebSocket.CONNECTING ||
                 socket.readyState === WebSocket.OPEN)) return

  socket = new WebSocket(getUrl())

  socket.onopen = () => {
    connected = true
    connectionListeners.forEach(cb => cb(true))
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      const subs = subscribers[data.type]
      if (subs) subs.forEach(cb => cb(data))
    } catch { /* ignore */ }
  }

  socket.onclose = () => {
    connected = false
    connectionListeners.forEach(cb => cb(false))
    reconnectTimer = setTimeout(connect, 3000)
  }

  socket.onerror = () => { socket.close() }
}

// Auto-connect on module load
connect()

/**
 * Subscribe to a specific message type.
 * Returns an unsubscribe function.
 */
export function subscribe(type, callback) {
  if (!subscribers[type]) subscribers[type] = new Set()
  subscribers[type].add(callback)
  return () => subscribers[type].delete(callback)
}

/**
 * Subscribe to connection state changes.
 * Fires immediately with the current state.
 * Returns an unsubscribe function.
 */
export function onConnectionChange(callback) {
  connectionListeners.add(callback)
  callback(connected)
  return () => connectionListeners.delete(callback)
}
