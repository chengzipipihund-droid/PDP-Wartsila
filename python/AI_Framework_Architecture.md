# AI Energy Advisor — System Architecture

## Finnlines Superstar Hybrid Energy Optimization

---

## 1. Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ONBOARD (Ship Local)                            │
│                                                                        │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│  │  Sensors  │──→│  React UI    │──→│  Python      │──→│ Voyage Log │ │
│  │  (AIS,    │   │  (Dashboard) │   │  Advisor     │   │ (JSON/CSV) │ │
│  │  BMS,     │   │              │   │              │   │            │ │
│  │  Engine)  │   │  fetch()     │   │  model_      │   │ Saved to   │ │
│  │           │   │  ↕           │   │  weights.json │   │ USB/local  │ │
│  └──────────┘   │  /api/advise │   │  (260 KB)    │   │ disk       │ │
│                  └──────────────┘   └──────────────┘   └──────┬─────┘ │
│                                                               │       │
│  NO internet required. NO self-learning during voyage.        │       │
│  Pure inference from frozen pre-trained weights.              │       │
└───────────────────────────────────────────────────────────────┼───────┘
                                                                │
                                            ┌───────────────────┘
                                            │  Ship docks at port
                                            │  Log uploaded via
                                            │  Wi-Fi / cellular
                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLOUD (Shore-side)                              │
│                                                                        │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │
│  │  Log Storage  │──→│  Retraining  │──→│  New Weights │              │
│  │  (all voyages │   │  Pipeline    │   │  model_      │              │
│  │  from fleet)  │   │              │   │  weights.json │              │
│  │              │   │  stable-     │   │  (validated)  │──→ Push to   │
│  │  PostgreSQL / │   │  baselines3  │   │              │   ships at   │
│  │  S3 / GCS    │   │  SAC / PPO   │   │              │   next port  │
│  └──────────────┘   └──────────────┘   └──────────────┘              │
│                                                                        │
│  Runs on GPU server. Uses real voyage data. Validates before deploy.  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Local Onboard System

### 2.1 What runs on the ship

| Component | Technology | Purpose |
|---|---|---|
| **React Dashboard** | React + TypeScript | Bridge display (Energy Dashboard UI) |
| **Python Advisor** | `energy_advisor.py` + numpy only | Inference engine, HTTP API |
| **Model Weights** | `model_weights.json` (260 KB) | Pre-trained neural network (frozen) |
| **Voyage Logger** | Built into advisor | Records every recommendation + actual sensor data |

### 2.2 What does NOT run on the ship

| NOT onboard | Why |
|---|---|
| PyTorch / TensorFlow | Too heavy, not needed for inference |
| stable-baselines3 | Training library — cloud only |
| sklearn | Was used to train the MLP — weights are exported, sklearn not needed at runtime |
| Any model training | Model is frozen. No learning during voyage. |
| Internet connection | Pure local inference. No cloud calls. |

### 2.3 Dependency chain

```
TRAINING (cloud, one-time)           INFERENCE (ship, every minute)
─────────────────────────           ──────────────────────────────
Python 3.10+                        Python 3.10+
  ├── stable-baselines3               ├── numpy (only dependency)
  ├── gymnasium                        └── model_weights.json
  ├── sklearn
  ├── numpy
  └── pandas
        │
        ▼
  model_weights.json  ──────────→   Deployed to ship
  (260 KB, contains               (no ML libraries needed)
   MLP weights + scaler
   + vessel config)
```

### 2.4 Data flow — every 60 seconds

