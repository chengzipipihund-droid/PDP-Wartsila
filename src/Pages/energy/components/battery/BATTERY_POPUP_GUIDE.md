# 🔋 Battery (ESS) Pop-up 模块 - 完整文档

## 📋 概述

Battery (ESS) Pop-up 是一个3页可滑动的电池管理系统详细信息展示面板，遵循 ProTouch 设计语言（海事风格、夜间模式、专业配色）。

当用户点击主仪表板的 **BATTERY (ESS)** 卡片时触发，展示：
1. **第1页：电池概览** - SOC 仪表、充放电模式、电源流向、关键数据、BMS状态
2. **第2页：能量消耗** - 分布式甜甜圈图表、6小时能源时间线、关键指标
3. **第3页：健康状态** - SOH 仪表、温度概览、告警/警告列表

---

## 🎨 设计特性

### 颜色系统
```
背景:      #1A1A1A (极深灰)
Header:    #252525 (深灰，渐变)
卡片:      #252525 (深灰)
正常/绿:   #4CAF50 (能源、成功)
警告/黄:   #FFC107 (温度升高)
告警/红:   #F44336 (故障)
蓝:        #64B5F6 (放电)
文本主:    #FFFFFF
文本副:    #AAAAAA
```

### 交互元素
- ✅ 3 页点导航点（可点击切换）
- ✅ 左/右箭头按钮（页面导航）
- ✅ 可点击的图表段落（能源分配）
- ✅ 响应式设计（44px+触摸目标用于海事操作）
- ✅ 平滑动画和过渡
- ✅ 无缝关闭按钮

---

## 📁 文件结构

```
src/Pages/energy/components/battery/
├── BatteryPopup.jsx              ✨ 主 Pop-up 容器（3页）
├── BatteryPopup.css              ✨ Pop-up 样式和动画
├── BatteryGauge.jsx              ✨ SOC 仪表盘组件
├── HealthGauge.jsx               ✨ SOH 不间仪表盘组件
├── EnergyDistributionChart.jsx   ✨ 甜甜圈图表组件
├── BatteryPanel.jsx              🔄 已更新：添加 Pop-up 触发
├── BatteryPanel.css              （现有）
├── BatteryState/                 （现有，6个 SVG）
├── Remaining.svg                 （现有）
└── arrow.svg                     （现有）
```

---

## 🚀 使用方式

### 触发 Pop-up

用户点击主仪表板的 **BATTERY (ESS)** 卡片时自动打开 Pop-up。

```javascript
// 在 BatteryPanel.jsx 中
const [showBatteryPopup, setShowBatteryPopup] = useState(false);

return (
  <>
    <div 
      className="battery-container"
      onClick={() => setShowBatteryPopup(true)}  // ← 点击触发
    >
      {/* Panel content */}
    </div>

    {showBatteryPopup && (
      <BatteryPopup
        onClose={() => setShowBatteryPopup(false)}
        batteryLevel={batteryLevel}
      />
    )}
  </>
);
```

### 关闭 Pop-up

- 点击 **✕** 按钮（右上角）
- 点击外部背景（灰色蒙版）

---

## 📊 Page 1: 电池概览

### SOC 仪表（State of Charge）
- 中心大弧形仪表，显示 0-100% 百分比
- **颜色编码**:
  - 🟢 > 30%: 绿色
  - 🟡 15-30%: 黄色
  - 🔴 < 15%: 红色

### 模式和电源流
- **模式**: CHARGING / DISCHARGING / IDLE / STANDBY
  - 绿色 = 充电
  - 蓝色 = 放电
  - 灰色 = 空闲
  - 橙色 = 待命
- **方向指示**: ↑ (充电) / ↓ (放电) / — (待命)
- **电源流**: +120 kW (充电) 或 −85 kW (放电)

### 数据条
4列紧凑数据显示：
- 电压: 690 V
- 电流: 174 A
- 温度: 32 °C (颜色编码: 绿/黄/红)
- 剩余时间: 20.6h (带树叶图标)

### BMS 状态
- 绿色/红色指示灯 + "BMS ONLINE" / "BMS OFFLINE"

---

## 📊 Page 2: 能量消耗仪表板

