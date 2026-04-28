"""
energy_advisor.py — Onboard Real-Time Hybrid Energy Advisor
Finnlines Superstar (Finnsirius / Finncanopus)
Model version: 1.0 (pre-trained on 200 synthetic voyages, 28800 samples, R²=0.992)

DEPENDENCIES (ship-side): numpy only
TRAINING DEPENDENCIES (cloud-side): stable-baselines3, sklearn, gymnasium, pandas

USAGE — Python:
    from energy_advisor import EnergyAdvisor
    advisor = EnergyAdvisor("model_weights.json")
    rec = advisor.advise(distance_nm=100, soc=0.65, speed_kn=19, ...)

USAGE — React backend:
    python energy_advisor.py --serve --port=5001

USAGE — With voyage logging:
    python energy_advisor.py --serve --port=5001 --log-dir=./voyage_logs

CSV default data:
    docs.google.com/spreadsheets/d/e/2PACX-1vQz9RlwqsjKPiyheNOLrGQ0jeQH6JJAEqDmu484ZI86AKMKS6xYbo6Hd0MK0WaZYw/pub?output=csv
"""

import numpy as np
import json
import time
import os
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from typing import Optional, List

MODEL_VERSION = "1.0"

# ═══════════════════════════════════════════════════════════════════════
# VESSEL CONFIG — Finnlines Superstar (Finnsirius/Finncanopus)
# ═══════════════════════════════════════════════════════════════════════
# Sources: Finnlines press releases, Wärtsilä case study, Shippax,
# Baird Maritime, Direct Ferries route data.
# Editable default CSV:
#   docs.google.com/spreadsheets/d/e/2PACX-1vQz9RlwqsjKPiyheNOLrGQ0jeQH6JJAEqDmu484ZI86AKMKS6xYbo6Hd0MK0WaZYw/pub?output=csv

VESSEL = {
    "n_engines": 4,           # 4 × Wärtsilä 6L46F
    "engine_kw": 7200,        # per engine MCR
    "total_kw": 28800,        # 4 × 7200
    "f": 3.3430,              # resistance: P = f × v³ (kW/kn³)
    "sfoc": 181,              # g/kWh at 80% MCR (HFO)
    "max_kn": 20.5,
    "batt_kwh": 5000,         # 5 MWh ESS (confirmed)
    "batt_chg": 3500,         # max charge kW
    "batt_dis": 4000,         # max discharge kW
    "batt_eff": 0.92,         # round-trip efficiency
    "soc_min": 0.15,
    "soc_max": 0.95,
    "hotel_peak": 7500,
    "hotel_night": 2800,
    "systems": 850,           # bridge + ECR + nav + safety
    "thr_kw": 5000,           # 2 × 2500 bow thrusters
}

PHASES = [
    {"s":0,  "e":3,  "kn":4, "ne":1,"thr":1,"arch":0,"port":1,"name":"Naantali Departure"},
    {"s":3,  "e":25, "kn":12,"ne":2,"thr":0,"arch":1,"port":0,"name":"Turku Archipelago"},
    {"s":25, "e":55, "kn":19,"ne":3,"thr":0,"arch":0,"port":0,"name":"Open Sea Leg 1"},
    {"s":55, "e":63, "kn":5, "ne":1,"thr":1,"arch":0,"port":1,"name":"Långnäs"},
    {"s":63, "e":80, "kn":14,"ne":2,"thr":0,"arch":1,"port":0,"name":"Åland Archipelago"},
    {"s":80, "e":165,"kn":20,"ne":3,"thr":0,"arch":0,"port":0,"name":"Open Sea Leg 2"},
    {"s":165,"e":180,"kn":14,"ne":2,"thr":0,"arch":1,"port":0,"name":"Swedish Archipelago"},
    {"s":180,"e":184,"kn":4, "ne":0,"thr":1,"arch":0,"port":1,"name":"Kapellskär Arrival"},
]

ROUTE_NM = 184
SCHEDULED_HOURS = 8.5


# ═══════════════════════════════════════════════════════════════════════
# PHYSICS — P = f × v³
# ═══════════════════════════════════════════════════════════════════════

