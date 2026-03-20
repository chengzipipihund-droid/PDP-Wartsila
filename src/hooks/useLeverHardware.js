/* ═══════════════════════════════════════════════════════════
   useLeverHardware.js — Real-time hardware lever data hook
   
   ── FEATURES ──
   • Connects to Node.js backend via WebSocket or fetch
   • Continuously receives lever position (-100 to +100)
   • Estimates RPM from lever position
   • Refreshes AI suggestions every 60s
   • Runs in background regardless of UI visibility
   • Graceful fallback to mock data for development
   
   ── CONFIGURATION ──
   Update HARDWARE_IP and PORT to match your Node.js server
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useCallback } from "react";

// ── Hardware connection config ──
const HARDWARE_IP = "172.20.10.3";  // Controller PC on iPhone hotspot
const HARDWARE_PORT = 3001;
const HARDWARE_URL = `ws://${HARDWARE_IP}:${HARDWARE_PORT}`;

// ── Polling interval for fetch fallback ──
const FETCH_INTERVAL_MS = 100;  // Poll every 100ms for smooth updates

// ── AI suggestion refresh interval ──
const AI_REFRESH_MS = 60_000;

// ── RPM estimation ──
export function estimateRPM(leverPos) {
  return Math.round(150 + Math.abs(leverPos) * 5.5 + Math.random() * 10);
}

export default function useLeverHardware() {
  const [leverPos, setLeverPos] = useState(0);
  const [rpm, setRpm] = useState(150);
  const [aiData, setAiData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const leverRef = useRef(0);
  const rpmRef = useRef(150);
  const pollIntervalRef = useRef(null);

  // ── AI suggestion fetch ──
  const fetchAISuggestion = useCallback(async () => {
    try {
      const response = await fetch(
        `http://${HARDWARE_IP}:${HARDWARE_PORT}/api/ai-suggestion?leverPos=${leverRef.current}&rpm=${rpmRef.current}`,
        { method: "GET", timeout: 5000 }
      );
      
      if (!response.ok) {
        console.warn("[AI] HTTP error:", response.status);
        return;
      }

      const data = await response.json();
      setAiData(data);
    } catch (e) {
      console.warn("[AI] Fetch failed:", e.message);
      // Fallback: generate mock AI data
      setAiData({
        suggestedPosition: Math.max(-100, Math.min(100, leverRef.current * 0.78 + 2)),
        energySavingKw: 2.5 + Math.random() * 3.5,
        energySavingPct: 6 + Math.random() * 12,
        fuelSavingLph: 0.8 + Math.random() * 2,
        confidence: 0.7 + Math.random() * 0.25,
        timestamp: Date.now(),
        modelVersion: "mock-fallback",
      });
    }
  }, []);

  // ── Handle incoming lever data ──
  const handleLeverData = useCallback((p) => {
    leverRef.current = p;
    setLeverPos(p);
    
    const newRpm = estimateRPM(p);
    rpmRef.current = newRpm;
    setRpm(newRpm);
  }, []);

  // ── WebSocket connection ──
  useEffect(() => {
    let aiInterval = null;
    let reconnectTimeout = null;
    let wsConnected = false;
    let wsAttempt = 0;

    const connectWebSocket = () => {
      wsAttempt++;
      console.log(`[LEVER] WebSocket attempt ${wsAttempt} to ${HARDWARE_URL}`);
      
      try {
        wsRef.current = new WebSocket(HARDWARE_URL);

        wsRef.current.onopen = () => {
          console.log("[LEVER] ✓ WebSocket connected successfully");
          wsConnected = true;
          wsAttempt = 0; // Reset attempt counter
          setIsConnected(true);
          setError(null);
          
          // Start AI refresh on successful connection
          fetchAISuggestion();
          aiInterval = setInterval(fetchAISuggestion, AI_REFRESH_MS);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Server sends: { raw: [n1, n2], percent: number (-100 to +100) }
            if (typeof data.percent === "number") {
              handleLeverData(data.percent);
            }
          } catch (e) {
            console.warn("[LEVER] JSON parse error:", e.message);
          }
        };

        wsRef.current.onerror = (e) => {
          console.warn("[LEVER] ✗ WebSocket error:", e);
          wsConnected = false;
        };

        wsRef.current.onclose = () => {
          console.log("[LEVER] ⊘ WebSocket closed");
          wsConnected = false;
          
          if (isConnected) {
            setIsConnected(false);
          }
          
          // Clear AI interval
          if (aiInterval) clearInterval(aiInterval);
          
          // If we haven't started polling yet, do so immediately
          if (!pollIntervalRef.current) {
            console.log("[LEVER] Starting HTTP polling as fallback...");
            initiateFetchPolling();
          } else {
            // Otherwise just reconnect WebSocket later
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (e) {
        console.error("[LEVER] WebSocket connection error:", e.message);
        wsConnected = false;
        
        // Immediately fallback to polling
        if (!pollIntervalRef.current) {
          console.log("[LEVER] Starting HTTP polling as fallback...");
          initiateFetchPolling();
        }
      }
    };

    const initiateFetchPolling = () => {
      console.log(`[LEVER] 🔄 Starting HTTP polling (${FETCH_INTERVAL_MS}ms interval)`);
      
      let lastData = null;
      let pollAttempt = 0;
      
      pollIntervalRef.current = setInterval(async () => {
        pollAttempt++;
        
        try {
          const response = await fetch(`http://${HARDWARE_IP}:${HARDWARE_PORT}/api/lever-status`, {
            method: "GET",
            timeout: 2000,
          });
          
          if (!response.ok) {
            if (pollAttempt % 10 === 0) {
              console.warn(`[FETCH] HTTP ${response.status} (attempt ${pollAttempt})`);
            }
            return;
          }

          const data = await response.json();
          
          // Avoid duplicate updates
          if (JSON.stringify(data) === JSON.stringify(lastData)) return;
          
          lastData = data;
          
          if (typeof data.leverPos === "number") {
            handleLeverData(data.leverPos);
            
            if (!isConnected) {
              console.log("[FETCH] ✓ Connected via HTTP polling");
              setIsConnected(true);
              setError(null);
            }
          }
        } catch (e) {
          if (pollAttempt === 1 || pollAttempt % 20 === 0) {
            console.warn(`[FETCH] Error: ${e.message} (attempt ${pollAttempt})`);
          }
          
          if (isConnected) {
            setIsConnected(false);
            setError(`Network error: ${e.message}`);
          }
        }
      }, FETCH_INTERVAL_MS);

      // Start AI refresh with polling
      console.log("[AI] Starting AI suggestion refresh (60s interval)");
      fetchAISuggestion();
      aiInterval = setInterval(fetchAISuggestion, AI_REFRESH_MS);
    };

    // Attempt WebSocket first
    connectWebSocket();

    return () => {
      // Cleanup
      console.log("[LEVER] Cleaning up hardware connections");
      
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (aiInterval) clearInterval(aiInterval);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [handleLeverData, fetchAISuggestion, isConnected]);

  return {
    leverPos,
    rpm,
    aiData,
    isConnected,
    error,
  };
}
