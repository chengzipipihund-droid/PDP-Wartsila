# Main Engine 模块 UI 深化改进

## 📋 改进概述

Main Engine 模块已从简单的静态 SVG 展示升级为**动态组件化架构**，支持引擎信息切换和详细数据展示。

### 核心功能
- ✅ **详细面板** (`EngineDetailPanel.jsx`) - 显示所有引擎详细信息
- ✅ **折叠面板** (`EngineCompactPanel.jsx`) - 显示引擎编号和状态
- ✅ **状态管理** - 无缝切换详细/折叠显示
- ✅ **能量流向可视化** - 黄色（流失）、红色（快速流失）、绿色（流入）箭头
- ✅ **容量指示** - 垂直bar显示引擎负载百分比

---

## 🏗️ 组件架构

```
MainEnginePanel
  ├── EngineDetailPanel (左侧 - 当前活跃引擎)
  │   ├── Header (引擎编号、型号、状态)
  │   ├── Visual (线稿icon + 能量流向箭头)
  │   └── Capacity Bar (右侧容量显示)
  │
  └── EngineCompactPanel[] (右侧 - 其他3个引擎)
      └── 点击可切换到详细面板
```

---

## 📊 数据结构

每个引擎对象包含：

```javascript
{
  id: 'ME1',                      // 引擎编号
  model: 'Wärtsilä 46F',         // 引擎型号
  status: 'run',                  // 状态: run | stop | fault
  load: 75,                       // 负载百分比 (0-100)
  energyFlow: {
    normal: true,                 // 黄色向下箭头 (正常能量流失)
    rapid: false,                 // 红色向下箭头 (快速能量流失)
    input: false,                 // 绿色向上箭头 (能量输入)
  }
}
```

---

## 🎨 视觉设计细节

### 详细面板布局 (参照SVG原始尺寸)

```
┌─────────────────────────────────┐
│  ME1  │  Wärtsilä 46F  │ [RUN]  │  ← Header
├─────────────────────────────────┤
│                                 │
│  [Engine Icon]  [Arrows]  [Bar] │  ← Content
│       线稿        能量流向   负载  │
│                                 │
│                          [Close] │  ← Footer
└─────────────────────────────────┘
```

### 折叠面板布局

```
┌──────────────┐
│ ME2  [RUN]   │
│     ●        │  ← 状态指示灯
└──────────────┘
```

### 能量流向箭头颜色
- 🟨 **黄色 (#EAB71D)** - 正常能量流失
- 🔴 **红色 (#E74C3C)** - 快速能量流失
- 🟢 **绿色 (#4FBF65)** - 能量流入

### 状态颜色
- 🟢 **RUN** - 绿色背景
- ⚫ **STOP** - 灰色背景
- 🔴 **FAULT** - 红色背景

---

## 🔄 交互流程

1. **初始化**: ME1 显示在详细面板，ME2/3/4 显示在右侧折叠面板
2. **点击折叠面板**: 
   - 该引擎切换到详细面板（左侧）
   - 原详细面板的引擎显示为折叠面板（右侧）
   - 平滑过渡
3. **关闭详细面板**: 自动显示第一个可用的折叠引擎为详细面板

---

## 📁 文件列表

### 新建文件
- `EngineDetailPanel.jsx` - 详细面板组件
- `EngineDetailPanel.css` - 详细面板样式
- `EngineCompactPanel.jsx` - 折叠面板组件
- `EngineCompactPanel.css` - 折叠面板样式

### 修改文件
- `MainEnginePanel.jsx` - 集成新组件，管理状态
- `MainEnginePanel.css` - 更新布局

### 保留文件（可删除或未来使用）
- `ME1.svg` - 原始静态SVG（暂未使用）
- `ME2.svg` - 原始静态SVG（暂未使用）
- `ME3.svg` - 原始静态SVG（暂未使用）
- `ME4.svg` - 原始静态SVG（暂未使用）

---

## 🔌 集成指南

### 连接真实数据源

在 `MainEnginePanel.jsx` 中替换 `ENGINE_DATA`：

```javascript
// 方案1: 从 props 接收
function MainEnginePanel({ engines }) {
  const [activeEngineId, setActiveEngineId] = useState(engines[0]?.id || 'ME1');
  // ... 使用 engines 代替 ENGINE_DATA
}

// 方案2: 从 Zustand store 接收
import { useEnergyStore } from '../stores/energyStore';
function MainEnginePanel() {
  const engines = useEnergyStore((state) => state.engines);
  // ...
}

// 方案3: 从 WebSocket 实时更新
useEffect(() => {
  const unsubscribe = subscribe('ENGINE_DATA', (data) => {
    setEngines(data);
  });
  return unsubscribe;
}, []);
```

---

## 🎯 未来增强

1. **数据动态化** - 从 Python 后端或 WebSocket 实时接收引擎数据
2. **性能指标** - 添加实时温度、压力、油耗等详细指标
3. **告警集成** - 引擎故障时的视觉反馈和告警声音
4. **历史数据** - 点击引擎查看历史运行数据图表
5. **动画效果** - 能量箭头闪烁、负载条动画
6. **拖拽排序** - 允许调整引擎折叠面板顺序
7. **导出报告** - 生成引擎运行状态报告

---

## 📱 响应式设计

- **桌面 (>1024px)**: 详细面板 + 3个折叠面板竖排
- **平板 (768px-1024px)**: 减小折叠面板宽度
- **手机 (<768px)**: 详细面板上，折叠面板横排

---

## 🐛 已知注意事项

- 当前使用模拟数据 (`ENGINE_DATA`)，需要与后端集成
- 能量箭头现在是简单的SVG，可根据需要进一步定制
- 容量bar为简单的渐变色，可添加更复杂的动画效果

---

## ✨ 样式一致性

所有配色和尺寸严格遵循原 SVG 设计：
- 背景色: `#F7F7F7`, `#EFEFEF`
- 边框色: `#999`
- 文本色: `#333`, `#666`
- 状态色: `#4FBF65` (run), `#E74C3C` (fault), `#CCCCCC` (stop)
