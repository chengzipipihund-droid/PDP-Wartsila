import { useEffect, useRef, useState } from 'react';
import { useStore } from '../stores/useShipStore';

// Derive from the page origin so this works over the Vite dev proxy, on a LAN
// IP, and behind HTTPS — instead of hardcoding a host that only exists locally.
function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

const RECONNECT_MIN_MS = 2000;
const RECONNECT_MAX_MS = 30000;   // back off instead of hammering a dead host

export function useWebSocket() {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const setLevers = useStore(s => s.setLevers);
  const addLog = useStore(s => s.addLog);

  useEffect(() => {
    let reconnectTimer;
    let retryDelay = RECONNECT_MIN_MS;
    let closed = false;

    function scheduleReconnect() {
      if (closed) return;
      reconnectTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, RECONNECT_MAX_MS);
    }

    function connect() {
      if (closed) return;
      try {
        ws.current = new WebSocket(wsUrl());

        ws.current.onopen = () => {
          setConnected(true);
          retryDelay = RECONNECT_MIN_MS;   // reset backoff on a good connection
          addLog('Controller connected via WebSocket', 'i');
        };

        ws.current.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            // Python sends: { lever_a: 0-100, lever_b: 0-100 }
            if (data.lever_a !== undefined) {
              setLevers(data.lever_a, data.lever_b);
            }
          } catch {}
        };

        ws.current.onclose = () => {
          setConnected(false);
          scheduleReconnect();
        };

        ws.current.onerror = () => ws.current.close();
      } catch {
        scheduleReconnect();
      }
    }

    connect();
    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      ws.current?.close();
    };
  }, []);

  return connected;
}