### 甜甜圈能源分配图
显示按类别的能源分布：
- **PROPULSION** (推进): 55% - 蓝色
- **HOTEL LOAD** (酒店负载): 25% - 橙色
- **BRIDGE SYSTEMS** (桥系统): 10% - 紫色
- **BOW THRUSTER** (船首推进器): 7% - 绿色
- **AUXILIARY** (辅助): 3% - 红色

中心显示: "83.2 kW TOTAL LOAD"

图例可点击 → 高亮并显示详细值

### 能源时间线（最后6小时）
堆积条形图，显示能源组合的小时变化：
- 🟢 ESS (电池) - 绿色
- ⬛ Main Engine (主机) - 深灰色
- 🐦 Renewable (可再生) - 青色

X轴标签: 04:00, 05:00, ..., 09:00

### 关键指标
- **能源指数**: 160 g/kWh
- **电池贡献**: 35% (总能源中的 ESS 百分比)
- **平均放电率**: −62 kW/h

---

## 📊 Page 3: 健康状态与告警

### SOH 仪表（State of Health）
- 较小的弧形仪表，显示电池健康百分比 (0-100%)
- 下方显示:
  - 循环次数: 1,247 cycles
  - 预期寿命: Estimated 5+ years

### 温度概览
- 水平渐变条: 绿 (28°C) → 黄 → 红 (38°C 临界)
- 标记: Min / Current / Max

```
Min 28°C — Current 32°C — Max 38°C
[===|===|====]  (绿→黄→红渐变)
```

### 告警和警告列表
- 无告警时: ✓ "No active alerts" (绿色)
- 有告警时显示列表:
  - ⚠ (黄色钻石) - 警告
  - ✓ (绿色勾号) - 成功
  - 时间戳 (HH:MM)
  - 描述信息

例子:
```
⚠ 09:42 — Temperature approaching upper limit
✓ 08:15 — Insulation test passed
```

---

## 🧩 组件 API

### BatteryPopup

```javascript
<BatteryPopup
  onClose={function}          // 关闭回调
  batteryLevel={number}       // 电池百分比 0-100 (可选)
  soc={number}                // SOC 仪表值 (可选，默认 76)
  socMode={string}            // 模式: 'CHARGING' | 'DISCHARGING' | 'IDLE' | 'STANDBY'
  totalLoad={number}          // 总负载 kW (可选)
  bmsOnline={boolean}         // BMS 连接状态 (可选)
/>
```

### BatteryGauge

```javascript
<BatteryGauge value={number} />  // 0-100，自动选择颜色
```

### HealthGauge

```javascript
<HealthGauge value={number} />  // 0-100，显示健康百分比
```

### EnergyDistributionChart

```javascript
<EnergyDistributionChart
  data={{
    propulsion: 55,
    hotelLoad: 25,
    bridgeSystems: 10,
    bowThruster: 7,
    auxiliary: 3,
  }}
/>
```

---

## 🔧 集成指南

### 1. 基础集成（已完成）

```javascript
// BatteryPanel.jsx
import BatteryPopup from './BatteryPopup';
import { useState } from 'react';

function BatteryPanel({ batteryLevel }) {
  const [showBatteryPopup, setShowBatteryPopup] = useState(false);

  return (
    <>
      <div 
        className="battery-container"
        onClick={() => setShowBatteryPopup(true)}
      >
        {/* Battery display */}
      </div>

      {showBatteryPopup && (
        <BatteryPopup
          onClose={() => setShowBatteryPopup(false)}
          batteryLevel={batteryLevel}
        />
      )}
    </>
  );
}
```

### 2. 连接真实数据

在 `BatteryPopup.jsx` 中的 `mockData` 对象中替换为实时数据：

```javascript
// 从 WebSocket / Store / Props 获取数据
const realData = {
  voltage: websocketData.voltage,           // 来自 UDP/WebSocket
  current: websocketData.current,
  temperature: websocketData.temp,
  remainingTime: calculateEstimated(),      // 基于 SOC 和放电率
  mode: batteryState.mode,                  // 'CHARGING' | 'DISCHARGING'
  powerFlow: batteryState.power,            // kW (正/负)
  soh: batteryState.soh,                    // State of Health %
  cycles: batteryState.cycleCount,
  alerts: batteryAlerts.list,               // [{type, time, message}]
  // ...
};
```

### 3. 使用 Zustand Store

