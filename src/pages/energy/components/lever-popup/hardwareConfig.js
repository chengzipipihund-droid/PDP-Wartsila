/* ═══════════════════════════════════════════════════════════
   hardwareConfig.js — Hardware connection configuration
   
   ── CONFIGURATION GUIDE ──
   Update these settings to match your Node.js hardware backend
   
   Supported protocols:
   • WebSocket (recommended for real-time updates)
   • HTTP fetch polling (fallback)
   ═══████════════════════════════════════════════════════════ */

// ── Hardware Server Configuration ──
export const HARDWARE_CONFIG = {
  // Protocol: "ws" | "http"
  protocol: process.env.REACT_APP_HARDWARE_PROTOCOL || "ws",
  
  // Server IP address (update with your Node.js backend IP)
  ip: process.env.REACT_APP_HARDWARE_IP || "172.20.10.3",
  
  // Server port
  port: process.env.REACT_APP_HARDWARE_PORT || 3001,
  
  // Connect/reconnect timeout (ms)
  connectionTimeout: 5000,
  
  // Reconnect interval when connection fails (ms)
  reconnectInterval: 3000,
  
  // Polling interval for HTTP fetch fallback (ms)
  pollInterval: 100,
};

// ── WebSocket Message Format ──
// Expected incoming message:
// {
//   leverPos: number (-100 to +100),    // Lever position
//   rpm?: number,                        // Optional: Engine RPM
//   timestamp?: number,                  // Optional: Server timestamp
//   status?: string,                     // Optional: Connection status
// }

// ── HTTP Endpoints (if using fetch polling) ──
// GET /api/lever-status → returns { leverPos, rpm, timestamp }
// GET /api/ai-suggestion?leverPos=X&rpm=Y → returns AI suggestion

// ── Environment Variables ──
// REACT_APP_HARDWARE_PROTOCOL = "ws" | "http"
// REACT_APP_HARDWARE_IP = "192.168.1.100"
// REACT_APP_HARDWARE_PORT = 3001

export function getHardwareUrl() {
  const { protocol, ip, port } = HARDWARE_CONFIG;
  const baseUrl = `${ip}:${port}`;
  
  if (protocol === "ws") {
    return `ws://${baseUrl}`;
  } else {
    return `http://${baseUrl}`;
  }
}

export default HARDWARE_CONFIG;
