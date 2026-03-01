// WebSocket连接服务
let ws = null

export function connectWebSocket(onMessage, onConnectionChange) {
  // When served via ngrok (HTTPS), connect wss to same host (port 443 default).
  // When served via Vite dev server (HTTP local), connect directly to :3000.
  const isSecure   = window.location.protocol === 'https:'
  const SERVER_URL = isSecure
    ? `wss://${window.location.host}/ws`       // ngrok → Vite proxy → port 3000
    : `ws://${window.location.hostname}:3000`  // local dev
  
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
    // 5秒后重连
    setTimeout(() => connectWebSocket(onMessage, onConnectionChange), 5000)
  }
  
  return ws
}

export function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}