```
Step 1: React collects sensor data from ship systems
        ┌─ AIS receiver: lat, lon, SOG, COG
        ├─ Wärtsilä UNIC: engine power, RPM, fuel rate
        ├─ CONFIO BMS: battery SOC, charge/discharge rate
        ├─ Power meters: hotel load, systems load
        └─ Weather station: wind speed, sea state

Step 2: React POSTs to local Python API
        POST http://localhost:5001/api/advise
        {
          "distance_nm": 100,
          "soc": 0.65,
          "speed_kn": 19.0,
          "hotel_kw": 6500,
          "time_of_day": 21.0,
          "elapsed_h": 4.5,
          "sea_state": 2.0
        }

Step 3: Python advisor runs inference (<1 ms)
        - Normalize 12 features using stored scaler
        - Forward pass through 4-layer MLP (12→128→64→32→3)
        - Decode raw outputs → lever%, engines, battery mode
        - Apply physics validation (speed, fuel rate estimates)
        - Return Recommendation JSON

Step 4: React displays recommendation on Energy Dashboard
        - Lever gauge shows recommended position
        - Battery mode indicator (CHARGE/IDLE/DISCHARGE)
        - Estimated fuel saving percentage
        - Confidence score
        - Human-readable explanation

Step 5: Logger saves both recommendation AND actual sensor readings
        - Appended to voyage_log_YYYY-MM-DD.jsonl
        - This file is uploaded to cloud after docking
```

---

## 3. Cloud Retraining Pipeline

### 3.1 When retraining happens

```
Ship docks → Upload voyage_log.jsonl → Cloud ingests → Accumulate
                                                            │
                                            Every 20 voyages (or monthly)
                                                            │
                                                            ▼
                                                    Retrain SAC/PPO
                                                            │
                                                    Validate on held-out
                                                    voyage data
                                                            │
                                                    If fuel_saving > current
                                                            │
                                                    Export new model_weights.json
                                                            │
                                                    Push to fleet at next port
```

### 3.2 Cloud training stack

| Component | Technology |
|---|---|
| Training framework | stable-baselines3 (SAC or PPO) |
| Environment | Custom Gymnasium env (same physics) |
| Training data | Real voyage logs from fleet |
| Compute | GPU server (cloud or on-prem) |
| Validation | Hold-out voyages, compare fuel vs baseline |
| Export | sklearn MLPRegressor → JSON weights (or ONNX) |
| Deployment | model_weights.json pushed to ships |

### 3.3 Retraining script (runs in cloud)

```python
# cloud_retrain.py (simplified)
from stable_baselines3 import SAC
from sklearn.neural_network import MLPRegressor

# 1. Load real voyage logs
logs = load_all_voyage_logs("s3://fleet-data/voyages/")

# 2. Build training dataset from real data
X, Y = build_supervised_dataset(logs)
# X = sensor snapshots, Y = actions that achieved best fuel efficiency

# 3. Train MLP (same architecture as current model)
model = MLPRegressor(hidden_layer_sizes=(128, 64, 32), ...)
model.fit(X, Y)

# 4. Validate
score = validate_on_holdout(model, holdout_logs)
if score > current_model_score:
    export_to_json(model, "model_weights_v2.json")
    push_to_fleet("model_weights_v2.json")
```

---

## 4. React Integration

### 4.1 Starting the advisor backend

```bash
# On ship's bridge computer (runs alongside React dev server)
python energy_advisor.py --serve --port=5001
```

### 4.2 React fetch call

```typescript
// In your React component (e.g., EnergyDashboard.tsx)

interface AdvisorResponse {
  lever_pct: number;
  n_engines: number;
  battery_mode: "CHARGE" | "IDLE" | "DISCHARGE";
  battery_rate_kw: number;
  target_speed_kn: number;
  recommended_speed_kn: number;
  phase_name: string;
  fuel_rate_kgh: number;
  fuel_saving_pct: number;
  soc_trend: "RISING" | "STABLE" | "FALLING";
  confidence: number;
  explanation: string;
  inference_ms: number;
  engine_power_kw: number;
  propulsion_power_kw: number;
  renewable_pct: number;
}

async function getAdvice(sensorData: SensorSnapshot): Promise<AdvisorResponse> {
  const res = await fetch("http://localhost:5001/api/advise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      distance_nm: sensorData.distanceSailed,
      soc: sensorData.batterySoc,
      speed_kn: sensorData.sog,
      hotel_kw: sensorData.hotelLoad,
      time_of_day: sensorData.localTime,
      elapsed_h: sensorData.voyageElapsed,
      sea_state: sensorData.beaufort,
    }),
  });
  return res.json();
}

// Call every 60 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const advice = await getAdvice(currentSensors);
    setRecommendation(advice);
    appendToLog(currentSensors, advice); // for voyage logging
  }, 60_000);
  return () => clearInterval(interval);
}, [currentSensors]);
```

