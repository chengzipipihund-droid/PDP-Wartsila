import { useEffect, useRef, useState } from 'react';
import { useStore } from '../stores/useShipStore';

const WS_URL = 'ws://localhost:3001'; // ← Change to controller PC LAN IP

export function useWebSocket() {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const setLevers = useStore(s => s.setLevers);
  const addLog = useStore(s => s.addLog);

  useEffect(() => {
    let reconnectTimer;

    function connect() {
      try {
        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
          setConnected(true);
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
          reconnectTimer = setTimeout(connect, 2000);
        };

        ws.current.onerror = () => ws.current.close();
      } catch {
        reconnectTimer = setTimeout(connect, 2000);
      }
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      ws.current?.close();
    };
  }, []);

  return connected;
}
