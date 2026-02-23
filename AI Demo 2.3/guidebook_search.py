"""
GuidebookSearchEngine - NLP语义搜索引擎
使用sentence-transformers和FAISS进行快速语义检索
"""

import os
import yaml
import numpy as np
from sentence_transformers import SentenceTransformer
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    print("[GuidebookSearch] Warning: FAISS not available, using fallback search")
from typing import List, Dict, Any


class GuidebookSearchEngine:
    """
    Guidebook语义搜索引擎
    使用预训练的sentence-transformers模型创建embeddings
    """
    
    def __init__(self, guidebook_path: str, model_name: str = 'all-MiniLM-L6-v2'):
        """
        参数:
            guidebook_path: guidebook YAML文件目录
            model_name: sentence-transformers模型名称
        """
        self.guidebook_path = guidebook_path
        self.entries = []
        self.texts = []
        self.embeddings = None
        self.index = None
        
        print(f"[GuidebookSearch] Loading sentence-transformer model: {model_name}")
        try:
            self.model = SentenceTransformer(model_name)
        except Exception as e:
            print(f"[GuidebookSearch] Error loading model: {e}")
            print("[GuidebookSearch] Will use keyword-based fallback")
            self.model = None
        
        self._load_guidebook()
        if self.model:
            self._build_index()
    
    def _load_guidebook(self):
        """加载所有guidebook条目"""
        if not os.path.exists(self.guidebook_path):
            print(f"[GuidebookSearch] Warning: Guidebook path not found: {self.guidebook_path}")
            self._create_default_entries()
            return
        
        yaml_files = [f for f in os.listdir(self.guidebook_path) if f.endswith('.yaml')]
        print(f"[GuidebookSearch] Loading {len(yaml_files)} guidebook entries...")
        
        for yaml_file in yaml_files:
            file_path = os.path.join(self.guidebook_path, yaml_file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    entry = yaml.safe_load(f)
                    self.entries.append(entry)
                    
                    # 创建可搜索的文本
                    text = self._entry_to_text(entry)
                    self.texts.append(text)
            except Exception as e:
                print(f"[GuidebookSearch] Error loading {yaml_file}: {e}")
        
        if len(self.entries) == 0:
            print("[GuidebookSearch] No entries loaded, using defaults")
            self._create_default_entries()
        else:
            print(f"[GuidebookSearch] Loaded {len(self.entries)} entries")
    
    def _entry_to_text(self, entry: Dict) -> str:
        """将guidebook条目转换为可搜索的文本"""
        parts = []
        
        # 基本信息
        parts.append(f"Alarm: {entry.get('alarm_id', '')}")
        parts.append(f"Name: {entry.get('name', '')}")
        parts.append(f"System: {entry.get('system', '')}")
        
        # 描述
        if 'description' in entry:
            parts.append(entry['description'])
        
        # 症状
        if 'symptoms' in entry:
            parts.append("Symptoms: " + " ".join(entry['symptoms']))
        
        # Root causes
        if 'root_causes' in entry:
            for rc in entry['root_causes']:
                parts.append(f"Cause: {rc.get('cause', '')}")
        
        return " ".join(parts)
    
    def _create_default_entries(self):
        """创建默认条目（如果guidebook不存在）"""
        print("[GuidebookSearch] Creating default guidebook entries...")
        
        default_entries = [
            {
                'alarm_id': 'COOLANT_PUMP_FAULT',
                'name': 'Coolant Pump Motor Fault',
                'system': 'Cooling System',
                'description': 'Coolant pump has failed, leading to inadequate cooling',
                'immediate_actions': [
                    {'step': 1, 'action': 'Reduce battery discharge to 50%'},
                    {'step': 2, 'action': 'Check pump motor current'},
                    {'step': 3, 'action': 'Switch to backup pump if available'}
                ]
            },
            {
                'alarm_id': 'BATT_OVERTEMP',
                'name': 'Battery Module Overtemperature',
                'system': 'Battery ESS',
                'description': 'Battery temperature exceeds 40°C, risk of thermal runaway',
                'immediate_actions': [
                    {'step': 1, 'action': 'Reduce discharge rate immediately'},
                    {'step': 2, 'action': 'Increase coolant flow'},
                    {'step': 3, 'action': 'If temp >45°C, initiate emergency shutdown'}
                ]
            }
        ]
        
        self.entries = default_entries
        self.texts = [self._entry_to_text(e) for e in default_entries]
    
    def _build_index(self):
        """构建FAISS索引"""
        if not self.model or len(self.texts) == 0:
            return
        
        print("[GuidebookSearch] Building semantic search index...")
        
        # 生成embeddings
        self.embeddings = self.model.encode(self.texts, convert_to_numpy=True)
        
        if FAISS_AVAILABLE:
            # 使用FAISS
            dimension = self.embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(self.embeddings.astype('float32'))
            print(f"[GuidebookSearch] FAISS index built with {len(self.texts)} entries")
        else:
            print("[GuidebookSearch] FAISS not available, will use numpy similarity")
    
    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        语义搜索
        
        参数:
            query: 搜索查询
            top_k: 返回前k个结果
        
        返回:
            [{'entry': dict, 'score': float, 'alarm_id': str}, ...]
        """
        if not self.model or len(self.entries) == 0:
            print("[GuidebookSearch] Using keyword fallback search")
            return self._keyword_search(query, top_k)
        
        # 生成查询embedding
        query_embedding = self.model.encode([query], convert_to_numpy=True)
        
        if FAISS_AVAILABLE and self.index:
            # 使用FAISS搜索
            distances, indices = self.index.search(query_embedding.astype('float32'), top_k)
            
            results = []
            for i, idx in enumerate(indices[0]):
                if idx < len(self.entries):
                    # 距离转换为相似度分数
                    score = 1.0 / (1.0 + distances[0][i])
                    results.append({
                        'entry': self.entries[idx],
                        'score': float(score),
                        'alarm_id': self.entries[idx].get('alarm_id', 'UNKNOWN')
                    })
        else:
            # 使用numpy计算余弦相似度
            similarities = np.dot(self.embeddings, query_embedding.T).flatten()
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            
            results = []
            for idx in top_indices:
                results.append({
                    'entry': self.entries[idx],
                    'score': float(similarities[idx]),
                    'alarm_id': self.entries[idx].get('alarm_id', 'UNKNOWN')
                })
        
        return results
    
    def _keyword_search(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        """关键词搜索fallback"""
        query_lower = query.lower()
        
        scored_entries = []
        for i, text in enumerate(self.texts):
            text_lower = text.lower()
            # 简单的关键词匹配打分
            score = sum(1 for word in query_lower.split() if word in text_lower)
            scored_entries.append((score, i))
        
        # 排序
        scored_entries.sort(reverse=True)
        
        results = []
        for score, idx in scored_entries[:top_k]:
            if score > 0:
                results.append({
                    'entry': self.entries[idx],
                    'score': float(score / len(query_lower.split())),
                    'alarm_id': self.entries[idx].get('alarm_id', 'UNKNOWN')
                })
        
        return results
    
    def get_corrective_actions(self, alarm_id: str) -> List[Dict[str, Any]]:
        """
        获取特定告警的纠正措施
        
        参数:
            alarm_id: 告警ID
        
        返回:
            [{'step': int, 'action': str, 'verification': str}, ...]
        """
        # 先尝试精确匹配
        for entry in self.entries:
            if entry.get('alarm_id') == alarm_id:
                return entry.get('immediate_actions', [])
        
        # 如果没找到，尝试语义搜索
        results = self.search(f"corrective actions for {alarm_id}", top_k=1)
        
        if results:
            return results[0]['entry'].get('immediate_actions', [])
        
        return [{'step': 1, 'action': f'No specific actions found for {alarm_id}. Contact Chief Engineer.'}]
    
    def get_entry_by_id(self, alarm_id: str) -> Dict[str, Any]:
        """根据alarm_id获取完整条目"""
        for entry in self.entries:
            if entry.get('alarm_id') == alarm_id:
                return entry
        return None


if __name__ == "__main__":
    # 测试代码
    print("=" * 60)
    print("Testing GuidebookSearchEngine")
    print("=" * 60)
    
    search_engine = GuidebookSearchEngine("./guidebook")
    
    # 测试语义搜索
    queries = [
        "coolant pump not working",
        "battery too hot",
        "how to fix overheating battery"
    ]
    
    for query in queries:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print('='*60)
        
        results = search_engine.search(query, top_k=2)
        
        for i, result in enumerate(results, 1):
            print(f"\n{i}. {result['alarm_id']} (score: {result['score']:.3f})")
            print(f"   {result['entry'].get('name', 'N/A')}")
            
            actions = result['entry'].get('immediate_actions', [])
            if actions:
                print(f"   Actions:")
                for action in actions[:2]:
                    print(f"     {action.get('step')}. {action.get('action')}")
    
    # 测试获取特定告警的措施
    print(f"\n{'='*60}")
    print("Get Corrective Actions for COOLANT_PUMP_FAULT")
    print('='*60)
    
    actions = search_engine.get_corrective_actions('COOLANT_PUMP_FAULT')
    for action in actions:
        print(f"{action.get('step')}. {action.get('action')}")