def resistance_power(v: float, arch: bool = False, sea: float = 2.0) -> float:
    """Propulsion power required. P = 3.343 × v³ with modifiers."""
    if v <= 0:
        return 0.0
    P = VESSEL["f"] * v ** 3
    P *= 1.0 + 0.03 * sea + 0.008 * sea ** 2   # sea state
    if arch:
        P *= 1.08                                # shallow water
    else:
        P *= 0.95                                # air lubrication
    return P


def calc_sfoc(load_pct: float) -> float:
    """SFOC (g/kWh), U-shaped curve, optimal at ~80% MCR."""
    x = np.clip(load_pct, 20, 110) / 80.0
    return VESSEL["sfoc"] * (1 + 0.30 * (x - 1) ** 2 + 0.18 * max(0, 0.5 - x) ** 2)


def calc_fuel_rate(kw: float, ne: int) -> float:
    """Total fuel rate in kg/h for ne engines at total power kw."""
    if kw <= 0 or ne <= 0:
        return 0.0
    n = min(int(ne), VESSEL["n_engines"])
    per = kw / n
    load = per / VESSEL["engine_kw"] * 100
    if load < 20:
        per = VESSEL["engine_kw"] * 0.20
        load = 20.0
    return n * per * calc_sfoc(load) / 1000.0


def get_phase(dist_nm: float) -> dict:
    for p in PHASES:
        if p["s"] <= dist_nm < p["e"]:
            return p
    return PHASES[-1]


# ═══════════════════════════════════════════════════════════════════════
# NEURAL NETWORK — pure numpy inference from JSON weights
# ═══════════════════════════════════════════════════════════════════════
# Architecture: 12 → 128 → 64 → 32 → 3 (ReLU activations)
# Trained with sklearn.MLPRegressor, weights exported to JSON.
# At inference: NO sklearn, NO PyTorch, NO TF — just numpy matmul.

class NumpyMLP:
    """Forward-pass only MLP. Loads weights from model_weights.json."""

    def __init__(self, path: str):
        with open(path, "r") as f:
            data = json.load(f)
        self.mean = np.array(data["scaler_mean"], dtype=np.float64)
        self.scale = np.array(data["scaler_scale"], dtype=np.float64)
        self.layers = [(np.array(l["W"]), np.array(l["b"])) for l in data["layers"]]
        self.version = data.get("version", MODEL_VERSION)

    def predict(self, features: np.ndarray) -> np.ndarray:
        x = (features.astype(np.float64) - self.mean) / self.scale
        for i, (W, b) in enumerate(self.layers):
            x = x @ W + b
            if i < len(self.layers) - 1:
                x = np.maximum(0, x)  # ReLU
        return x


# ═══════════════════════════════════════════════════════════════════════
# VOYAGE LOGGER — records data for cloud retraining
# ═══════════════════════════════════════════════════════════════════════

class VoyageLogger:
    """
    Writes one JSONL line per advisor call.
    File is uploaded to cloud when ship docks.
    Cloud uses these logs to retrain the model with real data.
    """

    def __init__(self, log_dir: str = "./voyage_logs"):
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
        self.path = os.path.join(log_dir, f"voyage_{ts}.jsonl")
        self.count = 0

    def log(self, sensor_input: dict, recommendation: dict, actual_readings: dict = None):
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "model_version": MODEL_VERSION,
            "input": sensor_input,
            "recommendation": recommendation,
        }
        if actual_readings:
            entry["actual"] = actual_readings
        with open(self.path, "a") as f:
            f.write(json.dumps(entry) + "\n")
        self.count += 1

    def get_path(self) -> str:
        return self.path


# ═══════════════════════════════════════════════════════════════════════
# RECOMMENDATION OUTPUT
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class Recommendation:
    # Primary controls
    lever_pct: float              # 0–100 (recommended lever position)
    n_engines: int                # 0–4 (recommended engines online)
    battery_mode: str             # CHARGE / IDLE / DISCHARGE
    battery_rate_kw: int          # suggested charge/discharge rate

    # Navigation
    target_speed_kn: float        # phase target
    recommended_speed_kn: float   # what the lever setting produces
    phase_name: str

    # Efficiency
    fuel_rate_kgh: float          # estimated fuel rate at recommendation
    fuel_saving_pct: float        # vs 70%-lever baseline
    soc_trend: str                # RISING / STABLE / FALLING

    # Meta
    confidence: float             # 0–1
    explanation: str              # human-readable for bridge crew
    inference_ms: float           # latency
    model_version: str            # for tracking

    # Dashboard data
    engine_power_kw: float = 0
    propulsion_power_kw: float = 0
    renewable_pct: float = 0
    remaining_nm: float = 0
    eta_hours: float = 0


