# 🐍 Root Cause AI System - Complete Setup Guide
## Python Backend + HTML Frontend Integration

---

## 📦 What You're Getting

A **fully functional AI-powered root cause analysis system** with:

### Core Components:
1. ✅ **AlarmClusterer** - DBSCAN temporal clustering
2. ✅ **CausalGraphAnalyzer** - Causal graph + PageRank
3. ✅ **BayesianRootCauseAnalyzer** - Bayesian inference
4. ✅ **GuidebookSearchEngine** - NLP semantic search (sentence-transformers + FAISS)
5. ✅ **RootCauseAISystem** - Integrated system
6. ✅ **Flask API Server** - REST API backend
7. ✅ **HTML Demo** - Interactive web interface

### Guidebook Format:
- **YAML files** (.yaml) - Human-readable, machine-parsable
- Located in `guidebook/` directory
- Each alarm has its own file (e.g., `COOLANT_PUMP_FAULT.yaml`)

---

## ⚡ Quick Start (30 Minutes)

### Step 1: Install Python Dependencies (10 minutes)

**Requirements:**
- Python 3.8 or higher
- pip (Python package manager)

**Installation:**

```bash
# Navigate to the root_cause_system directory
cd root_cause_system

# Install all dependencies
pip install -r requirements.txt
```

**What gets installed:**
- `numpy`, `scikit-learn` - Core ML libraries
- `networkx` - Graph analysis
- `sentence-transformers` - NLP semantic search
- `faiss-cpu` - Fast similarity search
- `flask`, `flask-cors` - Web server
- `pandas`, `pyyaml` - Data processing

**⏱️ Installation time:** 5-10 minutes (depends on internet speed)

**Troubleshooting:**
- If `faiss-cpu` fails: `pip install faiss-cpu --no-cache-dir`
- If on Mac M1/M2: `pip install faiss-cpu --extra-index-url https://pypi.org/simple`
- If sentence-transformers slow: First run will download ~100MB model, be patient

---

### Step 2: Verify Guidebook (1 minute)

**Check guidebook directory exists:**

```bash
ls guidebook/
```

**You should see:**
- `COOLANT_PUMP_FAULT.yaml`
- `BATT_OVERTEMP.yaml`
- `COOLANT_FLOW_LOW.yaml`

**Guidebook structure:**
```yaml
alarm_id: COOLANT_PUMP_FAULT
name: Coolant Pump Motor Fault
system: Cooling System
severity: CRITICAL
description: |
  Description of the alarm...

root_causes:
  - cause: Motor winding failure
    probability: 0.35
    
immediate_actions:
  - step: 1
    action: Reduce battery discharge to 50%
    
causal_relationships:
  causes:
    - alarm: COOLANT_FLOW_LOW
      delay_seconds: 5
      probability: 0.95
```

---

### Step 3: Test Python System (5 minutes)

**Run standalone test:**

```bash
python root_cause_ai_system.py
```

**Expected output:**
```
======================================================================
Initializing Root Cause AI System
======================================================================

[1/4] Initializing Alarm Clusterer...
[AlarmClusterer] Initialized with eps=60s, min_samples=3

[2/4] Initializing Causal Graph Analyzer...
[CausalGraphAnalyzer] Loaded graph with 11 nodes, 12 edges

[3/4] Initializing Bayesian Analyzer...
[BayesianAnalyzer] Initialized with 9 known root causes

[4/4] Initializing Guidebook Search Engine...
[GuidebookSearch] Loading sentence-transformer model: all-MiniLM-L6-v2
[GuidebookSearch] Loaded 3 entries
[GuidebookSearch] Building semantic search index...

✓ Root Cause AI System Initialized Successfully
======================================================================

...

ROOT CAUSE ANALYSIS RESULT
======================================================================
PRIMARY ROOT CAUSE: COOLANT_PUMP_FAULT
CONFIDENCE: 87.3%

CAUSAL CHAIN:
COOLANT_PUMP_FAULT is identified as the root cause...
```

**✅ If you see this, the system works!**

---

### Step 4: Start Flask API Server (2 minutes)

**Start the server:**

```bash
python api_server.py
```

