"""
Flask API Server - Root Cause AI System
提供REST API连接HTML前端
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from root_cause_ai_system import RootCauseAISystem
import os

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化AI系统
print("Initializing Root Cause AI System...")
config = {
    'guidebook_path': './guidebook',
    'eps_seconds': 60,
    'min_samples': 3
}

ai_system = RootCauseAISystem(config)
print("✓ System ready\n")


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'message': 'Root Cause AI System is running'
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_alarms():
    """
    分析告警端点
    
    POST body:
    {
        "alarms": [
            {"id": "A1", "type": "COOLANT_PUMP_FAULT", "timestamp": "14:23:08"},
            ...
        ]
    }
    
    Response:
    {
        "success": true,
        "results": [
            {
                "root_cause": "COOLANT_PUMP_FAULT",
                "confidence": 0.87,
                "explanation": "...",
                "alternatives": [...],
                "recommended_actions": [...]
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'alarms' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "alarms" field in request body'
            }), 400
        
        alarms = data['alarms']
        
        if len(alarms) == 0:
            return jsonify({
                'success': False,
                'error': 'No alarms provided'
            }), 400
        
        print(f"\n[API] Received {len(alarms)} alarms for analysis")
        
        # 调用AI系统
        results = ai_system.analyze_alarms(alarms)
        
        print(f"[API] Analysis complete: {len(results)} result(s)")
        
        # 返回结果
        return jsonify({
            'success': True,
            'count': len(results),
            'results': results
        })
    
    except Exception as e:
        print(f"[API] Error: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analyze-simple', methods=['POST'])
def analyze_simple():
    """
    简化版分析（不聚类，直接分析）
    
    适用于HTML demo的调用
    """
    try:
        data = request.get_json()
        
        if not data or 'alarms' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "alarms" field'
            }), 400
        
        alarms = data['alarms']
        
        print(f"\n[API-Simple] Analyzing {len(alarms)} alarms")
        
        # 使用单簇分析
        result = ai_system.analyze_single_cluster(alarms)
        
        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
        
        print(f"[API-Simple] Root cause: {result['root_cause']} ({result['confidence']:.1%})")
        
        return jsonify({
            'success': True,
            'result': result
        })
    
    except Exception as e:
        print(f"[API-Simple] Error: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取系统统计信息"""
    try:
        stats = ai_system.get_system_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/actions/<alarm_id>', methods=['GET'])
def get_actions(alarm_id):
    """获取特定告警的纠正措施"""
    try:
        actions = ai_system.guidebook_search.get_corrective_actions(alarm_id)
        return jsonify({
            'success': True,
            'alarm_id': alarm_id,
            'actions': actions
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("Starting Flask API Server")
    print("=" * 70)
    print("\nAPI Endpoints:")
    print("  GET  /api/health         - Health check")
    print("  POST /api/analyze        - Analyze alarm stream (with clustering)")
    print("  POST /api/analyze-simple - Analyze single cluster (no clustering)")
    print("  GET  /api/stats          - Get system statistics")
    print("  GET  /api/actions/<id>   - Get corrective actions for alarm")
    print("\nServer Configuration:")
    print("  Host: 0.0.0.0")
    print("  Port: 5000")
    print("  Debug: True")
    print("=" * 70 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