# ═══════════════════════════════════════════════════════════════════════
# ADVISOR — the main class
# ═══════════════════════════════════════════════════════════════════════

class EnergyAdvisor:
    """
    Pre-trained onboard energy advisor.

    This model is FROZEN during the voyage — it does not learn or
    self-modify at sea. All it does is:
      1. Read sensor snapshot (12 features)
      2. Run MLP forward pass (<1ms)
      3. Decode + validate output
      4. Return recommendation
      5. Log both input and output for cloud retraining

    Retraining happens ONLY in the cloud, after voyage logs are
    uploaded from the ship at port.
    """

    def __init__(self, weights_path: str = "model_weights.json",
                 log_dir: str = None):
        self.model = NumpyMLP(weights_path)
        self.logger = VoyageLogger(log_dir) if log_dir else None
        self.call_count = 0

    def advise(self, *,
               distance_nm: float,
               soc: float,
               speed_kn: float,
               hotel_kw: float,
               time_of_day: float,
               elapsed_h: float,
               sea_state: float = 2.0,
               lat: float = None,
               lon: float = None,
               actual_fuel_kgh: float = None,
               actual_engine_kw: float = None,
               ) -> Recommendation:
        """
        Get energy management recommendation from current sensor data.

        Required parameters (from ship sensors):
            distance_nm   — distance sailed from route start (GPS/log)
            soc           — battery state of charge, 0–1 (CONFIO BMS)
            speed_kn      — current SOG (AIS/GPS)
            hotel_kw      — hotel electrical load (power meters)
            time_of_day   — local time, 0–24 hours
            elapsed_h     — hours since departure
            sea_state     — Beaufort scale (weather station)

        Optional (for logging):
            lat, lon           — GPS position
            actual_fuel_kgh    — measured fuel rate (for log accuracy)
            actual_engine_kw   — measured engine power (for log accuracy)

        Returns:
            Recommendation dataclass (also available as dict via to_dict)
        """
        t0 = time.time()

        phase = get_phase(distance_nm)
        tgt = phase["kn"]

        # ── Build feature vector (12 features, same order as training) ──
        tod = time_of_day
        features = np.array([
            distance_nm / ROUTE_NM,               # 0: progress
            soc,                                    # 1: battery SOC
            tgt / VESSEL["max_kn"],                # 2: phase target speed
            hotel_kw / VESSEL["hotel_peak"],       # 3: hotel load level
            elapsed_h / 10.0,                      # 4: voyage time
            sea_state / 5.0,                       # 5: sea conditions
            float(phase["arch"]),                  # 6: archipelago flag
            float(phase["port"]),                  # 7: port/harbour flag
            phase["ne"] / 4.0,                     # 8: phase default engines
            (ROUTE_NM - distance_nm) / ROUTE_NM,  # 9: remaining distance
            np.sin(2 * np.pi * tod / 24),          # 10: time-of-day (cyclic)
            np.cos(2 * np.pi * tod / 24),          # 11: time-of-day (cyclic)
        ])

        # ── MLP inference ──
        raw = self.model.predict(features)
        lever_frac = float(np.clip(raw[0], 0.3, 1.0))
        n_engines = int(np.clip(round(raw[1]), 0, 4))
        batt_raw = float(np.clip(raw[2], -1, 1))

        # ── Phase-specific overrides (safety) ──
        if phase["port"]:
            lever_frac = min(lever_frac, 0.30)
            n_engines = min(n_engines, 1)

        # ── Decode battery action ──
        if batt_raw < -0.33:
            batt_mode = "CHARGE"
            batt_rate = int(VESSEL["batt_chg"] * min(1.0, abs(batt_raw)))
        elif batt_raw > 0.33:
            batt_mode = "DISCHARGE"
            batt_rate = int(VESSEL["batt_dis"] * min(1.0, batt_raw))
        else:
            batt_mode = "IDLE"
            batt_rate = 0

        # ── Physics estimates ──
        rec_speed = tgt * lever_frac
        prop_kw = resistance_power(rec_speed, bool(phase["arch"]), sea_state)
        elec = hotel_kw + VESSEL["systems"]
        if phase["thr"]:
            elec += VESSEL["thr_kw"] * 0.7
        ren_kw = elec * 0.06  # 5–7% renewable band, use midpoint
        eng_demand = prop_kw + max(0, elec - ren_kw)

        if batt_mode == "CHARGE" and n_engines > 0:
            eng_demand += batt_rate
        elif batt_mode == "DISCHARGE":
            eng_demand = max(0, eng_demand - batt_rate * np.sqrt(VESSEL["batt_eff"]))

        fuel_kgh = calc_fuel_rate(eng_demand, n_engines) if n_engines > 0 else 0.0

        # Baseline comparison (70% lever, phase-default engines, no battery)
        base_prop = resistance_power(tgt * 0.7, bool(phase["arch"]), sea_state)
        base_fuel = calc_fuel_rate(base_prop + elec, phase["ne"])
        saving = (1 - fuel_kgh / max(1, base_fuel)) * 100

        # SOC trend
        soc_trend = "RISING" if batt_mode == "CHARGE" else ("FALLING" if batt_mode == "DISCHARGE" else "STABLE")

        # Confidence
        conf = 0.85
        if soc < 0.20 or soc > 0.92:
            conf -= 0.15
        if abs(speed_kn - tgt) > 4:
            conf -= 0.10
        conf = round(max(0.3, min(1.0, conf)), 2)

        # ETA
        remaining = ROUTE_NM - distance_nm
        eta_h = remaining / max(0.5, rec_speed)

        # Explanation
        parts = []
        if phase["port"] and n_engines == 0:
            parts.append("Zero-emission port (battery only)")
        elif phase["port"]:
            parts.append(f"Harbour: {n_engines}E, lever {lever_frac*100:.0f}%")
        elif phase["arch"]:
            parts.append(f"Archipelago: {rec_speed:.1f} kn, {n_engines}E")
        else:
            parts.append(f"Open sea: {rec_speed:.1f} kn, {n_engines}E optimal load")
        if batt_mode == "CHARGE":
            parts.append(f"Charging {batt_rate} kW")
        elif batt_mode == "DISCHARGE":
            parts.append(f"Battery assist {batt_rate} kW")
        if abs(saving) > 3:
            parts.append(f"Fuel {saving:+.0f}%")

        ms = round((time.time() - t0) * 1000, 3)

        rec = Recommendation(
            lever_pct=round(lever_frac * 100, 1),
            n_engines=n_engines,
            battery_mode=batt_mode,
            battery_rate_kw=batt_rate,
            target_speed_kn=tgt,
            recommended_speed_kn=round(rec_speed, 1),
            phase_name=phase["name"],
            fuel_rate_kgh=round(fuel_kgh, 1),
            fuel_saving_pct=round(saving, 1),
            soc_trend=soc_trend,
            confidence=conf,
            explanation=" | ".join(parts),
            inference_ms=ms,
            model_version=self.model.version,
            engine_power_kw=round(eng_demand),
            propulsion_power_kw=round(prop_kw),
            renewable_pct=round(ren_kw / max(1, elec) * 100, 1),
            remaining_nm=round(remaining, 1),
            eta_hours=round(eta_h, 1),
        )

        # ── Log for cloud retraining ──
        if self.logger:
            sensor_input = {
                "distance_nm": distance_nm, "soc": soc, "speed_kn": speed_kn,
                "hotel_kw": hotel_kw, "time_of_day": time_of_day,
                "elapsed_h": elapsed_h, "sea_state": sea_state,
            }
            if lat is not None:
                sensor_input["lat"] = lat
                sensor_input["lon"] = lon
            actual = {}
            if actual_fuel_kgh is not None:
                actual["fuel_rate_kgh"] = actual_fuel_kgh
            if actual_engine_kw is not None:
                actual["engine_power_kw"] = actual_engine_kw
            self.logger.log(sensor_input, self.to_dict(rec), actual or None)

        self.call_count += 1
        return rec

    def to_dict(self, rec: Recommendation) -> dict:
        return asdict(rec)

    def get_status(self) -> dict:
        return {
            "model_version": self.model.version,
            "calls": self.call_count,
            "log_file": self.logger.get_path() if self.logger else None,
            "log_entries": self.logger.count if self.logger else 0,
        }


