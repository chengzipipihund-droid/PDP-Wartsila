"""
RootCauseAISystem - 完整集成的根因分析系统
整合所有子模块，提供统一的API接口
"""

from typing import List, Dict, Any
from alarm_clusterer import AlarmClusterer
from causal_graph_analyzer import CausalGraphAnalyzer
from bayesian_analyzer import BayesianRootCauseAnalyzer
from guidebook_search import GuidebookSearchEngine
import json


class RootCauseAISystem:
    """
    完整的根因分析AI系统
    整合DBSCAN聚类、因果图、贝叶斯推断和NLP搜索
    """
    
    def __init__(self, config: Dict[str, str]):
        """
        参数:
            config: {
                'guidebook_path': str,
                'historical_data_path': str (optional),
                'eps_seconds': int (optional),
                'min_samples': int (optional)
            }
        """
        print("=" * 70)
        print("Initializing Root Cause AI System")
        print("=" * 70)
        
        # 配置参数
        guidebook_path = config.get('guidebook_path', './guidebook')
        eps_seconds = config.get('eps_seconds', 60)
        min_samples = config.get('min_samples', 3)
        
        # 初始化各模块
        print("\n[1/4] Initializing Alarm Clusterer...")
        self.clusterer = AlarmClusterer(
            eps_seconds=eps_seconds,
            min_samples=min_samples
        )
        
        print("\n[2/4] Initializing Causal Graph Analyzer...")
        self.causal_analyzer = CausalGraphAnalyzer(guidebook_path)
        
        print("\n[3/4] Initializing Bayesian Analyzer...")
        historical_data = self._load_historical_data(
            config.get('historical_data_path')
        )
        self.bayesian_analyzer = BayesianRootCauseAnalyzer(historical_data)
        
        print("\n[4/4] Initializing Guidebook Search Engine...")
        self.guidebook_search = GuidebookSearchEngine(guidebook_path)
        
        print("\n" + "=" * 70)
        print("✓ Root Cause AI System Initialized Successfully")
        print("=" * 70 + "\n")
    
    def _load_historical_data(self, data_path: str) -> List[Dict]:
        """加载历史数据（如果存在）"""
        if not data_path:
            return None
        
        try:
            import json
            with open(data_path, 'r') as f:
                data = json.load(f)
                print(f"  Loaded {len(data)} historical incidents")
                return data
        except Exception as e:
            print(f"  Could not load historical data: {e}")
            return None
    
    def analyze_alarms(self, alarm_stream: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        主入口：分析告警流，识别根因
        
        参数:
            alarm_stream: [
                {'id': str, 'type': str, 'timestamp': str},
                ...
            ]
        
        返回:
            [
                {
                    'cluster_id': int,
                    'alarms': [str, ...],
                    'root_cause': str,
                    'confidence': float,
                    'explanation': str,
                    'recommended_actions': [dict, ...],
                    'alternatives': [{'cause': str, 'confidence': float}, ...]
                },
                ...
            ]
        """
        print("\n" + "=" * 70)
        print(f"Analyzing {len(alarm_stream)} alarms")
        print("=" * 70)
        
        # Step 1: DBSCAN时序聚类
        print("\n[Step 1/4] DBSCAN Temporal Clustering...")
        clusters = self.clusterer.cluster_alarms(alarm_stream)
        
        results = []
        
        # 对每个簇进行分析
        for cluster_id, cluster_alarms in clusters.items():
            if cluster_id == -1:  # 跳过噪声
                print(f"\n[Cluster -1] Skipping noise cluster ({len(cluster_alarms)} alarms)")
                continue
            
            print(f"\n{'='*70}")
            print(f"Analyzing Cluster {cluster_id} ({len(cluster_alarms)} alarms)")
            print('='*70)
            
            # Step 2: 因果图 + PageRank
            print("\n[Step 2/4] Causal Graph Analysis & PageRank...")
            causal_result = self.causal_analyzer.find_root_cause(cluster_alarms)
            
            if not causal_result['root_cause']:
                print("  No causal relationships found, skipping cluster")
                continue
            
            # Step 3: 贝叶斯推断
            print("\n[Step 3/4] Bayesian Inference...")
            alarm_types = [a['type'] for a in cluster_alarms]
            
            pagerank_candidates = [
                {
                    'cause': causal_result['root_cause'],
                    'pagerank_score': causal_result['pagerank_score']
                }
            ]
            
            # 添加备选项
            for alt_cause, alt_score in causal_result['alternatives']:
                pagerank_candidates.append({
                    'cause': alt_cause,
                    'pagerank_score': alt_score
                })
            
            bayesian_result = self.bayesian_analyzer.infer_root_cause(
                alarm_types,
                pagerank_candidates
            )
            
            # Step 4: 检索纠正措施
            print("\n[Step 4/4] Retrieving Corrective Actions...")
            root_cause = bayesian_result['root_cause']
            actions = self.guidebook_search.get_corrective_actions(root_cause)
            
            # 编译结果
            cluster_result = {
                'cluster_id': cluster_id,
                'alarms': alarm_types,
                'alarm_timeline': self.clusterer.get_cluster_timeline(cluster_alarms),
                'root_cause': root_cause,
                'confidence': bayesian_result['confidence'],
                'explanation': causal_result['explanation'],
                'recommended_actions': actions,
                'alternatives': bayesian_result['alternatives'],
                'analysis_method': bayesian_result['method'],
                'posteriors': bayesian_result.get('posteriors', {})
            }
            
            results.append(cluster_result)
            
            # 打印摘要
            print(f"\n{'='*70}")
            print(f"Cluster {cluster_id} Analysis Summary:")
            print('='*70)
            print(f"Root Cause: {root_cause}")
            print(f"Confidence: {bayesian_result['confidence']:.1%}")
            print(f"Alternatives: {[a['cause'] for a in bayesian_result['alternatives'][:2]]}")
            print(f"Actions: {len(actions)} steps")
        
        print("\n" + "=" * 70)
        print(f"✓ Analysis Complete: {len(results)} incident(s) identified")
        print("=" * 70 + "\n")
        
        return results
    
    def analyze_single_cluster(self, alarms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        分析单个告警簇（不进行DBSCAN聚类）
        
        适用于已经确定是相关告警的情况
        """
        print("\n" + "=" * 70)
        print(f"Analyzing Single Cluster ({len(alarms)} alarms)")
        print("=" * 70)
        
        # 直接执行步骤2-4
        print("\n[Step 1/3] Causal Graph Analysis & PageRank...")
        causal_result = self.causal_analyzer.find_root_cause(alarms)
        
        if not causal_result['root_cause']:
            return {
                'root_cause': None,
                'confidence': 0.0,
                'error': 'No causal relationships found'
            }
        
        print("\n[Step 2/3] Bayesian Inference...")
        alarm_types = [a['type'] for a in alarms]
        
        pagerank_candidates = [
            {
                'cause': causal_result['root_cause'],
                'pagerank_score': causal_result['pagerank_score']
            }
        ]
        
        for alt_cause, alt_score in causal_result['alternatives']:
            pagerank_candidates.append({
                'cause': alt_cause,
                'pagerank_score': alt_score
            })
        
        bayesian_result = self.bayesian_analyzer.infer_root_cause(
            alarm_types,
            pagerank_candidates
        )
        
        print("\n[Step 3/3] Retrieving Corrective Actions...")
        root_cause = bayesian_result['root_cause']
        actions = self.guidebook_search.get_corrective_actions(root_cause)
        
        result = {
            'alarms': alarm_types,
            'root_cause': root_cause,
            'confidence': bayesian_result['confidence'],
            'explanation': causal_result['explanation'],
            'recommended_actions': actions,
            'alternatives': bayesian_result['alternatives'],
            'analysis_method': bayesian_result['method']
        }
        
        print(f"\n{'='*70}")
        print(f"Analysis Summary:")
        print('='*70)
        print(f"Root Cause: {root_cause}")
        print(f"Confidence: {bayesian_result['confidence']:.1%}")
        
        return result
    
    def format_result_for_display(self, result: Dict[str, Any]) -> str:
        """格式化结果用于显示"""
        output = []
        
        output.append("=" * 70)
        output.append("ROOT CAUSE ANALYSIS RESULT")
        output.append("=" * 70)
        
        output.append(f"\nPRIMARY ROOT CAUSE: {result['root_cause']}")
        output.append(f"CONFIDENCE: {result['confidence']:.1%}")
        
        output.append(f"\nCAUSAL CHAIN:")
        output.append(result['explanation'])
        
        if result.get('alternatives'):
            output.append(f"\nALTERNATIVE CAUSES:")
            for i, alt in enumerate(result['alternatives'], 1):
                output.append(f"{i}. {alt['cause']} - {alt['confidence']:.1%} probability")
        
        if result.get('recommended_actions'):
            output.append(f"\nIMMEDIATE ACTIONS:")
            for action in result['recommended_actions']:
                step = action.get('step', '?')
                act = action.get('action', 'N/A')
                output.append(f"{step}. {act}")
                if 'verification' in action:
                    output.append(f"   Verify: {action['verification']}")
        
        output.append("\n" + "=" * 70)
        
        return "\n".join(output)
    
    def get_system_stats(self) -> Dict[str, Any]:
        """获取系统统计信息"""
        causal_stats = self.causal_analyzer.get_graph_statistics()
        
        return {
            'causal_graph': causal_stats,
            'guidebook_entries': len(self.guidebook_search.entries),
            'priors_count': len(self.bayesian_analyzer.priors),
            'clustering_params': {
                'eps_seconds': self.clusterer.eps,
                'min_samples': self.clusterer.min_samples
            }
        }


if __name__ == "__main__":
    # 测试完整系统
    print("\n" * 2)
    print("#" * 70)
    print("#" + " " * 68 + "#")
    print("#" + " " * 20 + "ROOT CAUSE AI SYSTEM TEST" + " " * 23 + "#")
    print("#" + " " * 68 + "#")
    print("#" * 70)
    print("\n")
    
    # 配置
    config = {
        'guidebook_path': './guidebook',
        'eps_seconds': 60,
        'min_samples': 3
    }
    
    # 初始化系统
    system = RootCauseAISystem(config)
    
    # 测试场景：冷却系统故障
    print("\n" + "#" * 70)
    print("# TEST SCENARIO: Cooling System Failure")
    print("#" * 70 + "\n")
    
    test_alarms = [
        {'id': 'A1', 'type': 'COOLANT_PUMP_FAULT', 'timestamp': '14:23:08'},
        {'id': 'A2', 'type': 'COOLANT_FLOW_LOW', 'timestamp': '14:23:12'},
        {'id': 'A3', 'type': 'BATT_OVERTEMP', 'timestamp': '14:23:17'},
        {'id': 'A4', 'type': 'BMS_FAULT_THERMAL', 'timestamp': '14:23:35'},
        {'id': 'A5', 'type': 'POWER_LIMIT_ACTIVE', 'timestamp': '14:23:42'},
        {'id': 'A6', 'type': 'BATTERY_ROOM_TEMP_HIGH', 'timestamp': '14:23:45'},
    ]
    
    # 运行分析
    results = system.analyze_alarms(test_alarms)
    
    # 显示结果
    if results:
        for result in results:
            print("\n")
            print(system.format_result_for_display(result))
    
    # 显示系统统计
    print("\n" + "#" * 70)
    print("# SYSTEM STATISTICS")
    print("#" * 70)
    stats = system.get_system_stats()
    print(json.dumps(stats, indent=2))
    
    print("\n" * 2)
