"""
energy_server.py — Unified Energy Backend
Finnlines Superstar Hybrid System

Combines battery_logic.BatterySystem and energy_advisor.EnergyAdvisor into one
HTTP server that the React dashboard polls every second.

Endpoints:
  POST /api/lever   — core tick: receive 4 lever positions → return full dashboard state
  GET  /api/state   — current state snapshot (no physics step)
  POST /api/advise  — AI recommendation from EnergyAdvisor
  POST /api/reset   — reset battery SOC
  GET  /api/health  — liveness probe

Usage:
  python energy_server.py              # runs on port 5001
  python energy_server.py --port=5002
  python energy_server.py --log-dir=./logs
"""

import json
import math
import sys
sys.stdout.reconfigure(encoding='utf-8')
import time
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler

from battery_logic import BatterySystem, LeverState
from energy_advisor import EnergyAdvisor, calc_fuel_rate, VESSEL

# ── Engine constants (from vessel config) ──────────────────────────────────────
N_ENGINES   = VESSEL["n_engines"]    # 4
ENGINE_KW   = VESSEL["engine_kw"]    # 7200 kW each
TOTAL_KW    = VESSEL["total_kw"]     # 28800 kW

# Optimal load band for Wärtsilä 46F: 60–90 % MCR gives best SFOC
OPT_LOW     = 0.60
OPT_HIGH    = 0.90


# ── Engine count heuristic ──────────────────────────────────────────────────────

def engines_needed(demand_kw: float, mode: str) -> int:
    """Return how many engines to run to keep each in the optimal SFOC band."""
    if mode == "ZERO_EMISSION":
        return 0
    if demand_kw <= 0:
        return 2
    # Run fewest engines that keep each ≤ OPT_HIGH × MCR
    for n in range(1, N_ENGINES + 1):
        if demand_kw / n <= ENGINE_KW * OPT_HIGH:
            return max(2, n)
    return N_ENGINES


def engine_energy_flow(load_pct: float):
    """Map engine load to energy-flow arrow type for the dashboard."""
    if load_pct <= 0:
        return {"normal": False, "rapid": False, "input": False}
    if load_pct > 85:
        return {"normal": False, "rapid": True,  "input": False}
    return {"normal": True,  "rapid": False, "input": False}


# ── Global state (one BatterySystem for the whole voyage) ─────────────────────

_battery = BatterySystem()
_engine_capacities = [0.9, 0.9, 1.0, 1.0]  # ME1, ME2, ME3, ME4 initial capacity
_last_result: dict = {}


def _build_dashboard(result: dict, n_eng: int, engine_capacities: list) -> dict:
    """
    Convert BatterySystem.update() output into the full dashboard payload
    that the React store expects.
    """
    engine_kw_total = result["engine_kw"]
    per_engine_kw   = engine_kw_total / n_eng if n_eng > 0 else 0
    load_pct        = (per_engine_kw / ENGINE_KW * 100) if n_eng > 0 else 0

    engines = []
    for i in range(N_ENGINES):
        capacity = engine_capacities[i]
        alarm_level = 0
        if capacity < 0.15:
            alarm_level = 1
        elif capacity < 0.30:
            alarm_level = 2

        engines.append({
            "id":          f"ME{i+1}",
            "model":       "Wärtsilä 46F",
            "kw":          round(per_engine_kw) if i < n_eng else 0,
            "load_pct":    round(load_pct)      if i < n_eng else 0,
            "capacity":    round(capacity * 100),
            "alarm_level": alarm_level,
            "status":      "run"                if i < n_eng else "stop",
            "energy_flow": engine_energy_flow(load_pct if i < n_eng else 0),
        })

    fuel_kgh = calc_fuel_rate(engine_kw_total, n_eng) if n_eng > 0 else 0.0

    return {
        "battery": {
            "soc_pct":        result["soc_pct"],
            "battery_kw":     result["battery_kw"],
            "battery_mode":   result["battery_mode"],
            "energy_kwh":     result["energy_kwh"],
            "remaining_hours": result["remaining_hours"],
        },
        "engines": engines,
        "levers": {
            "cpp_port_kw": result["lever_1_cpp_port_kw"],
            "cpp_stbd_kw": result["lever_2_cpp_stbd_kw"],
            "thr_ps_kw":   result["lever_3_thr_ps_kw"],
            "thr_sb_kw":   result["lever_4_thr_sb_kw"],
        },
        "totals": {
            "propulsion_kw":  result["total_propulsion_kw"],
            "hotel_kw":       result["hotel_kw"],
            "total_demand_kw": result["total_demand_kw"],
            "engine_kw":      result["engine_kw"],
            "solar_kw":       result.get("solar_kw", 0),
        },
        "mode":         result["mode"],
        "fuel_rate_kgh": round(fuel_kgh, 1),
        "n_engines":    n_eng,
    }