**Expected output:**
```
Initializing Root Cause AI System...
✓ System ready

======================================================================
Starting Flask API Server
======================================================================

API Endpoints:
  GET  /api/health         - Health check
  POST /api/analyze        - Analyze alarm stream (with clustering)
  POST /api/analyze-simple - Analyze single cluster (no clustering)
  GET  /api/stats          - Get system statistics
  GET  /api/actions/<id>   - Get corrective actions for alarm

Server Configuration:
  Host: 0.0.0.0
  Port: 5000
  Debug: True
======================================================================

 * Running on http://127.0.0.1:5000
```

**✅ Server is ready when you see "Running on..."**

**Keep this terminal open!** The server needs to stay running.

---

### Step 5: Open HTML Demo (2 minutes)

**In a new terminal (or just double-click the file):**

```bash
# Open the HTML demo
open demo2_python_backend.html
# OR on Windows:
start demo2_python_backend.html
# OR on Linux:
xdg-open demo2_python_backend.html
```

**What you should see:**
- Green indicator: "Connected to Python AI Server"
- List of 13 alarms
- "Analyze with Python AI" button

---

### Step 6: Test the System (10 minutes)

**Test Scenario 1: Cooling System Failure**

1. Select these alarms (check the boxes):
   - ✅ Coolant Pump Motor Fault
   - ✅ Coolant Flow Rate Low
   - ✅ Battery Module Overtemperature
   - ✅ BMS Thermal Management Fault
   - ✅ Power Limiting Active

2. Click **"Analyze with Python AI"**

3. Wait 10-15 seconds

4. **Expected Result:**
   - Primary Root Cause: **COOLANT_PUMP_FAULT**
   - Confidence: **85-90%**
   - Alternatives: Other cooling-related issues
   - Actions: 3-4 immediate steps

**Test Scenario 2: Different Pattern**

Clear selection and try:
   - ✅ Battery Module Overtemperature
   - ✅ Battery Room Temperature High
   - ✅ BMS Thermal Management Fault
   - ✅ HVAC Chiller Malfunction

**Expected Result:**
   - Different root cause based on pattern
   - Different confidence level
   - Different actions

---

## 🔧 File Structure

```
root_cause_system/
├── alarm_clusterer.py          # DBSCAN clustering module
├── causal_graph_analyzer.py    # Causal graph + PageRank
├── bayesian_analyzer.py         # Bayesian inference
├── guidebook_search.py          # NLP semantic search
├── root_cause_ai_system.py      # Main integrated system
├── api_server.py                # Flask REST API
├── demo2_python_backend.html    # Web interface
├── requirements.txt             # Python dependencies
└── guidebook/                   # Knowledge base (YAML files)
    ├── COOLANT_PUMP_FAULT.yaml
    ├── BATT_OVERTEMP.yaml
    └── COOLANT_FLOW_LOW.yaml
```

---

## 📝 Adding New Guidebook Entries

### Template for New Alarm:

Create a new file: `guidebook/YOUR_ALARM_ID.yaml`

```yaml
alarm_id: YOUR_ALARM_ID
name: Human-Readable Alarm Name
system: Battery ESS / Cooling System / Electrical / etc.
severity: CRITICAL / HIGH / MEDIUM

description: |
  Detailed description of what this alarm means.
  Can be multiple lines.

symptoms:
  - Symptom 1
  - Symptom 2

root_causes:
  - cause: Most likely cause
    probability: 0.60
    indicators:
      - Indicator 1
      - Indicator 2
  
  - cause: Second likely cause
    probability: 0.30

immediate_actions:
  - step: 1
    action: First action to take
    verification: How to verify it worked
    time_limit: How long you have
  
  - step: 2
    action: Second action

causal_relationships:
  # This alarm is caused by:
  caused_by:
    - alarm: UPSTREAM_ALARM_ID
      delay_seconds: 10
      probability: 0.85
  
  # This alarm causes:
  causes:
    - alarm: DOWNSTREAM_ALARM_ID
      delay_seconds: 15
      probability: 0.75

preventive_maintenance:
  - Maintenance task 1
  - Maintenance task 2

historical_incidents:
  - incident_id: INC_2024_XXX
    date: 2024-XX-XX
    vessel: MV Vessel Name
    root_cause: What was actually found
    resolution: What was done
    downtime_hours: 2.5
```

