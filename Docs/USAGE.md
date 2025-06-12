# 🚀 OpenChatAgent 使用说明

## 📋 快速开始

### 1. 启动开发环境

```bash
./start-dev.sh
```

### 2. 访问前端页面

```
http://localhost:8001
```

### 3. 停止开发环境

```bash
# 方法1: 在启动终端按 Ctrl+C (推荐)
# 方法2: 运行清理脚本
./scripts/kill-dev.sh
```

## 🔧 服务端口说明

| 服务          | 端口 | 说明                        |
| ------------- | ---- | --------------------------- |
| chat-ui       | 8001 | 用户前端聊天界面            |
| chat-core     | 8002 | 消息网关和 WebSocket 服务   |
| ai-service    | 8003 | AI 服务 (阿里百炼 API 封装) |
| chat-session  | 8004 | 会话管理服务 (Redis)        |
| chat-admin    | 8005 | 管理后台 API                |
| chat-admin-ui | 8006 | 管理后台前端界面            |

## 💬 使用聊天功能

### 基本对话

1. 打开浏览器访问 http://localhost:8001
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
curl http://localhost:8002/api/health

# 如果服务未运行，重启
./scripts/kill-dev.sh
./start-dev.sh
```

#### 2. AI 回复异常

**现象**: 发送消息后没有 AI 回复
**解决方案**:

```bash
# 检查AI服务状态
curl http://localhost:8003/health

# 检查会话服务状态
curl http://localhost:8004/health
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
lsof -i :8001
lsof -i :8002
lsof -i :8003
lsof -i :8004
lsof -i :8005
lsof -i :8006

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
const ws = new WebSocket('ws://localhost:8002');
ws.on('open', () => console.log('✅ WebSocket连接成功'));
ws.on('error', (e) => console.log('❌ WebSocket连接失败:', e.message));
setTimeout(() => ws.close(), 1000);
"
```

## 📊 系统架构

```
前端界面 (React + ProChat:8001)
    ↕️ WebSocket
消息网关 (chat-core:8002)
    ↕️ HTTP API
AI服务 (ai-service:8003) + 会话服务 (chat-session:8004)
    ↕️
Redis 数据存储

管理后台 (Ant Design Pro:8006)
    ↕️ HTTP API
管理API (chat-admin:8005)
```

## ⚙️ 配置说明

### 环境变量

主要配置文件: `.env`

```bash
# AI服务配置
DASHSCOPE_API_KEY=sk-your_api_key_here  # 阿里百炼API密钥

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 服务端口配置 (800x 系列统一管理)
CHAT_UI_PORT=8001
CHAT_CORE_PORT=8002
AI_SERVICE_PORT=8003
CHAT_SESSION_PORT=8004
CHAT_ADMIN_PORT=8005
CHAT_ADMIN_UI_PORT=8006
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

**最后更新**: 2025-01-17
**版本**: v2.0.0 - 端口统一化更新
