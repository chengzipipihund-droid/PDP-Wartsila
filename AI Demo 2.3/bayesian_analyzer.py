"""
BayesianRootCauseAnalyzer - 贝叶斯推断置信度评估
结合先验概率和似然概率，计算后验概率
"""

import numpy as np
from typing import List, Dict, Any
from collections import defaultdict


class BayesianRootCauseAnalyzer:
    """
    贝叶斯根因分析器
    基于历史数据计算先验概率和似然概率
    """
    
    def __init__(self, historical_data: List[Dict] = None):
        """
        参数:
            historical_data: 历史事件数据列表
                [{'root_cause': str, 'alarms': [str, ...]}, ...]
        """
        self.priors = {}  # P(Root Cause)
        self.likelihoods = {}  # P(Alarm Set | Root Cause)
        
        if historical_data:
            self._compute_priors(historical_data)
            self._compute_likelihoods(historical_data)
        else:
            self._use_default_priors()
        
        print(f"[BayesianAnalyzer] Initialized with {len(self.priors)} known root causes")
    
    def _compute_priors(self, historical_data: List[Dict]):
        """计算先验概率 P(Root Cause)"""
        total_incidents = len(historical_data)
        cause_counts = defaultdict(int)
        
        for incident in historical_data:
            cause = incident.get('root_cause')
            if cause:
                cause_counts[cause] += 1
        
        # 归一化
        for cause, count in cause_counts.items():
            self.priors[cause] = count / total_incidents
        
        print(f"[BayesianAnalyzer] Computed priors from {total_incidents} incidents")
    
    def _compute_likelihoods(self, historical_data: List[Dict]):
        """计算似然概率 P(Alarm Set | Root Cause)"""
        # 按root cause分组
        incidents_by_cause = defaultdict(list)
        for incident in historical_data:
            cause = incident.get('root_cause')
            alarms = frozenset(incident.get('alarms', []))
            if cause and alarms:
                incidents_by_cause[cause].append(alarms)
        
        # 计算每个cause下各alarm set的频率
        for cause, alarm_sets in incidents_by_cause.items():
            self.likelihoods[cause] = {}
            total_count = len(alarm_sets)
            
            # 统计频率
            alarm_set_counts = defaultdict(int)
            for alarm_set in alarm_sets:
                alarm_set_counts[alarm_set] += 1
            
            # 归一化
            for alarm_set, count in alarm_set_counts.items():
                self.likelihoods[cause][alarm_set] = count / total_count
    
    def _use_default_priors(self):
        """使用默认先验概率（基于经验）"""
        print("[BayesianAnalyzer] Using default priors (no historical data)")
        
        self.priors = {
            'COOLANT_PUMP_FAULT': 0.18,
            'BATT_LOW_SOC': 0.15,
            'HVAC_CHILLER_FAULT': 0.08,
            'MOTOR_OVERTEMP': 0.10,
            'VFD_FAULT': 0.12,
            'GEN_FUEL_ISSUE': 0.08,
            'CELL_INTERNAL_FAULT': 0.05,
            # 其他原因
            'OTHER': 0.24
        }
    
    def infer_root_cause(
        self, 
        observed_alarms: List[str], 
        pagerank_candidates: List[Dict]
    ) -> Dict[str, Any]:
        """
        贝叶斯推断
        
        参数:
            observed_alarms: 观察到的告警列表
            pagerank_candidates: PageRank给出的候选列表
                [{'cause': str, 'pagerank_score': float}, ...]
        
        返回:
            {
                'root_cause': str,
                'confidence': float,
                'method': str,
                'posteriors': {cause: probability},
                'alternatives': [{'cause': str, 'confidence': float}, ...]
            }
        """
        observed_set = frozenset(observed_alarms)
        posteriors = {}
        
        print(f"[BayesianAnalyzer] Analyzing {len(observed_alarms)} alarms")
        
        # 对每个候选计算后验概率
        for candidate in pagerank_candidates:
            cause = candidate['cause']
            
            # 获取先验 P(Cause)
            prior = self.priors.get(cause, 0.01)  # 未知原因给低先验
            
            # 计算似然 P(Alarms | Cause)
            likelihood = self._calculate_likelihood(cause, observed_set, observed_alarms)
            
            # 后验 ∝ 先验 × 似然
            posteriors[cause] = prior * likelihood
            
            print(f"  {cause}: prior={prior:.3f}, likelihood={likelihood:.3f}, posterior∝{posteriors[cause]:.4f}")
        
        # 归一化
        total = sum(posteriors.values())
        if total > 0:
            posteriors = {k: v/total for k, v in posteriors.items()}
        else:
            # 如果所有后验都是0，使用均匀分布
            posteriors = {k: 1.0/len(pagerank_candidates) for k in posteriors.keys()}
        
        # 与PageRank结合（加权平均）
        combined_scores = self._combine_with_pagerank(posteriors, pagerank_candidates)
        
        # 排序
        ranked = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        
        if not ranked:
            return {
                'root_cause': observed_alarms[0] if observed_alarms else 'UNKNOWN',
                'confidence': 0.0,
                'method': 'Default (no candidates)',
                'posteriors': {},
                'alternatives': []
            }
        
        root_cause = ranked[0][0]
        confidence = ranked[0][1]
        
        alternatives = [
            {'cause': cause, 'confidence': conf}
            for cause, conf in ranked[1:4]
        ]
        
        return {
            'root_cause': root_cause,
            'confidence': confidence,
            'method': 'Bayesian + PageRank fusion (60% PageRank, 40% Bayesian)',
            'posteriors': posteriors,
            'alternatives': alternatives
        }
    
    def _calculate_likelihood(self, cause: str, observed_set: frozenset, observed_list: List[str]) -> float:
        """
        计算似然 P(Observed Alarms | Cause)
        
        策略:
        1. 如果有完全匹配的历史alarm set，使用其概率
        2. 否则，使用Jaccard相似度近似
        """
        if cause not in self.likelihoods:
            # 未知cause，使用默认似然
            return 0.1
        
        # 检查是否有完全匹配
        if observed_set in self.likelihoods[cause]:
            return self.likelihoods[cause][observed_set]
        
        # 使用Jaccard相似度近似
        max_similarity = 0.0
        for known_set, prob in self.likelihoods[cause].items():
            similarity = self._jaccard_similarity(observed_set, known_set)
            max_similarity = max(max_similarity, similarity * prob)
        
        # 如果没有历史数据，基于告警数量给一个默认值
        if max_similarity == 0.0:
            # 假设5个告警的组合有合理概率
            base_prob = 0.3
            # 告警越多，概率越低（更罕见）
            return base_prob * (0.8 ** max(0, len(observed_list) - 3))
        
        return max_similarity
    
    def _jaccard_similarity(self, set1: frozenset, set2: frozenset) -> float:
        """计算Jaccard相似度"""
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def _combine_with_pagerank(
        self, 
        bayesian_posteriors: Dict[str, float],
        pagerank_candidates: List[Dict]
    ) -> Dict[str, float]:
        """
        结合贝叶斯后验和PageRank分数
        
        使用加权平均: 60% PageRank + 40% Bayesian
        """
        # PageRank分数归一化
        pagerank_dict = {c['cause']: c['pagerank_score'] for c in pagerank_candidates}
        total_pr = sum(pagerank_dict.values())
        if total_pr > 0:
            pagerank_dict = {k: v/total_pr for k, v in pagerank_dict.items()}
        
        # 加权组合
        combined = {}
        all_causes = set(bayesian_posteriors.keys()).union(set(pagerank_dict.keys()))
        
        for cause in all_causes:
            pr_score = pagerank_dict.get(cause, 0.0)
            bayes_score = bayesian_posteriors.get(cause, 0.0)
            
            # 60% PageRank, 40% Bayesian
            combined[cause] = 0.6 * pr_score + 0.4 * bayes_score
        
        return combined
    
    def update_with_feedback(self, root_cause: str, observed_alarms: List[str], was_correct: bool):
        """
        根据反馈更新模型
        
        参数:
            root_cause: 确认的根因
            observed_alarms: 观察到的告警
            was_correct: AI的预测是否正确
        """
        print(f"[BayesianAnalyzer] Feedback: {root_cause} {'✓' if was_correct else '✗'}")
        
        # 更新先验（简单的频率更新）
        if root_cause not in self.priors:
            self.priors[root_cause] = 0.01
        
        # 增加该原因的先验权重
        adjustment = 0.05 if was_correct else -0.02
        self.priors[root_cause] = max(0.01, min(0.5, self.priors[root_cause] + adjustment))
        
        # 重新归一化
        total = sum(self.priors.values())
        self.priors = {k: v/total for k, v in self.priors.items()}
        
        print(f"[BayesianAnalyzer] Updated prior for {root_cause}: {self.priors[root_cause]:.3f}")