# ═══════════════════════════════════════════════════════════════════════
# HTTP API SERVER (for React integration)
# ═══════════════════════════════════════════════════════════════════════

def serve(port: int = 5001, log_dir: str = None):
    from http.server import HTTPServer, BaseHTTPRequestHandler

    weights = "model_weights.json"
    advisor = EnergyAdvisor(weights, log_dir=log_dir)

    class Handler(BaseHTTPRequestHandler):
        def _cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def do_OPTIONS(self):
            self.send_response(200); self._cors(); self.end_headers()

        def do_GET(self):
            if self.path == "/api/status":
                r = json.dumps(advisor.get_status())
                self.send_response(200); self._cors()
                self.send_header("Content-Type", "application/json")
                self.end_headers(); self.wfile.write(r.encode())
            elif self.path == "/api/health":
                self.send_response(200); self._cors(); self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            else:
                self.send_response(404); self.end_headers()

        def do_POST(self):
            if self.path == "/api/advise":
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length)) if length else {}
                try:
                    rec = advisor.advise(**body)
                    r = json.dumps(advisor.to_dict(rec))
                    self.send_response(200); self._cors()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers(); self.wfile.write(r.encode())
                except Exception as e:
                    self.send_response(400); self._cors(); self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
            else:
                self.send_response(404); self.end_headers()

        def log_message(self, fmt, *args):
            pass

    srv = HTTPServer(("0.0.0.0", port), Handler)
    print(f"🚢 Energy Advisor v{MODEL_VERSION}")
    print(f"   API:    http://localhost:{port}/api/advise  (POST)")
    print(f"   Status: http://localhost:{port}/api/status  (GET)")
    print(f"   Health: http://localhost:{port}/api/health  (GET)")
    if log_dir:
        print(f"   Logs:   {advisor.logger.get_path()}")
    print(f"   Ctrl+C to stop\n")
    srv.serve_forever()