### 4.3 Mapping to Energy Dashboard UI

Based on the Wärtsilä Energy Dashboard design in the project files:

| Dashboard Element | Advisor Field | Display |
|---|---|---|
| MAIN ENGINE section | `n_engines`, `engine_power_kw` | "ME 1 RUN / ME 2 RUN / ME 3 STANDBY" |
| BATTERY (ESS) section | `battery_mode`, `soc_trend` | SOC bars, Remaining time, charge indicator |
| ENERGY INDEX flow diagram | `lever_pct`, `battery_mode` | Energy flow arrows (CPP←Engine, ESS→Hotel) |
| ENERGY DATABOARD gauges | `fuel_rate_kgh`, `renewable_pct` | GREEN ENERGY / LFO / LNG gauge readings |
| Advice notification | `explanation` | Toast card: "Open sea: 19.5 kn, 3 engines at optimal load" |
| Auto-Pilot Mode bar | `confidence` | "82% Auto-Pilot Mode Active for 9h42min" |
| Speed indicator | `recommended_speed_kn` | SOG display with recommended overlay |

---

## 5. Voyage Logger Format

```jsonl
{"ts":"2026-04-10T18:01:00Z","dist":0.8,"soc":0.79,"sog":3.2,"hotel":4100,"sea":2.0,"rec":{"lever":28,"engines":0,"batt":"DISCHARGE","fuel":0,"saving":100},"actual":{"fuel_rate":0,"engine_power":0}}
{"ts":"2026-04-10T18:02:00Z","dist":0.9,"soc":0.78,"sog":3.5,"hotel":4150,"sea":2.0,"rec":{"lever":29,"engines":0,"batt":"DISCHARGE","fuel":0,"saving":100},"actual":{"fuel_rate":0,"engine_power":0}}
...
```

One line per minute. ~500 lines per voyage. ~2 KB per line → ~1 MB per voyage log.
Stored locally as `voyage_log_YYYY-MM-DD_HHMM.jsonl`.

---

## 6. Model Versioning

| Version | Source | How deployed |
|---|---|---|
| v1.0 | Synthetic data (200 voyages) | Initial deployment with ship |
| v1.1 | Synthetic + 20 real voyages | Pushed after first month |
| v2.0 | 100+ real voyages, SAC retrained | Major update at drydock |
| v2.x | Incremental with fleet data | Quarterly cloud retraining |

The `model_weights.json` file contains a `"version"` field. The React UI
can display the current model version and last update date.

---

## 7. Summary: What goes where

| Item | Ship (local) | Cloud (shore) |
|---|---|---|
| `energy_advisor.py` | ✅ Runs here | Copy for reference |
| `model_weights.json` | ✅ Loaded here | Generated here |
| `numpy` | ✅ Only dependency | Also used |
| `stable-baselines3` | ❌ Not needed | ✅ For retraining |
| `PyTorch` | ❌ Not needed | ✅ Backend of SB3 |
| `sklearn` | ❌ Not needed | ✅ For MLP export |
| Voyage logs | ✅ Written here | ✅ Uploaded here |
| React dashboard | ✅ Runs here | Dev/build server |
| Internet | ❌ Not required | ✅ Required |
| GPU | ❌ Not needed | ✅ For training |
