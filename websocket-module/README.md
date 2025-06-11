# 🚀 WebSocket独立模块

一个专为聊天应用设计的高性能、可扩展的WebSocket管理模块，解决"对话后没有返回"等实时通信问题。

## ✨ 特性

- 🔧 **模块化设计**: 独立的WebSocket管理，低耦合高内聚
- 🛡️ **错误恢复**: 完善的错误处理和自动重连机制
- 📊 **实时监控**: 内置性能监控和健康检查
- 🔌 **插件系统**: 支持自定义插件扩展功能
- 🔐 **安全认证**: JWT认证和权限管理
- ⚡ **高性能**: 优化的连接池和消息处理
- 📈 **可扩展**: 支持水平扩展和负载均衡

## 🎯 解决的问题

1. **对话无响应**: 统一的消息处理和错误恢复
2. **模块耦合**: WebSocket逻辑完全独立
3. **错误追踪**: 详细的错误日志和监控
4. **性能瓶颈**: 优化的连接管理和消息路由
5. **扩展困难**: 插件化架构支持功能扩展

## 📦 安装

```bash
npm install ws uuid jsonwebtoken validator
```

## 🚀 快速开始

### 基础用法

```javascript
const WebSocketModule = require('./websocket-module');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket管理器
const wsManager = WebSocketModule.create({
  server: server,
  maxConnections: 1000,
  heartbeat: {
    interval: 30000,
    timeout: 5000
  }
});

// 注册消息处理器
wsManager.registerHandler('text', async (message, connectionInfo) => {
  return {
    type: 'text',
    content: {
      text: `Echo: ${message.content.text}`,
      timestamp: new Date().toISOString()
    }
  };
});

// 启动服务
server.listen(3001, async () => {
  await wsManager.start();
  console.log('WebSocket服务已启动在端口3001');
});
```

### 与Express集成

```javascript
const express = require('express');
const http = require('http');
const WebSocketModule = require('./websocket-module');

const app = express();
const server = http.createServer(app);

// 创建WebSocket服务
const wsManager = WebSocketModule.create({
  server: server,
  path: '/ws'
});

// 健康检查端点
app.get('/api/websocket/health', (req, res) => {
  res.json(wsManager.getHealth());
});

// 指标端点
app.get('/api/websocket/metrics', (req, res) => {
  res.json(wsManager.getMetrics());
});

server.listen(3001);
```

## 📚 API文档

### WebSocketManager

#### 创建实例

```javascript
const wsManager = WebSocketModule.create(options);
```

**配置选项:**

```javascript
{
  server: httpServer,           // HTTP服务器实例
  port: 3001,                  // 端口号（可选）
  path: '/ws',                 // WebSocket路径
  maxConnections: 1000,        // 最大连接数
  heartbeat: {
    interval: 30000,           // 心跳间隔（毫秒）
    timeout: 5000              // 心跳超时（毫秒）
  },
  message: {
    timeout: 30000,            // 消息超时（毫秒）
    maxRetries: 3              // 最大重试次数
  },
  plugins: ['monitoring'],     // 启用的插件
  middleware: ['validation']   // 启用的中间件
}
```

#### 核心方法

```javascript
// 启动WebSocket服务
await wsManager.start();

// 停止WebSocket服务
await wsManager.stop();

// 注册消息处理器
wsManager.registerHandler('messageType', async (message, connectionInfo) => {
  // 处理逻辑
  return response;
});

// 发送消息到指定连接
wsManager.sendToConnection(connectionId, message);

// 广播消息到所有连接
wsManager.broadcast(message);

// 获取健康状态
const health = wsManager.getHealth();

// 获取性能指标
const metrics = wsManager.getMetrics();
```

### 消息格式

#### 标准消息结构

```javascript
{
  id: "unique-message-id",      // 消息唯一标识
  type: "text",                 // 消息类型
  content: {                    // 消息内容
    text: "Hello World"
  },
  sessionId: "session-id",      // 会话ID（可选）
  timestamp: "2023-12-01T10:00:00.000Z"
}
```

#### 支持的消息类型

- `init`: 初始化连接
- `text`: 文本消息
- `ping`: 心跳检测
- `system`: 系统消息

### 认证处理

```javascript
const AuthHandler = require('./websocket-module/handlers/AuthHandler');

const authHandler = new AuthHandler({
  jwtSecret: 'your-secret-key',
  allowAnonymous: true,
  requireAuth: false
});

// 使用认证中间件
wsManager.use({
  type: 'connection',
  handler: async (ws, req, metadata) => {
    return await authHandler.authenticateConnection(ws, req, metadata);
  }
});
```

### 消息验证

```javascript
const validationMiddleware = require('./websocket-module/middleware/validation');

// 使用验证中间件
wsManager.use(validationMiddleware({
  maxMessageLength: 10000,
  maxContentLength: 8000,
  allowedTypes: ['text', 'init', 'ping'],
  enableSanitization: true
}));
```

### 监控插件

