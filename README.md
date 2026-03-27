# PDP-Wärtsilä

A real-time ship dashboard built for Wärtsilä hardware demonstrations. Integrates live BCU lever data, temperature sensing, AI-powered alarm analysis, energy monitoring, and navigation simulation across three pages.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Zustand, Tailwind CSS |
| Backend | Node.js, Express, WebSocket (`ws`) |
| Hardware bridge | Python 3, pymodbus, pyserial |
| AI | Ollama (local LLM) |
| Communication | UDP (Python → Node), WebSocket (Node → Browser) |

---

## Prerequisites

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **Python** 3.10 or later — [python.org](https://python.org)
- **Ollama** (for AI alarm analysis) — [ollama.com](https://ollama.com)

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/PDP-Wartsila.git
cd PDP-Wartsila
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Install Python dependencies

```bash
pip install pymodbus pyserial
```

### 4. Configure environment

Create a `.env` file in the project root:

```env
# Serial port for the Arduino DS18B20 temperature sensor
SENSOR_SERIAL_PORT=COM4
SENSOR_BAUDRATE=9600

# Ollama model to use for alarm AI analysis
AI_MODEL=minimax-m2.5:cloud
OLLAMA_BASE_URL=http://localhost:11434/v1
```

---

## Running the Project

Two processes must run simultaneously — the web server and the hardware bridge.

### Start the web interface (frontend + backend)

```bash
npm run dev
```

This starts:
- **Vite** dev server on `http://localhost:5173` (frontend)
- **Node.js** server on `http://localhost:3000` (REST API + WebSocket)

Open `http://localhost:5173` in your browser.

### Start the BCU hardware bridge

```bash
python python/main.py
```

This connects to the Wärtsilä BCU over **Modbus TCP** (`192.168.1.17:502`) and reads 6 lever position registers (IR0–IR5) at **10 Hz**. It also reads temperature from the Arduino on **COM4**. All data is forwarded to the Node.js server via **UDP on port 3002**.

> If the BCU or Arduino is not connected, the script will warn and continue running — the frontend will show `--` for unavailable data.

---

## Project Structure

```
PDP-Wartsila/
├── python/                     # Hardware bridge (BCU + Arduino → Node.js)
│   ├── main.py                 # Entry point — 10 Hz polling loop
│   ├── hardware/
│   │   ├── bcu.py              # Modbus TCP client for BCU registers
│   │   ├── arduino.py          # Serial reader (temperature) + motor/servo writer
│   │   └── thruster.py        # Thruster setpoint calculator
│   ├── control/
│   │   └── lever.py            # PWM / servo angle math + ML model hook
│   └── comms/
│       └── udp.py              # Sends typed JSON messages to Node.js :3002
│
├── server/                     # Node.js backend
│   ├── index.js                # Express app, mounts all routes, starts UDP listener
│   ├── websocket.js            # WebSocket server, broadcast() to all browser clients
│   ├── alarm/                  # Alarm page backend
│   │   ├── ai/
│   │   │   ├── sensorSimulator.js   # Reads Arduino temp via serial, detects anomalies
│   │   │   ├── alarmSequencer.js    # Triggers AI pipeline on anomaly events
│   │   │   ├── aiClient.js          # Calls Ollama, parses structured JSON responses
│   │   │   ├── pdfParser.js         # Extracts text from Wärtsilä service manual PDF
│   │   │   ├── promptBuilder.js     # Builds system/user prompts for Ollama
│   │   │   └── fakeSensors.js       # Simulated sensor data for AI context
│   │   ├── routes/
│   │   │   ├── alarms.js            # GET/POST alarm state REST endpoints
│   │   │   ├── sessionLog.js        # Session event logging
│   │   │   └── voiceNotes.js        # Voice note attachments
│   │   ├── data/                    # Static alarm definitions and mock stats
│   │   └── state.js                 # Shared in-memory alarm state
│   └── energy/
│       └── udpHandler.js       # Receives BCU_DATA / TEMPERATURE / THRUSTER_DATA from Python
│
└── src/                        # React frontend
    ├── main.jsx                # Router — maps / → Energy, /alarm → Alarm, /nav → Nav
    ├── Pages/
    │   ├── energy/             # Energy Dashboard page
    │   ├── alarm/              # Alarm Management page
    │   └── nav/                # Navigation page
    ├── layout/
    │   └── Sidebar/            # Shared sidebar (page switcher, night mode toggle)
    └── shared/
        └── hooks/
            └── useHardwareSocket.js  # Singleton WebSocket to Node :3000, shared across all pages
```

---

## Pages

### Energy Dashboard (`/`)

Monitors ship energy systems in real time.

- **Main Engine Panel** — RPM gauge, engine load
- **Battery Panel** — state of charge, charge/discharge rate
- **Energy Databoard** — live RPM readout
- **Energy Network diagram** — visual flow between engine, battery, propulsion, and hotel load
- **Lever Popup** — slide-in panel showing live BCU lever positions (IR0–IR5) mapped to motor and servo commands; supports Manual / Co-pilot modes
- **Eco Mode** — alternative view for energy-saving analysis
- **AI Energy Optimizer** — floating widget that suggests optimal operating setpoints

Data sources: BCU registers via `THRUSTER_DATA` WebSocket message, hardware lever via `BCU_DATA`.

---

### Alarm Management (`/alarm`)

Detects temperature anomalies and runs AI-powered root cause analysis.

- **Header** — live temperature reading from Arduino DS18B20 with green/grey connection indicator
- **Alarm List** — active and historical alarms, colour-coded by severity
- **AI Alarm Banner** — shows AI status (thinking / result) as analysis runs
- **AI Alarm Panel** — displays root cause grouping, confidence score, 3 ranked suggestions with step-by-step remediation, and relevant sensor data
- **Alarm Database** — searchable reference of all known alarm codes from the Wärtsilä service manual

**AI pipeline flow:**
```
Arduino → serial (COM4) → sensorSimulator.js → anomaly event
  → alarmSequencer.js → aiClient.js (Ollama)
    → Call 1: PDF manual analysis → alarm grouping + 3 suggestions
    → Call 2: Reasoning → confidence score + sensor context
      → broadcast() → browser (AlarmApp.jsx)
```

Requires Ollama running locally with the model specified in `.env`.

---

### Navigation (`/nav`)

Ship navigation simulation with live hardware control.

- **Map Canvas** — animated ship track with checkpoint markers and arrival detection
- **Lever Panel** — real-time BCU lever gauges for all 6 registers; bow thrusters (IR4, IR5) shown as circular arc gauges (PORT ↔ STBD)
- **AI Panel** — navigation advisories updated every 1.5 seconds based on ship state
- **Energy Panel** — compact energy summary panel embedded in the nav layout
- **Top / Bottom bars** — speed, heading, ETA, and status readouts

Data source: live BCU registers pushed from `python/main.py` via WebSocket `BCU_DATA` messages.

---

## Hardware Setup

| Device | Connection | Purpose |
|---|---|---|
| Wärtsilä BCU | Ethernet `192.168.1.17:502` | Lever positions (Modbus TCP) |
| Arduino + DS18B20 | USB serial `COM4` | Temperature sensing |

The BCU sends 6 signed 16-bit registers scaled to `-100.00 %` to `+100.00 %`:

| Register | Meaning |
|---|---|
| IR0 | Main lever (port + starboard thrust) |
| IR1 | — |
| IR2 | Bow thruster lever |
| IR3 | — |
| IR4 | Bow thruster 1 angle |
| IR5 | Bow thruster 2 angle |

---

## AI Setup (Ollama)

```bash
# Install Ollama, then pull your model
ollama pull minimax-m2.5:cloud   # or whichever model you use

# Confirm it's running
ollama list
```

Set `AI_MODEL` in `.env` to match the model name shown by `ollama list`.
