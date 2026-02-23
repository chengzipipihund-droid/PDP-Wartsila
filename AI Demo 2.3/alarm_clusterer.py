"""
AlarmClusterer - DBSCAN时序聚类模块
将时间上接近的告警分组，识别独立的故障事件
"""

import numpy as np
from sklearn.cluster import DBSCAN
from datetime import datetime
from typing import List, Dict, Any


class AlarmClusterer:
    """
    使用DBSCAN算法对告警进行时序聚类
    
    参数:
        eps_seconds: 时间窗口（秒），在此范围内的告警视为邻居
        min_samples: 形成簇所需的最小告警数
    """
    
    def __init__(self, eps_seconds: int = 60, min_samples: int = 3):
        self.eps = eps_seconds
        self.min_samples = min_samples
        print(f"[AlarmClusterer] Initialized with eps={eps_seconds}s, min_samples={min_samples}")
    
    def cluster_alarms(self, alarm_stream: List[Dict[str, Any]]) -> Dict[int, List[Dict]]:
        """
        对告警流进行聚类
        
        参数:
            alarm_stream: 告警列表，每个告警包含 'id', 'type', 'timestamp'
        
        返回:
            字典 {cluster_id: [alarms]}
            cluster_id = -1 表示噪声点（孤立告警）
        """
        if len(alarm_stream) == 0:
            print("[AlarmClusterer] No alarms to cluster")
            return {}
        
        if len(alarm_stream) < self.min_samples:
            print(f"[AlarmClusterer] Only {len(alarm_stream)} alarms, treating as single cluster")
            return {0: alarm_stream}
        
        # 转换时间戳为数值（相对于第一个告警的秒数）
        timestamps = []
        for alarm in alarm_stream:
            ts = self._parse_timestamp(alarm['timestamp'])
            timestamps.append(ts)
        
        # 计算相对时间（秒）
        base_time = min(timestamps)
        relative_times = np.array([(t - base_time) for t in timestamps]).reshape(-1, 1)
        
        # 修复：确保relative_times是数组
        if relative_times.size > 0:
            max_time = float(relative_times.max())
            print(f"[AlarmClusterer] Time range: 0 to {max_time:.1f} seconds")
        else:
            print(f"[AlarmClusterer] Time range: 0 seconds")
        
        # DBSCAN聚类
        dbscan = DBSCAN(eps=self.eps, min_samples=self.min_samples)
        labels = dbscan.fit_predict(relative_times)
        
        # 分组
        clusters = {}
        for i, label in enumerate(labels):
            label = int(label)  # 确保是Python int类型
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(alarm_stream[i])
        
        # 统计
        valid_clusters = [c for c in clusters.keys() if c != -1]
        print(f"[AlarmClusterer] Found {len(valid_clusters)} clusters")
        if -1 in clusters:
            print(f"[AlarmClusterer] {len(clusters[-1])} noise alarms (isolated)")
        
        for cluster_id, alarms in clusters.items():
            if cluster_id != -1:
                print(f"  Cluster {cluster_id}: {len(alarms)} alarms")
        
        return clusters
    
    def _parse_timestamp(self, timestamp_str: str) -> float:
        """
        解析时间戳字符串为Unix时间戳（秒）
        支持格式: "HH:MM:SS" 或 ISO格式
        """
        try:
            # 尝试ISO格式
            dt = datetime.fromisoformat(timestamp_str)
            return dt.timestamp()
        except:
            # 尝试简单时间格式 HH:MM:SS
            try:
                parts = timestamp_str.split(':')
                hours, minutes, seconds = int(parts[0]), int(parts[1]), int(parts[2])
                # 使用今天的日期
                today = datetime.now().replace(hour=hours, minute=minutes, second=seconds, microsecond=0)
                return today.timestamp()
            except:
                print(f"[AlarmClusterer] Warning: Could not parse timestamp '{timestamp_str}', using current time")
                return datetime.now().timestamp()
    
    def get_cluster_timeline(self, cluster_alarms: List[Dict]) -> str:
        """
        生成簇的时间线摘要
        """
        if not cluster_alarms:
            return "No alarms in cluster"
        
        sorted_alarms = sorted(cluster_alarms, key=lambda a: self._parse_timestamp(a['timestamp']))
        
        timeline = []
        for i, alarm in enumerate(sorted_alarms):
            timeline.append(f"{i+1}. [{alarm['timestamp']}] {alarm['type']}")
        
        return "\n".join(timeline)


if __name__ == "__main__":
    # 测试代码
    print("=" * 60)
    print("Testing AlarmClusterer")
    print("=" * 60)
    
    # 模拟告警数据
    test_alarms = [
        {'id': 'A1', 'type': 'COOLANT_PUMP_FAULT', 'timestamp': '14:23:08'},
        {'id': 'A2', 'type': 'COOLANT_FLOW_LOW', 'timestamp': '14:23:12'},
        {'id': 'A3', 'type': 'BATT_OVERTEMP', 'timestamp': '14:23:17'},
        {'id': 'A4', 'type': 'CELL_VOLTAGE_IMBALANCE', 'timestamp': '14:23:22'},
        {'id': 'A5', 'type': 'BMS_FAULT_THERMAL', 'timestamp': '14:23:35'},
        {'id': 'A6', 'type': 'POWER_LIMIT_ACTIVE', 'timestamp': '14:23:42'},
        # 孤立告警（60秒后）
        {'id': 'A7', 'type': 'GPS_SIGNAL_LOSS', 'timestamp': '14:25:30'},
    ]
    
    clusterer = AlarmClusterer(eps_seconds=60, min_samples=3)
    clusters = clusterer.cluster_alarms(test_alarms)
    
    print("\n" + "=" * 60)
    print("Clustering Results:")
    print("=" * 60)
    
    for cluster_id, alarms in clusters.items():
        print(f"\nCluster {cluster_id} ({'Noise' if cluster_id == -1 else 'Valid'}):")
        print(clusterer.get_cluster_timeline(alarms))
