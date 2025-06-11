# 🚀 OpenChatAgent 使用说明

## 📋 快速开始

### 1. 启动开发环境

```bash
./start-dev.sh
```

### 2. 访问前端页面

```
http://localhost:5173
```

### 3. 停止开发环境

```bash
# 方法1: 在启动终端按 Ctrl+C (推荐)
# 方法2: 运行清理脚本
./scripts/kill-dev.sh
```

## 🔧 服务端口说明

| 服务         | 端口 | 说明                        |
| ------------ | ---- | --------------------------- |
| chat-ui      | 5173 | 前端聊天界面                |
| chat-core    | 3001 | 消息网关和 WebSocket 服务   |
| ai-service   | 3002 | AI 服务 (阿里百炼 API 封装) |
| chat-session | 3003 | 会话管理服务 (Redis)        |

## 💬 使用聊天功能

### 基本对话

1. 打开浏览器访问 http://localhost:5173
2. 等待 WebSocket 连接成功 (状态显示为 "Connected")
3. 在输入框输入消息并发送
4. AI 会自动回复

### 代理切换

- **切换到人工客服**: 点击 "Switch to Human Agent" 按钮
- **切换回 AI**: 点击 "Switch to AI Agent" 按钮

### 新建会话

- 点击 "New Session" 按钮重新开始对话

## 🔍 故障排除

### 常见问题

#### 1. WebSocket 连接失败

**现象**: 状态显示 "Disconnected"
**解决方案**:

```bash
# 检查chat-core服务是否运行
curl http://localhost:3001/api/health

# 如果服务未运行，重启
./scripts/kill-dev.sh
./start-dev.sh
```

#### 2. AI 回复异常

**现象**: 发送消息后没有 AI 回复
**解决方案**:

```bash
# 检查AI服务状态
curl http://localhost:3002/health

# 检查会话服务状态
curl http://localhost:3003/health
```

#### 3. 进程无法停止

**现象**: Ctrl+C 后仍有进程运行
**解决方案**:

```bash
# 强制清理所有进程
./scripts/kill-dev.sh
```

#### 4. 端口被占用

**现象**: 启动时提示端口已被使用
**解决方案**:

```bash
# 查看端口占用情况
lsof -i :5173
lsof -i :3001
lsof -i :3002
lsof -i :3003

# 清理进程
./scripts/kill-dev.sh
```

### 调试方法

#### 1. 查看服务日志

启动脚本会显示所有服务的实时日志，注意观察错误信息。

#### 2. 检查浏览器控制台

- 打开浏览器开发者工具 (F12)
- 查看 Console 面板的错误信息
- 查看 Network 面板确认只有 WebSocket 连接，没有 HTTP 请求

#### 3. 测试 WebSocket 连接

```bash
# 使用内置测试脚本
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');
ws.on('open', () => console.log('✅ WebSocket连接成功'));
ws.on('error', (e) => console.log('❌ WebSocket连接失败:', e.message));
setTimeout(() => ws.close(), 1000);
"
```

## 📊 系统架构

```
前端 (React + ProChat)
    ↕️ WebSocket
消息网关 (chat-core:3001)
    ↕️ HTTP API
AI服务 (ai-service:3002) + 会话服务 (chat-session:3003)
    ↕️
Redis 数据存储
```

## ⚙️ 配置说明

### 环境变量

主要配置文件: `.env`

```bash
# AI服务配置
DASHSCOPE_API_KEY=your_api_key_here  # 阿里百炼API密钥

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 服务端口配置
CHAT_CORE_PORT=3001
AI_SERVICE_PORT=3002
CHAT_SESSION_PORT=3003
CHAT_UI_PORT=5173
```

### Demo 模式

如果没有配置真实的 API 密钥，系统会自动使用 Demo 模式，AI 会返回预设的模拟回复。

## 🎯 开发建议

### 1. 代码修改后自动重启

所有服务都使用 `nodemon` 监控文件变化，修改代码后会自动重启。

### 2. 前端热更新

前端使用 Vite 开发服务器，支持热模块替换 (HMR)。

### 3. 日志查看

所有服务的日志会在启动终端中实时显示，便于调试。

---

**最后更新**: 2025-06-11
**版本**: v1.5.0
