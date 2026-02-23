"""
CausalGraphAnalyzer - 因果图分析和PageRank排序
构建告警间的因果关系图，使用PageRank找出根因
"""

import networkx as nx
from typing import List, Dict, Any, Tuple
import os
import yaml


class CausalGraphAnalyzer:
    """
    因果图分析器
    从guidebook加载因果关系，使用PageRank识别根因
    """
    
    def __init__(self, guidebook_path: str):
        self.guidebook_path = guidebook_path
        self.global_graph = nx.DiGraph()
        self._load_causal_relationships()
        print(f"[CausalGraphAnalyzer] Loaded graph with {self.global_graph.number_of_nodes()} nodes, {self.global_graph.number_of_edges()} edges")
    
    def _load_causal_relationships(self):
        """从guidebook YAML文件加载因果关系"""
        if not os.path.exists(self.guidebook_path):
            print(f"[CausalGraphAnalyzer] Warning: Guidebook path not found: {self.guidebook_path}")
            self._create_default_graph()
            return
        
        yaml_files = [f for f in os.listdir(self.guidebook_path) if f.endswith('.yaml')]
        print(f"[CausalGraphAnalyzer] Loading {len(yaml_files)} guidebook entries...")
        
        for yaml_file in yaml_files:
            file_path = os.path.join(self.guidebook_path, yaml_file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    entry = yaml.safe_load(f)
                    self._add_relationships_from_entry(entry)
            except Exception as e:
                print(f"[CausalGraphAnalyzer] Error loading {yaml_file}: {e}")
        
        if self.global_graph.number_of_edges() == 0:
            print("[CausalGraphAnalyzer] Warning: No relationships loaded, using defaults")
            self._create_default_graph()
    
    def _add_relationships_from_entry(self, entry: Dict):
        """从guidebook条目添加因果关系"""
        alarm_id = entry.get('alarm_id')
        if not alarm_id:
            return
        
        # 添加节点
        self.global_graph.add_node(alarm_id, **{
            'name': entry.get('name', alarm_id),
            'system': entry.get('system', 'Unknown'),
            'severity': entry.get('severity', 'MEDIUM')
        })
        
        # 添加因果边
        causal_rels = entry.get('causal_relationships', {})
        
        # 此告警导致的下游告警
        causes = causal_rels.get('causes', [])
        for cause in causes:
            target_alarm = cause.get('alarm')
            probability = cause.get('probability', 0.5)
            delay = cause.get('delay_seconds', 0)
            
            self.global_graph.add_edge(
                alarm_id, 
                target_alarm,
                weight=probability,
                delay=delay
            )
        
        # 此告警被哪些告警导致
        caused_by = causal_rels.get('caused_by', [])
        for cause in caused_by:
            source_alarm = cause.get('alarm')
            probability = cause.get('probability', 0.5)
            delay = cause.get('delay_seconds', 0)
            
            self.global_graph.add_edge(
                source_alarm,
                alarm_id,
                weight=probability,
                delay=delay
            )
    
    def _create_default_graph(self):
        """创建默认的因果图（如果guidebook不存在）"""
        print("[CausalGraphAnalyzer] Creating default causal graph...")
        
        # 冷却系统故障链
        self.global_graph.add_edge('COOLANT_PUMP_FAULT', 'COOLANT_FLOW_LOW', weight=0.95, delay=5)
        self.global_graph.add_edge('COOLANT_FLOW_LOW', 'BATT_OVERTEMP', weight=0.85, delay=10)
        self.global_graph.add_edge('BATT_OVERTEMP', 'BMS_FAULT_THERMAL', weight=0.75, delay=20)
        self.global_graph.add_edge('BMS_FAULT_THERMAL', 'POWER_LIMIT_ACTIVE', weight=0.70, delay=15)
        self.global_graph.add_edge('BATT_OVERTEMP', 'BATTERY_ROOM_TEMP_HIGH', weight=0.60, delay=25)
        
        # 电气系统故障链
        self.global_graph.add_edge('BATT_LOW_SOC', 'MAIN_BUS_UNDERVOLT', weight=0.88, delay=10)
        self.global_graph.add_edge('MAIN_BUS_UNDERVOLT', 'GEN_OVERLOAD', weight=0.65, delay=15)
        self.global_graph.add_edge('BATT_LOW_SOC', 'POWER_LIMIT_ACTIVE', weight=0.60, delay=20)
        
        # HVAC相关
        self.global_graph.add_edge('HVAC_CHILLER_FAULT', 'BATTERY_ROOM_TEMP_HIGH', weight=0.80, delay=30)
        self.global_graph.add_edge('BATTERY_ROOM_TEMP_HIGH', 'BATT_OVERTEMP', weight=0.50, delay=40)
    
    def find_root_cause(self, alarm_cluster: List[Dict]) -> Dict[str, Any]:
        """
        找出告警簇的根因
        
        参数:
            alarm_cluster: 告警列表
        
        返回:
            {
                'root_cause': str,
                'pagerank_score': float,
                'alternatives': [(alarm, score), ...],
                'explanation': str
            }
        """
        alarm_types = [a['type'] for a in alarm_cluster]
        print(f"[CausalGraphAnalyzer] Analyzing {len(alarm_types)} alarms: {alarm_types}")
        
        # 提取子图（只包含当前告警）
        subgraph = self._build_subgraph(alarm_types)
        
        if subgraph.number_of_nodes() == 0:
            print("[CausalGraphAnalyzer] No known relationships, cannot determine root cause")
            return {
                'root_cause': alarm_types[0] if alarm_types else None,
                'pagerank_score': 0.0,
                'alternatives': [],
                'explanation': 'No causal relationships found in knowledge base'
            }
        
        # PageRank分析
        root_cause, pagerank_scores = self._pagerank_analysis(subgraph, alarm_types)
        
        # 生成解释
        explanation = self._generate_explanation(root_cause, alarm_types, subgraph)
        
        return {
            'root_cause': root_cause,
            'pagerank_score': pagerank_scores.get(root_cause, 0.0),
            'alternatives': [(k, v) for k, v in sorted(pagerank_scores.items(), key=lambda x: x[1], reverse=True)[1:4]],
            'explanation': explanation
        }
    
    def _build_subgraph(self, alarm_types: List[str]) -> nx.DiGraph:
        """构建只包含当前告警的子图"""
        alarm_set = set(alarm_types)
        
        # 创建子图
        subgraph = nx.DiGraph()
        
        # 添加节点
        for alarm in alarm_set:
            if alarm in self.global_graph:
                subgraph.add_node(alarm, **self.global_graph.nodes[alarm])
            else:
                subgraph.add_node(alarm)
        
        # 添加边（只连接子图内的节点）
        for u, v in self.global_graph.edges():
            if u in alarm_set and v in alarm_set:
                edge_data = self.global_graph[u][v]
                subgraph.add_edge(u, v, **edge_data)
        
        print(f"[CausalGraphAnalyzer] Subgraph: {subgraph.number_of_nodes()} nodes, {subgraph.number_of_edges()} edges")
        return subgraph
    
    def _pagerank_analysis(self, subgraph: nx.DiGraph, alarm_types: List[str]) -> Tuple[str, Dict[str, float]]:
        """
        使用PageRank找出根因
        反转图后，PageRank最高的是根因（因为它被最多节点指向）
        """
        if subgraph.number_of_nodes() == 0:
            return alarm_types[0] if alarm_types else None, {}
        
        # 反转图
        reversed_graph = subgraph.reverse()
        
        try:
            # 计算PageRank（使用边权重）
            pagerank_scores = nx.pagerank(reversed_graph, alpha=0.85, weight='weight')
        except:
            # 如果失败，不使用权重
            try:
                pagerank_scores = nx.pagerank(reversed_graph, alpha=0.85)
            except:
                # 如果还是失败，返回第一个
                return alarm_types[0], {alarm_types[0]: 1.0}
        
        # 排序
        sorted_scores = sorted(pagerank_scores.items(), key=lambda x: x[1], reverse=True)
        
        print("[CausalGraphAnalyzer] PageRank scores:")
        for alarm, score in sorted_scores[:5]:
            print(f"  {alarm}: {score:.4f}")
        
        root_cause = sorted_scores[0][0] if sorted_scores else alarm_types[0]
        
        return root_cause, pagerank_scores
    
    def _generate_explanation(self, root_cause: str, alarm_types: List[str], subgraph: nx.DiGraph) -> str:
        """生成因果链解释"""
        if root_cause not in subgraph:
            return f"{root_cause} identified as root cause (no causal relationships known)"
        
        # 找出从root_cause出发能到达的所有节点
        reachable = nx.descendants(subgraph, root_cause)
        
        # 统计有多少告警是由root_cause导致的
        caused_count = len(reachable.intersection(set(alarm_types)))
        
        # 构建因果链
        causal_chain = []
        for target in alarm_types:
            if target == root_cause:
                continue
            if target in reachable:
                # 找最短路径
                try:
                    path = nx.shortest_path(subgraph, root_cause, target)
                    causal_chain.append(" → ".join(path))
                except:
                    pass
        
        explanation = f"{root_cause} is identified as the root cause. "
        explanation += f"It directly or indirectly causes {caused_count} other alarms in this incident."
        
        if causal_chain:
            explanation += f"\n\nCausal chains:\n" + "\n".join([f"• {chain}" for chain in causal_chain[:3]])
        
        return explanation
    
    def get_graph_statistics(self) -> Dict[str, Any]:
        """获取图的统计信息"""
        return {
            'total_nodes': self.global_graph.number_of_nodes(),
            'total_edges': self.global_graph.number_of_edges(),
            'average_out_degree': sum(dict(self.global_graph.out_degree()).values()) / max(self.global_graph.number_of_nodes(), 1),
            'nodes': list(self.global_graph.nodes())
        }


if __name__ == "__main__":
    # 测试代码
    print("=" * 60)
    print("Testing CausalGraphAnalyzer")
    print("=" * 60)
    
    # 使用默认图（如果guidebook不存在）
    analyzer = CausalGraphAnalyzer("./guidebook")
    
    # 打印图统计
    stats = analyzer.get_graph_statistics()
    print(f"\nGraph Statistics:")
    print(f"  Nodes: {stats['total_nodes']}")
    print(f"  Edges: {stats['total_edges']}")
    print(f"  Average out-degree: {stats['average_out_degree']:.2f}")
    
    # 测试场景：冷却系统故障
    test_alarms = [
        {'type': 'COOLANT_PUMP_FAULT', 'timestamp': '14:23:08'},
        {'type': 'COOLANT_FLOW_LOW', 'timestamp': '14:23:12'},
        {'type': 'BATT_OVERTEMP', 'timestamp': '14:23:17'},
        {'type': 'BMS_FAULT_THERMAL', 'timestamp': '14:23:35'},
        {'type': 'POWER_LIMIT_ACTIVE', 'timestamp': '14:23:42'},
    ]
    
    result = analyzer.find_root_cause(test_alarms)
    
    print("\n" + "=" * 60)
    print("Root Cause Analysis Result:")
    print("=" * 60)
    print(f"Root Cause: {result['root_cause']}")
    print(f"PageRank Score: {result['pagerank_score']:.4f}")
    print(f"\nExplanation:\n{result['explanation']}")
    
    if result['alternatives']:
        print(f"\nAlternative Causes:")
        for alt, score in result['alternatives']:
            print(f"  {alt}: {score:.4f}")
