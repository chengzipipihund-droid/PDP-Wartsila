# 🔋 Battery Pop-up - 快速参考

## 📦 新建文件

| 文件 | 用途 |
|------|------|
| `BatteryPopup.jsx` | 主 Pop-up 容器（3页可滑动）|
| `BatteryPopup.css` | Pop-up 样式、动画、响应式 |
| `BatteryGauge.jsx` | SOC 仪表盘（0-100%） |
| `HealthGauge.jsx` | SOH 仪表盘（健康百分比） |
| `EnergyDistributionChart.jsx` | 甜甜圈能源分布图表 |
| `BATTERY_POPUP_GUIDE.md` | 完整功能文档 |

## 🔄 修改文件

| 文件 | 改动 |
|------|------|
| `BatteryPanel.jsx` | 添加 onClick 触发 BatteryPopup |

## 🎨 3 页结构

### Page 1: 电池概览
```
┌─────────────────────────────┐
│ BATTERY (ESS)    [✕]        │
├─────────────────────────────┤
│   [SOC 仪表 76%]            │
│   DISCHARGING ↓ −85 kW      │
│ Voltage│Current│Temp│Time   │
│  690V  │ 174A │ 32°C│20.6h  │
└─────────────────────────────┘
```

### Page 2: 能量消耗
```
┌─────────────────────────────┐
│ ENERGY CONSUMPTION          │
│  [甜甜圈图表 83.2kW Total]  │
│  PROPULSION: 55% 🔵        │
│  HOTEL LOAD: 25% 🟠        │
│ [6小时能源时间线图]         │
│ Index: 160g/kWh            │
└─────────────────────────────┘
```

### Page 3: 健康状态
```
┌─────────────────────────────┐
│ BATTERY STATUS              │
│ [SOH 仪表 94%]              │
│ Cycles: 1,247               │
│ [温度渐变条]                │
│ Min 28°C — Max 38°C        │
│ ⚠ 09:42 — 温度升高        │
│ ✓ 08:15 — 测试通过         │
└─────────────────────────────┘
```

## 🎯 快速开始

### 1. 查看效果
```bash
npm dev
# 打开 Energy 页面 → 点击 BATTERY (ESS) 卡片
```

### 2. 触发方式
- 点击主仪表板的 **BATTERY (ESS)** 卡片
- Pop-up 在中心显示，带半透明背景
- 点击 ✕ 按钮或外部背景关闭

### 3. 页面导航
- 🔵 三个点导航按钮：点击切换
- 🔘 左/右箭头：上/下一页
- 🎢 滑动（手机）：也可切换页面

## 🎨 颜色速查

| 状态 | 颜色 | Hex |
|------|------|-----|
| 充电 | 🟢 绿 | #4CAF50 |
| 放电 | 🔵 蓝 | #64B5F6 |
| 正常温度 | 🟢 绿 | #4CAF50 |
| 升高温度 | 🟡 黄 | #FFC107 |
| 危险/故障 | 🔴 红 | #F44336 |

## 📊 示例数据结构

```javascript
{
  voltage: '690 V',
  current: '174 A',
  temperature: 32,              // °C
  remainingTime: '20.6h',
  mode: 'DISCHARGING',          // CHARGING | DISCHARGING | IDLE | STANDBY
  powerFlow: '-85 kW',          // 负 = 放电
  soc: 76,                      // State of Charge %
  soh: 94,                      // State of Health %
  cycles: 1247,
  bmsOnline: true,
  consumptionData: {
    propulsion: 55,             // %
    hotelLoad: 25,
    bridgeSystems: 10,
    bowThruster: 7,
    auxiliary: 3,
  },
  alerts: [
    { type: 'warning', time: '09:42', message: '温度升高' },
    { type: 'success', time: '08:15', message: '测试通过' },
  ],
}
```

## 🔧 自定义示例

### 改变 SOC 仪表颜色阈值
```javascript
// BatteryGauge.jsx
if (normalizedValue < 20) arcColor = '#F44336';   // 20% 以下红色
else if (normalizedValue < 50) arcColor = '#FFC107'; // 50% 以下黄色
```

### 改变总体背景色
```css
/* BatteryPopup.css */
.battery-popup-container {
  background: #0D0D0D;  /* 更深的黑 */
}
```

### 添加能源分布类别
```javascript
// EnergyDistributionChart.jsx
cooperativeChiller: 5,    // ← 新增
wasteTurbo: 3,           // ← 新增
```

## 🧪 测试 Pop-up

### 模拟不同场景
编辑 `BatteryPopup.jsx` 中的 `mockData` 对象：

```javascript
// 低电量告警
soc: 12,  // < 15% = 红色仪表

// 高温告警
temperature: 42,  // > 38°C = 红色

// 待命模式
mode: 'STANDBY',  // 显示 "— STANDBY"

// 充电
mode: 'CHARGING',
powerFlow: '+120 kW',  // 正数 = 充电
```

热重载会立即更新显示 ✨

## 📱 响应式检查

### 桌面
- 完整 500px 宽度
- 4 列数据表格

### 平板
- 90% 宽度
- 4 列数据表格

### 手机
- 95% 宽度
- 2 列数据表格
- 自动换行

## 🚨 故障排查

| 问题 | 解决方案 |
|------|---------|
| Pop-up 不显示 | 检查 BatteryPanel 中的 `setShowBatteryPopup(true)` |
| 仪表不显示 | 验证 SVG viewBox 尺寸，检查 `value` props |
| 颜色不对 | 检查 CSS 文件是否正确导入 |
| 图表显示错误 | 验证 `data` props 结构（propulsion/hotelLoad/...）|
| 触摸响应差 | 确保按钮 ≥ 44px 宽高 |

## ✅ 验收清单

- [ ] 点击 BATTERY 卡片打开 Pop-up
- [ ] Page 1：SOC 仪表显示 (颜色正确)
- [ ] Page 1：数据条显示 (Voltage/Current/Temp/Time)
- [ ] Page 2：甜甜圈图显示
- [ ] Page 2：能源时间线显示
- [ ] Page 3：SOH 仪表显示
- [ ] Page 3：温度条显示渐变
- [ ] Page 3：告警列表显示
- [ ] 页面导航点工作
- [ ] 左/右箭头工作
- [ ] 关闭按钮工作
- [ ] 无控制台错误

## 🎓 下一步集成

### 1. 连接 WebSocket 数据
```javascript
useEffect(() => {
  subscribe('BATTERY_STATUS', (data) => {
    // 更新 mockData
  });
}, []);
```

### 2. 连接 Zustand Store
```javascript
const batteryData = useBatteryStore(state => state.batteryData);
```

### 3. 实时更新
使用 `setInterval` 每秒更新数据

### 4. 历史数据
添加第 4 页显示历史 SOC/温度曲线

---

**🎉 电池 Pop-up 系统准备就绪！**
