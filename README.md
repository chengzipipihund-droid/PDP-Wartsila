# Alarm Management System Demo

一个基于局域网的告警管理系统，包含网页端和移动端界面，数据实时联动。

## 功能特点

- ✅ 网页端桌面界面（完整的告警列表视图）
- ✅ 移动端响应式界面（用户个性化视图）
- ✅ WebSocket实时数据同步
- ✅ 支持多种告警状态和严重程度
- ✅ 按责任人和部门分类显示

## 项目结构

```
Alarm Demo/
├── server/
│   └── index.js          # 后端服务器（Express + WebSocket）
├── public/
│   ├── index.html        # 网页端主页
│   ├── mobile.html       # 移动端页面
│   ├── css/
│   │   ├── web.css       # 网页端样式
│   │   └── mobile.css    # 移动端样式
│   └── js/
│       ├── web.js        # 网页端逻辑
│       └── mobile.js     # 移动端逻辑
├── package.json
└── README.md
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

### 3. 访问界面

- **网页端**: http://localhost:3000
- **移动端**: http://localhost:3000/mobile.html
- **API接口**: http://localhost:3000/api/alarms

### 4. 局域网访问

找到你的本机IP地址（例如：192.168.1.100），然后在同一局域网的其他设备上访问：

- 网页端: http://192.168.1.100:3000
- 移动端: http://192.168.1.100:3000/mobile.html

**注意**: 在移动端访问时，需要修改 `public/js/mobile.js` 和 `public/js/web.js` 中的 `SERVER_URL` 为服务器的实际IP地址。

## 数据格式说明

### Alarm 对象结构

```javascript
{
  id: 1,                    // 唯一标识符
  severity: 'high',         // 严重程度: 'high', 'medium', 'low'
  state: 'active',          // 状态: 'active', 'inactive'
  type: 'Message',          // 类型: 'Message', 'Event', 'Cylinder Fail' 等
  description: '告警描述',   // 告警详细描述
  responsibility: 'ECR',    // 责任部门: 'ECR', 'Bridge' 等
  person: 'Chief Engineer - XXX XXX',  // 责任人
  appearance: '2024-12-20T15:15:41.366Z',  // 出现时间（ISO 8601格式）
  restore: null             // 恢复时间（null表示未恢复）
}
```

### 数据存储建议

当前版本使用内存存储（服务器重启后数据丢失）。对于生产环境，建议：

#### 选项1: JSON文件存储（简单）
- 优点: 简单易用，无需额外依赖
- 缺点: 并发性能较差，不适合大量数据
- 适合: 小型项目，告警数量<1000条

#### 选项2: SQLite数据库（推荐）
- 优点: 轻量级，无需独立服务器，支持SQL查询
- 缺点: 并发写入有限制
- 适合: 中小型项目

```sql
CREATE TABLE alarms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  severity TEXT NOT NULL,
  state TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  responsibility TEXT NOT NULL,
  person TEXT NOT NULL,
  appearance DATETIME NOT NULL,
  restore DATETIME
);
```

#### 选项3: MongoDB（灵活）
- 优点: 灵活的JSON文档存储，易于扩展
- 缺点: 需要独立的MongoDB服务
- 适合: 需要灵活数据结构的项目

#### 选项4: PostgreSQL/MySQL（企业级）
- 优点: 强大的关系型数据库，支持复杂查询
- 缺点: 配置相对复杂
- 适合: 大型企业应用

## API 接口

### GET /api/alarms
获取所有告警

**响应**: 
```json
[
  {
    "id": 1,
    "severity": "high",
    "state": "active",
    ...
  }
]
```

### GET /api/alarms/user/:person
获取特定用户的告警

**参数**: person - 用户角色或姓名

### PUT /api/alarms/:id
更新告警信息

**请求体**: 
```json
{
  "state": "inactive",
  "restore": "2024-12-20T16:00:00.000Z"
}
```

### POST /api/alarms
创建新告警

**请求体**: 
```json
{
  "severity": "high",
  "state": "active",
  "type": "Message",
  "description": "新的告警描述",
  "responsibility": "ECR",
  "person": "Chief Engineer - XXX XXX"
}
```

## WebSocket 消息格式

### 服务器 -> 客户端

#### INIT - 初始化数据
```json
{
  "type": "INIT",
  "data": [/* 所有告警 */]
}
```

#### NEW - 新告警
```json
{
  "type": "NEW",
  "data": {/* 单个告警对象 */}
}
```

#### UPDATE - 更新告警
```json
{
  "type": "UPDATE",
  "data": {/* 更新后的告警对象 */}
}
```

## TODO 功能清单

### 后端
- [ ] 添加用户认证系统
- [ ] 添加数据库连接（推荐SQLite或MongoDB）
- [ ] 添加日志系统记录所有操作
- [ ] 添加确认告警的端点
- [ ] 添加删除/归档告警的端点
- [ ] 添加告警统计信息的端点
- [ ] 添加用户管理功能

### 网页端
- [ ] 添加搜索功能
- [ ] 添加高级过滤器
- [ ] 添加排序功能
- [ ] 添加告警详情弹窗
- [ ] 添加导出功能（CSV/Excel）
- [ ] 添加打印功能
- [ ] 添加响应式设计
- [ ] 添加新告警提示音
- [ ] 添加新告警闪烁动画

### 移动端
- [ ] 添加下拉刷新功能
- [ ] 添加推送通知功能
- [ ] 添加离线缓存功能
- [ ] 实现确认和恢复告警功能
- [ ] 添加震动反馈
- [ ] 添加手势操作
- [ ] 实现页面切换
- [ ] 实现过滤功能

### 数据和安全
- [ ] 实现数据持久化
- [ ] 添加数据备份功能
- [ ] 添加用户权限管理
- [ ] 添加操作审计日志
- [ ] 添加HTTPS支持
- [ ] 添加数据加密

## 技术栈

- **后端**: Node.js + Express + WebSocket (ws)
- **前端**: 原生 HTML/CSS/JavaScript
- **通信**: WebSocket（实时双向通信）+ REST API
- **数据**: 当前使用内存存储（需要替换为持久化存储）

## 开发建议

1. **数据持久化**: 优先实现数据库存储，推荐SQLite（简单）或PostgreSQL（强大）
2. **用户系统**: 添加登录/注册功能，支持多用户
3. **通知系统**: 实现浏览器推送通知和移动端通知
4. **历史记录**: 添加告警历史查询和统计分析
5. **安全性**: 添加身份验证、授权和数据加密

## 许可证

MIT

---

**注意**: 这是一个演示项目，生产环境使用前请完善安全性和数据持久化功能。
