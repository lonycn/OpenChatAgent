# 🔧 故障排除指南

## 🚨 常见问题及解决方案

### 1. ProChat HTTP 请求问题

#### 问题现象

- 浏览器控制台显示: `Uncaught (in promise) Error: HTTP requests are disabled`
- HTTP 请求状态显示 `pending`
- 控制台出现 `renderItems undefined` 错误

#### 问题原因

ProChat 组件内部仍然尝试发送 HTTP 请求，即使设置了 `request={false}`。

#### 解决方案

**方案 1: 使用拦截器阻止 HTTP 请求 (当前采用)**

```javascript
// 在组件文件开头添加拦截器
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const url = args[0];
  if (
    typeof url === "string" &&
    (url.includes("/api/openai/chat") || url.includes("openai"))
  ) {
    console.log("🚫 Blocked HTTP request to:", url);
    return Promise.reject(
      new Error("HTTP requests blocked - using WebSocket only")
    );
  }
  return originalFetch.apply(this, args);
};

// 拦截axios请求
const axiosInterceptor = axios.interceptors.request.use(
  (config) => {
    if (
      config.url &&
      (config.url.includes("/api/openai/chat") || config.url.includes("openai"))
    ) {
      console.log("🚫 Blocked axios request to:", config.url);
      return Promise.reject(
        new Error("HTTP requests blocked - using WebSocket only")
      );
    }
    return config;
  },
  (error) => Promise.reject(error)
);

<ProChat
  request={false}
  // ... 其他配置
/>;
```

**方案 2: 使用永远 pending 的 Promise**

```javascript
<ProChat
  request={async () => {
    console.log("ProChat HTTP request blocked - using WebSocket mode");
    return new Promise(() => {}); // 永远不resolve，避免错误处理
  }}
  // ... 其他配置
/>
```

**方案 2: 返回空响应**

```javascript
<ProChat
  request={async () => {
    return {
      data: {
        choices: [
          {
            message: {
              content: "WebSocket模式已启用",
            },
          },
        ],
      },
    };
  }}
  // ... 其他配置
/>
```

**方案 3: 完全禁用 (可能不生效)**

```javascript
<ProChat
  request={false}
  // ... 其他配置
/>
```

### 2. WebSocket 连接问题

#### 问题现象

- 状态显示 "Disconnected"
- 无法发送或接收消息

#### 解决方案

```bash
# 1. 检查chat-core服务
curl http://localhost:3001/api/health

# 2. 重启服务
./scripts/kill-dev.sh
./start-dev.sh

# 3. 检查端口占用
lsof -i :3001
```

### 3. AI 回复异常

#### 问题现象

- 发送消息后没有 AI 回复
- 收到错误消息

#### 解决方案

```bash
# 检查AI服务状态
curl http://localhost:3002/health

# 检查会话服务状态
curl http://localhost:3003/health

# 查看服务日志
# 在启动终端中观察错误信息
```

### 4. 进程无法停止

#### 问题现象

- Ctrl+C 后仍有进程运行
- 端口被占用

#### 解决方案

```bash
# 强制清理所有进程
./scripts/kill-dev.sh

# 检查特定端口
lsof -i :5173
lsof -i :3001
lsof -i :3002
lsof -i :3003

# 手动杀死进程
kill -9 <PID>
```

### 5. Redis 连接问题

#### 问题现象

- 会话服务启动失败
- 无法保存会话状态

#### 解决方案

```bash
# 检查Redis是否运行
redis-cli ping

# 启动Redis (macOS)
brew services start redis

# 启动Redis (Ubuntu)
sudo systemctl start redis-server

# 手动启动Redis
redis-server
```

## 🧪 调试工具

### 1. WebSocket 连接测试

```bash
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');
ws.on('open', () => console.log('✅ WebSocket连接成功'));
ws.on('error', (e) => console.log('❌ WebSocket连接失败:', e.message));
setTimeout(() => ws.close(), 1000);
"
```

### 2. 服务健康检查

```bash
# 检查所有服务
curl -s http://localhost:3001/api/health && echo
curl -s http://localhost:3002/health && echo
curl -s http://localhost:3003/health && echo
curl -s http://localhost:5173 > /dev/null && echo "前端服务正常"
```

### 3. 进程检查

```bash
# 查看相关进程
ps aux | grep -E "(npm|nodemon|vite)" | grep -v grep

# 查看端口占用
netstat -tulpn | grep -E "(3001|3002|3003|5173)"
```

## 📊 性能优化

### 1. 减少控制台警告

ProChat 组件可能会产生一些 Ant Design 的废弃警告，这些是正常的，不影响功能：

- `overlayClassName is deprecated`
- `onDropdownVisibleChange is deprecated`
- `findDOMNode is deprecated`

### 2. WebSocket 连接优化

- 使用 `useMemo` 缓存事件处理器
- 避免在 React 严格模式下重复连接
- 正确处理组件卸载时的清理

### 3. 内存泄漏预防

- 确保 WebSocket 连接在组件卸载时正确关闭
- 清理定时器和事件监听器
- 避免在异步操作中更新已卸载组件的状态

## 🔍 日志分析

### 正常启动日志

```
✅ Node.js 版本: v18.20.8
✅ npm 版本: 10.8.2
✅ Redis 连接正常
✅ Session Service initialized with Redis
✅ AI Service initialized with DashScope API
ConnectionManager initialized.
MessageRouter initialized with HTTP API calls.
WebSocket server initialized and attached to HTTP server.
Chat-core HTTP server running on port 3001
```

### 正常 WebSocket 连接日志

```
WebSocket: Client <id> (guest) connected from ::1. Total clients: 1
WebSocket: No authentication token provided, using guest mode
ConnectionManager: Connection <id> added. Total: 1
```

### 异常日志示例

```
❌ Redis connection failed
❌ AI Service initialization failed
❌ WebSocket connection error
❌ Port already in use
```

---

**最后更新**: 2025-06-11
**版本**: v1.5.0