```javascript
const monitoringPlugin = require('./websocket-module/plugins/monitoring');

// 启用监控
wsManager.use(monitoringPlugin({
  alertThresholds: {
    errorRate: 0.05,
    responseTime: 5000,
    connectionCount: 900
  }
}));

// 监听告警事件
wsManager.on('alert', (alert) => {
  console.log('Alert:', alert);
});
```

## 🔧 高级配置

### 自定义消息处理器

```javascript
// 注册自定义处理器
wsManager.registerHandler('custom', async (message, connectionInfo) => {
  try {
    // 自定义处理逻辑
    const result = await processCustomMessage(message);
    
    return {
      type: 'custom_response',
      content: result,
      sessionId: connectionInfo.sessionId
    };
  } catch (error) {
    throw new Error(`处理失败: ${error.message}`);
  }
});
```

### 自定义中间件

```javascript
// 创建自定义中间件
const customMiddleware = {
  type: 'message',
  handler: async (message, connectionInfo, next) => {
    // 预处理
    console.log('Processing message:', message.type);
    
    // 调用下一个中间件
    const result = await next();
    
    // 后处理
    console.log('Message processed');
    
    return result;
  }
};

wsManager.use(customMiddleware);
```

### 事件监听

```javascript
// 连接事件
wsManager.on('connection:added', (connectionInfo) => {
  console.log(`新连接: ${connectionInfo.id}`);
});

wsManager.on('connection:removed', (connectionInfo) => {
  console.log(`连接断开: ${connectionInfo.id}`);
});

// 消息事件
wsManager.on('message:received', (data) => {
  console.log('收到消息:', data.message.type);
});

wsManager.on('message:sent', (data) => {
  console.log('发送消息:', data.message.type);
});

// 错误事件
wsManager.on('error', (error) => {
  console.error('WebSocket错误:', error);
});
```

## 📊 监控和调试

### 健康检查

```javascript
const health = wsManager.getHealth();
console.log(health);
// {
//   status: 'healthy',
//   uptime: 3600000,
//   connections: {
//     active: 150,
//     total: 200
//   },
//   memory: {
//     used: 45.2,
//     total: 100
//   }
// }
```

### 性能指标

```javascript
const metrics = wsManager.getMetrics();
console.log(metrics);
// {
//   connections: {
//     activeConnections: 150,
//     totalConnections: 200,
//     peakConnections: 180
//   },
//   messages: {
//     totalMessages: 5000,
//     messagesPerSecond: 10.5,
//     avgResponseTime: 250
//   },
//   errors: {
//     totalErrors: 5,
//     errorRate: 0.001
//   }
// }
```

### 调试模式

```javascript
// 启用调试日志
process.env.DEBUG = 'websocket:*';

// 或者设置日志级别
wsManager.setLogLevel('debug');
```

## 🧪 测试

### 单元测试

```bash
npm test
```

### 覆盖率测试

```bash
npm run test:coverage
```

### 手动测试

```javascript
// 使用WebSocket客户端测试
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  // 发送初始化消息
  ws.send(JSON.stringify({
    id: 'test-1',
    type: 'init',
    content: {},
    timestamp: new Date().toISOString()
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('收到消息:', message);
});
```

## 🚀 部署

### 生产环境配置

```javascript
const wsManager = WebSocketModule.create({
  server: server,
  maxConnections: 5000,
  heartbeat: {
    interval: 30000,
    timeout: 5000
  },
  message: {
    timeout: 10000,
    maxRetries: 3
  },
  plugins: ['monitoring'],
  middleware: ['validation'],
  // 生产环境特定配置
  production: {
    enableCompression: true,
    maxPayload: 1024 * 1024, // 1MB
    perMessageDeflate: true
  }
});
```

### Docker部署

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001
CMD ["node", "examples/basic-usage.js"]
```

### 负载均衡

```javascript
// 使用Redis适配器支持多实例
const RedisAdapter = require('./adapters/redis');

const wsManager = WebSocketModule.create({
  server: server,
  adapter: new RedisAdapter({
    host: 'redis-server',
    port: 6379
  })
});
```

## 🔧 故障排除

### 常见问题

1. **连接失败**
   ```bash
   # 检查端口占用
   lsof -i :3001
   
   # 检查防火墙
   sudo ufw status
   ```

2. **内存泄漏**
   ```javascript
   // 监控内存使用
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log('Memory usage:', usage);
   }, 60000);
   ```

3. **性能问题**
   ```javascript
   // 启用性能分析
   const metrics = wsManager.getMetrics();
   if (metrics.messages.avgResponseTime > 1000) {
     console.warn('响应时间过长');
   }
   ```

### 日志分析

```bash
# 查看WebSocket日志
tail -f logs/websocket.log

# 过滤错误日志
grep "ERROR" logs/websocket.log

# 分析连接模式
grep "connection" logs/websocket.log | tail -100
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/OpenChatAgent/websocket-module.git

# 安装依赖
npm install

# 运行测试
npm test

# 启动示例
npm run example
```

### 代码规范

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [集成指南](INTEGRATION_GUIDE.md)
- [API文档](docs/API.md)
- [设计文档](docs/DESIGN.md)
- [更新日志](CHANGELOG.md)

---

**🎯 让WebSocket通信更简单、更可靠！**