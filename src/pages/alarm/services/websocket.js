// WebSocket连接服务
let ws = null

export function connectWebSocket(onMessage, onConnectionChange) {
  // Always route WebSocket through the same host+port as the page (Vite proxies /ws → :3000).
  // This works for localhost, LAN IP (mobile), and ngrok — only one port needs to be reachable.
  const protocol  = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const SERVER_URL = `${protocol}//${window.location.host}/ws`
  
  ws = new WebSocket(SERVER_URL)
  
  ws.onopen = () => {
    console.log('WebSocket connected')
    onConnectionChange(true)
  }
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    onMessage(message)
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    onConnectionChange(false)
  }
  
  ws.onclose = () => {
    console.log('WebSocket disconnected')
    onConnectionChange(false)
    // Reconnect quickly — 1.5 s is enough to avoid jitter without feeling laggy
    setTimeout(() => connectWebSocket(onMessage, onConnectionChange), 1500)
  }
  
  return ws
}

export function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}