**After adding a new file:**
1. Restart the Python server: Ctrl+C then `python api_server.py`
2. Refresh the HTML page
3. The new alarm will be available for analysis

---

## 🧪 Testing Individual Modules

### Test AlarmClusterer:

```bash
python alarm_clusterer.py
```

Expected: Shows clustering of 7 alarms into 1 cluster + 1 noise point

### Test CausalGraphAnalyzer:

```bash
python causal_graph_analyzer.py
```

Expected: Shows graph statistics and root cause identification

### Test BayesianAnalyzer:

```bash
python bayesian_analyzer.py
```

Expected: Shows Bayesian inference with posterior probabilities

### Test GuidebookSearch:

```bash
python guidebook_search.py
```

Expected: Shows semantic search results for different queries

---

## 🐛 Troubleshooting

### Issue: "Module not found" error

**Symptom:**
```
ImportError: No module named 'sentence_transformers'
```

**Solution:**
```bash
pip install -r requirements.txt --upgrade
```

---

### Issue: Server won't start (port in use)

**Symptom:**
```
Address already in use
```

**Solution:**

Find and kill the process using port 5000:

```bash
# On Mac/Linux:
lsof -ti:5000 | xargs kill -9

# On Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# OR change the port in api_server.py:
app.run(host='0.0.0.0', port=5001, debug=True)
```

---

### Issue: HTML shows "Server Offline"

**Checklist:**
1. ✅ Is Python server running? Check terminal
2. ✅ Is it on port 5000? Check terminal output
3. ✅ Is firewall blocking it? Try `http://localhost:5000/api/health` in browser
4. ✅ Check API_URL in HTML file (should be `http://localhost:5000`)

**Test manually:**

```bash
# In a new terminal:
curl http://localhost:5000/api/health
```

Expected response:
```json
{"message":"Root Cause AI System is running","status":"healthy"}
```

---

### Issue: Analysis returns low confidence

**Why:**
- Not enough guidebook data
- Alarms are genuinely unrelated
- Missing causal relationships

**Solutions:**
1. Add more guidebook entries
2. Add more `causal_relationships` in YAML files
3. Adjust Bayesian priors in `bayesian_analyzer.py`

---

### Issue: Sentence-transformers downloading slowly

**First run downloads ~90MB model:**

```
Downloading model 'all-MiniLM-L6-v2'...
```

**Be patient!** It only happens once. The model is cached for future use.

**Alternative:** Use smaller model in `guidebook_search.py`:

```python
# Change line ~21:
def __init__(self, guidebook_path: str, model_name: str = 'paraphrase-MiniLM-L3-v2'):
```

---

## 🎯 Usage Examples

### Example 1: API Call via cURL

```bash
curl -X POST http://localhost:5000/api/analyze-simple \
  -H "Content-Type: application/json" \
  -d '{
    "alarms": [
      {"id": "A1", "type": "COOLANT_PUMP_FAULT", "timestamp": "14:23:08"},
      {"id": "A2", "type": "COOLANT_FLOW_LOW", "timestamp": "14:23:12"},
      {"id": "A3", "type": "BATT_OVERTEMP", "timestamp": "14:23:17"}
    ]
  }'
```

### Example 2: Python Script

```python
import requests

alarms = [
    {"id": "A1", "type": "COOLANT_PUMP_FAULT", "timestamp": "14:23:08"},
    {"id": "A2", "type": "COOLANT_FLOW_LOW", "timestamp": "14:23:12"},
    {"id": "A3", "type": "BATT_OVERTEMP", "timestamp": "14:23:17"}
]

response = requests.post(
    'http://localhost:5000/api/analyze-simple',
    json={'alarms': alarms}
)

result = response.json()
print(f"Root Cause: {result['result']['root_cause']}")
print(f"Confidence: {result['result']['confidence']:.1%}")
```

---

## 📊 System Performance

