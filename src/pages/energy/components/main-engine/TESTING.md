# Main Engine Module - 开发测试指南

## 🚀 快速开始

### 1. 运行应用
```bash
npm dev
```

### 2. 导航到 Energy 页面
- 从主菜单选择 "能源管理" 或 "Energy"
- 左上方可看到 "MAIN ENGINE" 面板

---

## 🧪 测试场景

### 场景1: 基础切换
1. ✅ ME1 应显示为详细面板（左侧）
2. ✅ ME2、ME3、ME4 应显示为折叠面板（右侧）
3. ✅ 点击任意折叠面板 → 切换到详细面板

### 场景2: 详细面板显示
- **顶部**: ME1 | Wärtsilä 46F | [RUN] 状态标签
- **中间**: 引擎线稿 + 能量箭头 + 右侧容量bar
- **底部**: 关闭按钮

### 场景3: 能量流向
- ME1: 黄色箭头 (正常流失)
- ME4: 红色箭头 (快速流失)
- 绿色箭头 (当前数据未激活，可修改测试)

### 场景4: 状态指示
- **[RUN]**: 绿色背景 (ME1, ME2, ME4)
- **[STOP]**: 灰色背景 (ME3)

### 场景5: 响应式
- 缩小浏览器窗口到 768px 以下
- 应垂直堆叠详细面板和折叠面板

---

## 🔧 修改测试数据

编辑 `MainEnginePanel.jsx` 中的 `ENGINE_DATA`：

```javascript
// 改变ME2的状态为FAULT (红色)
{
  id: 'ME2',
  status: 'fault',  // ← 改为 'fault'
  load: 65,
  energyFlow: {
    normal: false,
    rapid: true,    // ← 改为 true (红色箭头)
    input: false,
  },
}

// 改变ME3的负载为 50% (停止→运行)
{
  id: 'ME3',
  status: 'run',    // ← 改为 'run'
  load: 50,         // ← 改为非零值
  energyFlow: {
    normal: true,
    rapid: false,
    input: false,
  },
}

// 启用绿色箭头 (能量输入)
{
  id: 'ME4',
  energyFlow: {
    normal: false,
    rapid: false,
    input: true,    // ← 改为 true (绿色向上箭头)
  },
}
```

修改后 **热重载** (Vite会自动更新)

---

## 📊 UI 元素参考

### 详细面板布局
```
┌────────────────────────────────┐
│  ME1 │ Wärtsilä 46F │  [RUN]   │  32px 高度
├────────────────────────────────┤
│  [Icon]  [Arrows]    [Bar: 75%] │  Flex: 1
│                             [✕] │  关闭按钮
└────────────────────────────────┘
```

### 折叠面板
```
┌──────────────┐
│ ME2  [RUN]   │
│      ●       │  ← 状态指示灯 (黄/红/灰)
└──────────────┘
```

---

## 🎨 自定义配色

编辑 CSS 文件中的颜色值：

**EngineDetailPanel.css:**
```css
.status-run { background: #4FBF65; }      /* 绿 */
.status-fault { background: #E74C3C; }    /* 红 */
.status-stop { background: #CCCCCC; }     /* 灰 */

.flow-normal { /* 黄色箭头 */ fill: #EAB71D; }
.flow-rapid { /* 红色箭头 */ fill: #E74C3C; }
.flow-input { /* 绿色箭头 */ fill: #4FBF65; }
```

---

## 🔌 连接真实数据

### 方案A: Props 从父组件传入
```javascript
// App.jsx
import MainEnginePanel from './components/main-engine/MainEnginePanel';

function App() {
  const engineData = fetchEngineData(); // 从后端获取
  
  return <MainEnginePanel engines={engineData} />;
}

// MainEnginePanel.jsx
function MainEnginePanel({ engines = ENGINE_DATA }) {
  const [activeEngineId, setActiveEngineId] = useState(engines[0]?.id || 'ME1');
  // ... 使用 engines 代替硬编码的 ENGINE_DATA
}
```

### 方案B: Zustand Store 集中管理
```javascript
// stores/engineStore.js
import { create } from 'zustand';

export const useEngineStore = create((set) => ({
  engines: ENGINE_DATA,
  updateEngine: (id, data) => 
    set((state) => ({
      engines: state.engines.map(e => 
        e.id === id ? { ...e, ...data } : e
      )
    })),
}));

// MainEnginePanel.jsx
const engines = useEngineStore((state) => state.engines);
```

### 方案C: WebSocket 实时更新
```javascript
useEffect(() => {
  const unsubscribe = subscribe('ENGINE_STATUS', (data) => {
    setEngines(data); // 实时更新引擎状态
  });
  return unsubscribe;
}, []);
```

---

## 🐛 调试技巧

### 1. React DevTools 查看组件树
```
MainEnginePanel
  ├── EngineDetailPanel (props: engine={ME1})
  ├── EngineCompactPanel (props: engine={ME2})
  ├── EngineCompactPanel (props: engine={ME3})
  └── EngineCompactPanel (props: engine={ME4})
```

### 2. Console 日志追踪
```javascript
// 在 MainEnginePanel.jsx 中添加
useEffect(() => {
  console.log('Active Engine:', activeEngineId);
}, [activeEngineId]);
```

### 3. 检查样式问题
- 打开浏览器开发者工具 (F12)
- 检查元素 → Styles 标签
- 验证 CSS 优先级和尺寸

---

## ✅ 验收清单

- [ ] ME1 显示为详细面板
- [ ] ME2/3/4 显示为折叠面板（竖排）
- [ ] 点击折叠面板可切换
- [ ] 详细面板显示引擎编号、型号、状态
- [ ] 能量箭头正确显示（黄/红/绿）
- [ ] 容量bar正确显示百分比
- [ ] 状态标签颜色正确 (绿/红/灰)
- [ ] 响应式设计在移动设备上正常工作
- [ ] 没有控制台错误

---

## 🆘 常见问题

**Q: 组件不显示？**
A: 检查导入路径和组件名称是否正确

**Q: 样式不生效？**
A: 确保 CSS 文件已导入，检查选择器优先级

**Q: 切换不工作？**
A: 检查 `activeEngineId` 状态是否正确更新

**Q: 颜色不对？**
A: 验证 `status` 属性值 (run/stop/fault) 拼写正确