if __name__ == "__main__":
    # 测试代码
    print("=" * 60)
    print("Testing BayesianRootCauseAnalyzer")
    print("=" * 60)
    
    # 模拟历史数据
    historical_data = [
        {'root_cause': 'COOLANT_PUMP_FAULT', 'alarms': ['COOLANT_FLOW_LOW', 'BATT_OVERTEMP', 'BMS_FAULT_THERMAL']},
        {'root_cause': 'COOLANT_PUMP_FAULT', 'alarms': ['COOLANT_FLOW_LOW', 'BATT_OVERTEMP', 'POWER_LIMIT_ACTIVE']},
        {'root_cause': 'BATT_LOW_SOC', 'alarms': ['MAIN_BUS_UNDERVOLT', 'GEN_OVERLOAD', 'POWER_LIMIT_ACTIVE']},
        {'root_cause': 'HVAC_CHILLER_FAULT', 'alarms': ['BATTERY_ROOM_TEMP_HIGH', 'BATT_OVERTEMP']},
    ]
    
    analyzer = BayesianRootCauseAnalyzer(historical_data)
    
    # 测试推断
    observed_alarms = ['COOLANT_FLOW_LOW', 'BATT_OVERTEMP', 'BMS_FAULT_THERMAL', 'POWER_LIMIT_ACTIVE']
    
    pagerank_candidates = [
        {'cause': 'COOLANT_PUMP_FAULT', 'pagerank_score': 0.45},
        {'cause': 'HVAC_CHILLER_FAULT', 'pagerank_score': 0.15},
        {'cause': 'BATT_LOW_SOC', 'pagerank_score': 0.10}
    ]
    
    result = analyzer.infer_root_cause(observed_alarms, pagerank_candidates)
    
    print("\n" + "=" * 60)
    print("Bayesian Inference Result:")
    print("=" * 60)
    print(f"Root Cause: {result['root_cause']}")
    print(f"Confidence: {result['confidence']:.1%}")
    print(f"Method: {result['method']}")
    
    print(f"\nPosterior Probabilities:")
    for cause, prob in sorted(result['posteriors'].items(), key=lambda x: x[1], reverse=True):
        print(f"  {cause}: {prob:.3f}")
    
    if result['alternatives']:
        print(f"\nAlternatives:")
        for alt in result['alternatives']:
            print(f"  {alt['cause']}: {alt['confidence']:.1%}")
