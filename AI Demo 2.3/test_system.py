#!/usr/bin/env python3
"""
Quick Test Script - Root Cause AI System
Tests all modules and provides diagnostic information
"""

import sys
import os

print("=" * 70)
print("ROOT CAUSE AI SYSTEM - QUICK TEST")
print("=" * 70)
print()

# Test 1: Check Python version
print("[1/7] Checking Python version...")
if sys.version_info < (3, 8):
    print("❌ ERROR: Python 3.8+ required")
    print(f"   Current version: {sys.version}")
    sys.exit(1)
print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")

# Test 2: Check dependencies
print("\n[2/7] Checking dependencies...")
missing_deps = []
required_deps = [
    'numpy',
    'sklearn',
    'networkx',
    'sentence_transformers',
    'flask',
    'flask_cors',
    'pandas',
    'yaml'
]

for dep in required_deps:
    try:
        if dep == 'sklearn':
            import sklearn
        elif dep == 'yaml':
            import yaml
        elif dep == 'flask_cors':
            import flask_cors
        else:
            __import__(dep)
        print(f"  ✓ {dep}")
    except ImportError:
        print(f"  ❌ {dep} - NOT FOUND")
        missing_deps.append(dep)

if missing_deps:
    print(f"\n❌ Missing dependencies: {', '.join(missing_deps)}")
    print("   Run: pip install -r requirements.txt")
    sys.exit(1)

print("✓ All dependencies installed")

# Test 3: Check guidebook directory
print("\n[3/7] Checking guidebook directory...")
if not os.path.exists('guidebook'):
    print("❌ ERROR: guidebook/ directory not found")
    sys.exit(1)

yaml_files = [f for f in os.listdir('guidebook') if f.endswith('.yaml')]
print(f"✓ Found {len(yaml_files)} guidebook entries:")
for f in yaml_files:
    print(f"    - {f}")

if len(yaml_files) == 0:
    print("⚠️  WARNING: No guidebook entries found")

# Test 4: Test AlarmClusterer
print("\n[4/7] Testing AlarmClusterer...")
try:
    from alarm_clusterer import AlarmClusterer
    clusterer = AlarmClusterer(eps_seconds=60, min_samples=3)
    
    test_alarms = [
        {'id': 'A1', 'type': 'TEST1', 'timestamp': '14:23:08'},
        {'id': 'A2', 'type': 'TEST2', 'timestamp': '14:23:12'},
        {'id': 'A3', 'type': 'TEST3', 'timestamp': '14:23:17'},
    ]
    
    clusters = clusterer.cluster_alarms(test_alarms)
    print("✓ AlarmClusterer working")
except Exception as e:
    print(f"❌ AlarmClusterer failed: {e}")
    sys.exit(1)

# Test 5: Test CausalGraphAnalyzer
print("\n[5/7] Testing CausalGraphAnalyzer...")
try:
    from causal_graph_analyzer import CausalGraphAnalyzer
    analyzer = CausalGraphAnalyzer('guidebook')
    stats = analyzer.get_graph_statistics()
    print(f"✓ CausalGraphAnalyzer working")
    print(f"    Nodes: {stats['total_nodes']}, Edges: {stats['total_edges']}")
except Exception as e:
    print(f"❌ CausalGraphAnalyzer failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Test GuidebookSearch
print("\n[6/7] Testing GuidebookSearch...")
try:
    from guidebook_search import GuidebookSearchEngine
    search_engine = GuidebookSearchEngine('guidebook')
    print("✓ GuidebookSearch working")
    print(f"    Entries loaded: {len(search_engine.entries)}")
except Exception as e:
    print(f"❌ GuidebookSearch failed: {e}")
    import traceback
    traceback.print_exc()
    print("\n⚠️  Note: First run downloads ML model (~90MB), this is normal")
    sys.exit(1)

# Test 7: Test Full System
print("\n[7/7] Testing Complete RootCauseAISystem...")
try:
    from root_cause_ai_system import RootCauseAISystem
    
    config = {
        'guidebook_path': 'guidebook',
        'eps_seconds': 60,
        'min_samples': 3
    }
    
    system = RootCauseAISystem(config)
    
    test_alarms = [
        {'id': 'A1', 'type': 'COOLANT_PUMP_FAULT', 'timestamp': '14:23:08'},
        {'id': 'A2', 'type': 'COOLANT_FLOW_LOW', 'timestamp': '14:23:12'},
        {'id': 'A3', 'type': 'BATT_OVERTEMP', 'timestamp': '14:23:17'},
        {'id': 'A4', 'type': 'BMS_FAULT_THERMAL', 'timestamp': '14:23:35'},
    ]
    
    results = system.analyze_alarms(test_alarms)
    
    if len(results) > 0:
        print("✓ Complete system working")
        print(f"\n   Test Analysis Result:")
        print(f"   Root Cause: {results[0]['root_cause']}")
        print(f"   Confidence: {results[0]['confidence']:.1%}")
    else:
        print("⚠️  System works but no results (may need more guidebook data)")
    
except Exception as e:
    print(f"❌ Complete system failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Summary
print("\n" + "=" * 70)
print("✅ ALL TESTS PASSED!")
print("=" * 70)
print("\nNext steps:")
print("1. Start API server: python api_server.py")
print("2. Open HTML demo: demo2_python_backend.html")
print("3. Test with real scenarios")
print("\nSystem is ready to use! 🎉")
print("=" * 70)