### Expected Performance:
- **Clustering:** <0.1 seconds (for <100 alarms)
- **Causal Graph Analysis:** <0.5 seconds
- **Bayesian Inference:** <0.2 seconds
- **NLP Search:** <1 second (first time 2-3 sec for model loading)
- **Total Analysis Time:** 1-2 seconds

### Resource Usage:
- **RAM:** ~500MB (mostly sentence-transformers model)
- **CPU:** Low (only spikes during analysis)
- **Disk:** ~200MB (dependencies + model)

---

## 🚀 Production Deployment

### To deploy to production:

1. **Disable Debug Mode:**
   ```python
   # In api_server.py:
   app.run(host='0.0.0.0', port=5000, debug=False)
   ```

2. **Use Production Server:**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 api_server:app
   ```

3. **Add Authentication:**
   ```python
   # Add to api_server.py:
   from functools import wraps
   
   def require_api_key(f):
       @wraps(f)
       def decorated_function(*args, **kwargs):
           if request.headers.get('X-API-Key') != 'your-secret-key':
               return jsonify({'error': 'Unauthorized'}), 401
           return f(*args, **kwargs)
       return decorated_function
   
   @app.route('/api/analyze-simple', methods=['POST'])
   @require_api_key
   def analyze_simple():
       ...
   ```

4. **Use HTTPS:**
   - Deploy behind nginx with SSL
   - Update HTML `API_URL` to `https://your-domain.com`

5. **Monitor:**
   ```bash
   pip install prometheus-flask-exporter
   ```

---

## ✅ Final Checklist

Before demo/deployment:

- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] Guidebook directory exists with at least 3 YAML files
- [ ] Standalone test runs successfully (`python root_cause_ai_system.py`)
- [ ] API server starts without errors (`python api_server.py`)
- [ ] HTML demo connects (green indicator)
- [ ] Test scenario completes successfully
- [ ] Confidence levels are reasonable (>70% for clear cases)
- [ ] Actions are relevant and helpful

---

## 📚 Next Steps

### Enhance the System:

1. **Add More Alarms:**
   - Create YAML files for all your vessel's alarms
   - Copy template and customize

2. **Improve Causal Relationships:**
   - Add more `causes` and `caused_by` entries
   - Fine-tune probabilities based on real data

3. **Collect Historical Data:**
   - Create `historical_data.json` with past incidents
   - Pass to BayesianAnalyzer for better priors

4. **Train on Real Data:**
   - Log actual root causes
   - Use feedback to update model

5. **Integrate with Real Systems:**
   - Connect to actual alarm system via MQTT/OPC-UA
   - Send results to SCADA

---

## 🎓 Understanding the Code

### How It All Works:

```
Incoming Alarms
     ↓
[1] DBSCAN Clustering → Groups related alarms by time
     ↓
[2] Causal Graph → Builds relationships from guidebook
     ↓
[3] PageRank → Finds root node (most upstream cause)
     ↓
[4] Bayesian Inference → Calculates confidence with priors
     ↓
[5] NLP Search → Retrieves actions from guidebook
     ↓
Result with confidence + actions
```

### Key Algorithms:

- **DBSCAN:** Separates independent incidents
- **PageRank:** Identifies importance in graph
- **Bayes:** P(Cause|Alarms) = P(Alarms|Cause) × P(Cause) / P(Alarms)
- **Sentence-BERT:** Semantic similarity for guidebook search

---

## 💡 Tips & Tricks

1. **Start Small:** Test with 3-4 alarms first
2. **Clear Patterns:** Use obviously related alarms
3. **Check Logs:** Terminal shows detailed analysis steps
4. **Iterate:** Add one guidebook entry at a time
5. **Monitor Confidence:** <50% = missing data, >90% = very clear

---

## 🆘 Getting Help

If stuck:

1. Check terminal logs (both Python server and browser console)
2. Verify all files are in correct locations
3. Test each module individually
4. Check guidebook YAML syntax (use online YAML validator)
5. Review error messages carefully

Common errors are usually:
- Missing dependencies
- Wrong file paths
- Syntax errors in YAML
- Port conflicts

---

**You now have a complete, working AI root cause analysis system! 🎉**

Start with the test scenario, then customize with your own alarms and guidebook data.