```javascript
// stores/batteryStore.js
import { create } from 'zustand';

export const useBatteryStore = create((set) => ({
  batteryData: {
    soc: 76,
    voltage: '690 V',
    current: '174 A',
    // ...
  },
  updateBatteryData: (data) => set({ batteryData: data }),
}));

// BatteryPopup.jsx
import { useBatteryStore } from '../stores/batteryStore';

function BatteryPopup({ onClose }) {
  const batteryData = useBatteryStore((state) => state.batteryData);
  // 使用 batteryData 替代 mockData
}
```

### 4. 使用 WebSocket

```javascript
useEffect(() => {
  const unsubscribe = subscribe('BATTERY_DATA', (data) => {
    // 更新 mockData 或状态
    setRealTimeData(data);
  });
  return unsubscribe;
}, []);
```

---

## 🎨 自定义样式

### 改变颜色主题

编辑 `BatteryPopup.css` 中的颜色变量：

```css
/* 改变主题色 */
const C = {
  panelBg: '#1A1A1A',        // ← 改为其他深色
  green: '#4CAF50',          // ← 改为其他绿色
  yellow: '#FFC107',         // ← 改为其他黄色
  red: '#F44336',            // ← 改为其他红色
};
```

### 改变动画速度

```css
.battery-popup-container {
  animation: slideUp 0.3s ease-out;  /* ← 改为 0.5s 或其他 */
}

.battery-status-dot {
  animation: pulse 2s ease-in-out infinite;  /* ← 改为 3s 或其他 */
}
```

### 改变仪表颜色阈值

在 `BatteryGauge.jsx` 中：

```javascript
let arcColor = '#4CAF50';              // 绿色
if (normalizedValue < 15) arcColor = '#F44336';   // < 15% = 红色
else if (normalizedValue < 30) arcColor = '#FFC107'; // < 30% = 黄色
```

---

## 📱 响应式设计

- **桌面 (>768px)**: 完整 500px 宽度
- **平板 (768px)**: 95% 宽度
- **手机**: 数据表格从 4 列变为 2 列

所有按钮 ≥ 44px，符合海事触摸标准。

---

## ✅ 测试清单

- [ ] 点击 BATTERY (ESS) 卡片打开 Pop-up
- [ ] 3 个页面可通过点导航点切换
- [ ] 左/右箭头按钮可翻页
- [ ] SOC 仪表显示正确颜色（绿/黄/红）
- [ ] 能源分配图表可点击（高亮段落）
- [ ] 温度条显示正确的渐变色
- [ ] 告警列表显示（或"无告警"消息）
- [ ] ✕ 按钮和背景点击可关闭 Pop-up
- [ ] BMS 状态指示灯闪烁
- [ ] 在手机上测试响应式布局
- [ ] 无控制台错误

---

## 🐛 调试

### 查看 Mock 数据

在 `BatteryPopup.jsx` 中的 `mockData` 对象修改值进行测试：

```javascript
const mockData = {
  voltage: '690 V',           // ← 修改测试
  current: '174 A',
  temperature: 32,            // ← 改为 15 或 40 测试颜色
  soc: 20,                    // ← 改为 10、50、90 测试仪表
  mode: 'DISCHARGING',        // ← 改为其他模式
  alerts: [/* 修改告警列表 */],
  // ...
};
```

### 启用控制台日志

```javascript
// BatteryPopup.jsx
useEffect(() => {
  console.log('Current Page:', currentPage);
  console.log('Mock Data:', mockData);
}, [currentPage, mockData]);
```

---

## 🚀 下一步

1. ✅ 基础框架完成
2. 📌 集成真实 WebSocket 数据
3. 📌 连接到 Zustand energyStore
4. 📌 添加历史数据图表
5. 📌 实现声音告警
6. 📌 添加导出功能（PDF/CSV）

---

## 📞 常见问题

**Q: 如何改变页面背景色？**
A: 编辑 `.battery-popup-container { background: #1A1A1A; }`

**Q: 如何禁用 Pop-up 动画？**
A: 在 CSS 中设置 `animation: none;`

**Q: 如何添加更多页面？**
A: 增加 `currentPage` 状态的范围和相应的 JSX 条件渲染

**Q: 仪表不显示？**
A: 检查 SVG 尺寸（viewBox），确保 SVG 正确渲染

---

**🎉 Battery Pop-up 系统已准备就绪！**