# ── HTTP handler ───────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code: int, obj: dict):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type",   "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> dict:
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n)) if n else {}

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    # ── GET ──────────────────────────────────────────────────────────────────

    def do_GET(self):
        if self.path == "/api/health":
            self._json(200, {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()})

        elif self.path == "/api/state":
            self._json(200, _last_result if _last_result else {"error": "no data yet"})

        else:
            self.send_response(404); self.end_headers()

    # ── POST ─────────────────────────────────────────────────────────────────

    def do_POST(self):
        global _engine_capacities
        try:
            body = self._read_body()

            # ── /api/lever — core tick ──────────────────────────────────────
            if self.path == "/api/lever":
                levers = LeverState(
                    cpp_port = float(body.get("cpp_port", 0)),
                    cpp_stbd = float(body.get("cpp_stbd", 0)),
                    thr_ps   = float(body.get("thr_ps",   0)),
                    thr_sb   = float(body.get("thr_sb",   0)),
                )
                mode       = body.get("mode",       "TRANSIT")
                hotel_kw   = float(body.get("hotel_kw",   5000))
                dt_seconds = float(body.get("dt_seconds",    1))

                # New logic: check engine capacity to determine if charging is allowed
                allow_charging = _engine_capacities[0] >= 0.1 and _engine_capacities[1] >= 0.1

                result = _battery.update(
                    levers,
                    mode=mode,
                    dt_seconds=dt_seconds,
                    hotel_kw=hotel_kw,
                    engine_available_kw=TOTAL_KW,
                    allow_charging=allow_charging
                )
                n_eng = engines_needed(result["engine_kw"], mode)

                # New logic: decay capacity of running engines
                for i in range(n_eng):
                    _engine_capacities[i] = max(0, _engine_capacities[i] - 0.0001)

                dashboard = _build_dashboard(result, n_eng, _engine_capacities)

                global _last_result
                _last_result = dashboard
                self._json(200, dashboard)

            # ── /api/advise — AI recommendation ────────────────────────────
            elif self.path == "/api/advise":
                if _advisor is None:
                    self._json(503, {"error": "EnergyAdvisor not loaded"})
                    return
                rec = _advisor.advise(**body)
                self._json(200, _advisor.to_dict(rec))

            # ── /api/reset — reset battery SOC ─────────────────────────────
            elif self.path == "/api/reset":
                soc = float(body.get("soc", 0.80))
                _battery.reset(soc)
                # Reset engine capacities
                _engine_capacities = [0.9, 0.9, 1.0, 1.0]
                _last_result.clear() if isinstance(_last_result, dict) else None
                self._json(200, {"ok": True, "soc": _battery.soc})

            else:
                self.send_response(404); self.end_headers()

        except Exception as exc:
            self._json(400, {"error": str(exc)})

    def log_message(self, fmt, *args):
        pass   # silence default access log


# ── Server entry point ─────────────────────────────────────────────────────────

_advisor = None   # loaded lazily if weights file exists

def serve(port: int = 5001, log_dir: str = None):
    global _advisor
    import os
    weights = os.path.join(os.path.dirname(__file__), "model_weights.json")
    if os.path.exists(weights):
        try:
            _advisor = EnergyAdvisor(weights, log_dir=log_dir)
            print(f"   EnergyAdvisor v{_advisor.model.version} loaded")
        except Exception as e:
            print(f"   EnergyAdvisor NOT loaded: {e}")
    else:
        print(f"   EnergyAdvisor skipped (no model_weights.json)")

    srv = HTTPServer(("0.0.0.0", port), Handler)
    print(f"🚢 Energy Server — Finnlines Superstar")
    print(f"   POST http://localhost:{port}/api/lever  → dashboard state")
    print(f"   POST http://localhost:{port}/api/advise → AI recommendation")
    print(f"   GET  http://localhost:{port}/api/state  → last state")
    print(f"   GET  http://localhost:{port}/api/health → liveness")
    print(f"   Ctrl+C to stop\n")
    srv.serve_forever()


if __name__ == "__main__":
    port    = 5001
    log_dir = None
    for a in sys.argv[1:]:
        if a.startswith("--port="):    port    = int(a.split("=")[1])
        if a.startswith("--log-dir="): log_dir = a.split("=")[1]
    serve(port, log_dir)
