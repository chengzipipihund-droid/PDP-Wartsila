# 🚀 Main Engine 模块 - 快速参考卡片

## 📦 你现在拥有的

```
详细面板 (EngineDetailPanel)          折叠面板 (EngineCompactPanel) ×3
┌──────────────────────┐            ┌──────────────┐
│ ME1 Wärtsilä 46F     │            │ ME2 [RUN]    │
│ [RUN]                │            │      ●       │
├──────────────────────┤            ├──────────────┤
│ [Icon] [↓↓] 75%[█]   │            │ ME3 [STOP]   │
│                      │            │      ●       │
│                 [✕]  │            ├──────────────┤
└──────────────────────┘            │ ME4 [RUN]    │
                                    │      ●       │
Click → Swap              └──────────────────────┘
```

## ⚡ 核心特性

| 特性 | 说明 |
|------|------|
| **引擎信息** | 编号、型号、状态 |
| **能量指示** | 黄/红/绿箭头（下/下/上） |
| **容量显示** | 垂直进度条 (0-100%) |
| **交互** | 点击折叠面板切换 |
| **动画** | 闪烁、脉冲、渐变效果 |
| **响应式** | 桌面/平板/手机适配 |

## 🎨 颜色速查表

```
状态标签:          能量箭头:           指示灯:
RUN     🟢 绿色    Normal  🟨 黄色    Full   🔴 红色
STOP    ⚫ 灰色    Rapid   🔴 红色    Normal 🟨 黄色
FAULT   🔴 红色    Input   🟢 绿色    Idle   ⚫ 灰色
```

## 🔧 修改数据（在 MainEnginePanel.jsx）

```javascript
// 更改状态
{
  id: 'ME1',
  status: 'run',        // ← 改为 'stop' 或 'fault'
  load: 75,             // ← 改为 0-100 的任意值
  energyFlow: {
    normal: true,       // ← togglehown/off
    rapid: false,       // ← show red arrow
    input: false,       // ← show green arrow
  }
}
```

热重载: Vite 自动更新 ✨

## 📱 在不同设备上看

- **宽屏 (>1024px)**: 详细面板占70%, 折叠面板竖排占30%
- **平板 (768-1024px)**: 比例自动调整，折叠面板变窄
- **手机 (<768px)**: 详细面板上，折叠面板横排

## ✅ 验收清单

```
基本功能:
  ☑ 详细面板显示 ME1
  ☑ 折叠面板显示 ME2/3/4
  ☑ 点击切换工作正常

显示内容:
  ☑ 引擎编号正确
  ☑ 型号显示为 Wärtsilä 46F
  ☑ 状态标签有正确颜色
  ☑ 能量箭头显示正确方向和颜色
  ☑ 容量条显示百分比
  
动画&互动:
  ☑ 容量条有闪烁动画
  ☑ 红色箭头有脉冲效果
  ☑ 故障状态有闪烁效果
  ☑ 按钮悬停有视觉反馈
  ☑ 没有控制台错误
```

## 🚀 下一步行动

### 1️⃣ 查看效果
```bash
npm dev
# 打开 Energy 页面 → 查看 MAIN ENGINE 面板
```

### 2️⃣ 修改数据测试
编辑 `MainEnginePanel.jsx` 中的 `ENGINE_DATA`, 改变:
- 状态 (run/stop/fault)
- 负载 (0-100)
- 能量流向 (true/false toggle)

### 3️⃣ 连接真实数据
- 查看 [README.md](./README.md) → "集成指南"
- 选择三种方式之一（Props/Store/WebSocket）

## 📂 文件清单

| 文件 | 用途 | 状态 |
|------|------|------|
| MainEnginePanel.jsx | 主容器 | ✨ 重写 |
| EngineDetailPanel.jsx | 详细面板 | ✨ 新建 |
| EngineCompactPanel.jsx | 折叠面板 | ✨ 新建 |
| EngineDetailPanel.css | 详细样式 | ✨ 新建 |
| EngineCompactPanel.css | 折叠样式 | ✨ 新建 |
| MainEnginePanel.css | 容器样式 | 🔄 更新 |
| ME1-4.svg | 原始SVG | 📦 保留 |

## 💡 常见问题

**Q: 如何改变引擎状态颜色？**
A: 修改 CSS 中的:
```css
.engine-status.status-run { background: #4FBF65; }
.engine-status.status-fault { background: #E74C3C; }
```

**Q: 如何加快容量条动画？**
A: 编辑 CSS:
```css
.capacity-bar-fill {
  transition: height 0.3s ease;  /* ← 改为 0.2s 或其他 */
}
```

**Q: 如何关闭shimmer闪烁效果？**
A: 删除或注释 CSS:
```css
.capacity-bar-fill::after {
  /* animation: shimmer 3s infinite; */
}
```

## 🎓 学习路径

1. **理解结构** → 读 [README.md](./README.md)
2. **动手测试** → 按 [TESTING.md](./TESTING.md) 指导
3. **修改数据** → 编辑 `ENGINE_DATA`
4. **接入数据** → 按集成指南连接后端
5. **优化UI** → 根据需求调整样式

## 📞 遇到问题?

1. 检查浏览器 F12 → Console (查看错误)
2. 查看对应的 CSS 文件
3. 验证 `ENGINE_DATA` 数据结构
4. 查看 [TESTING.md](./TESTING.md) 的调试部分

---

**🎉 系统已准备好！现在可以进行实际应用了！**
