# Lever 1 Mapping

## Quick Start

确保你已安装 [Node.js](https://nodejs.org/)（v18+）。

```bash
# 1. 解压后进入项目
cd lever-app

# 2. 安装依赖
npm install

# 3. 启动
npm run dev
```

浏览器自动打开 `http://localhost:3000`。

## 项目结构

```
lever-app/
├── index.html                    ← 入口 HTML
├── package.json                  ← 依赖配置
├── vite.config.js                ← Vite 构建配置
└── src/
    ├── main.jsx                  ← React 挂载点
    └── components/
        ├── config.js             ← 颜色、常量、AI接口
        ├── index.jsx             ← 主面板 (450×660)
        ├── LeverCanvas.jsx       ← 核心SVG可视化
        ├── AIMarker.jsx          ← AI建议箭头+tooltip
        ├── RPMGauge.jsx          ← RPM仪表
        ├── LeverController.jsx   ← 鼠标拖拽操纵杆
        ├── TopBar.jsx            ← 模式切换
        ├── SpeedLabel.jsx        ← 速度方向提示
        └── BottomBar.jsx         ← 底部图标
```

## 接入硬件数据

当真实 lever 硬件就绪后，在 `index.jsx` 中替换 `LeverController`：

```jsx
// 示例：WebSocket 接入
useEffect(() => {
  const ws = new WebSocket('ws://your-lever-server');
  ws.onmessage = (e) => {
    const { position } = JSON.parse(e.data);
    handleLeverChange(position); // -100 to +100
  };
  return () => ws.close();
}, []);
```

## 接入 AI Energy Model

编辑 `config.js` 中的 `fetchAISuggestion()`，替换 mock 为你的真实 API：

```js
export async function fetchAISuggestion(currentLeverPos, currentRPM) {
  const res = await fetch('https://your-ai-api/suggest', {
    method: 'POST',
    body: JSON.stringify({ leverPos: currentLeverPos, rpm: currentRPM }),
  });
  return await res.json();
}
```