# ═══════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys

    if "--serve" in sys.argv:
        port = 5001
        log_dir = None
        for a in sys.argv:
            if a.startswith("--port="):
                port = int(a.split("=")[1])
            if a.startswith("--log-dir="):
                log_dir = a.split("=")[1]
        serve(port, log_dir)
    else:
        # Demo mode
        advisor = EnergyAdvisor("model_weights.json", log_dir="./demo_logs")

        cases = [
            {"distance_nm": 10,  "soc": 0.78, "speed_kn": 11, "hotel_kw": 6500,
             "time_of_day": 19.0, "elapsed_h": 0.5, "sea_state": 2.0},
            {"distance_nm": 100, "soc": 0.55, "speed_kn": 19, "hotel_kw": 5500,
             "time_of_day": 22.0, "elapsed_h": 4.5, "sea_state": 2.5},
            {"distance_nm": 182, "soc": 0.30, "speed_kn": 4,  "hotel_kw": 3500,
             "time_of_day": 2.5,  "elapsed_h": 8.2, "sea_state": 1.5},
        ]

        for i, c in enumerate(cases):
            rec = advisor.advise(**c)
            print(f"\n{'='*60}")
            print(f"  Query {i+1}: {c['distance_nm']}nm | SOC {c['soc']:.0%} | {c['speed_kn']}kn")
            print(f"{'='*60}")
            print(f"  Phase:    {rec.phase_name}")
            print(f"  Lever:    {rec.lever_pct:.0f}%")
            print(f"  Engines:  {rec.n_engines}")
            print(f"  Battery:  {rec.battery_mode} ({rec.battery_rate_kw} kW) [{rec.soc_trend}]")
            print(f"  Speed:    {rec.recommended_speed_kn} kn → {rec.target_speed_kn} target")
            print(f"  Fuel:     {rec.fuel_rate_kgh:.0f} kg/h ({rec.fuel_saving_pct:+.0f}% vs baseline)")
            print(f"  ETA:      {rec.eta_hours:.1f}h ({rec.remaining_nm:.0f} nm remaining)")
            print(f"  Conf:     {rec.confidence:.0%} | Model v{rec.model_version}")
            print(f"  Latency:  {rec.inference_ms:.2f} ms")
            print(f"  → {rec.explanation}")

        print(f"\n📋 Status: {advisor.get_status()}")
