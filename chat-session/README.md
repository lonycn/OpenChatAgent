# 📦 Chat Session 模块

> **模块职责**：基于 Redis 的会话管理系统，提供完整的聊天会话生命周期管理

## 🎯 功能特性

### ✅ 已完成功能

- **会话管理**

  - ✅ 创建会话 (`createSession`)
  - ✅ 获取会话信息 (`getSession`)
  - ✅ 检查会话状态 (`isSessionActive`)
  - ✅ 删除会话 (`deleteSession`)
  - ✅ 会话 TTL 管理 (`setSessionTTL`, `getSessionTTL`)

- **消息管理**

  - ✅ 添加消息 (`addMessage`)
  - ✅ 获取消息历史 (`getHistory`)
  - ✅ 消息历史数量限制（可配置）
  - ✅ 自动会话延期

- **代理切换**

  - ✅ AI/人工代理切换 (`switchAgent`)
  - ✅ 获取当前代理 (`getSessionAgent`)

- **批量操作**

  - ✅ 获取用户所有会话 (`getUserSessions`)
  - ✅ 获取活跃会话数量 (`getActiveSessionsCount`)
  - ✅ 清理过期会话 (`cleanupExpiredSessions`)

- **自动化工具**
  - ✅ 定期清理服务 (`SessionCleanup`)
  - ✅ 连接管理和优雅关闭

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 环境配置

复制环境变量模板：

```bash
cp .env.example .env
```

配置 Redis 连接：

```env
# Redis 连接配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 会话配置
DEFAULT_SESSION_TTL=86400  # 24小时 (秒)
MAX_MESSAGE_HISTORY=100    # 最大消息历史数量
CLEANUP_INTERVAL=3600      # 清理间隔 (秒)

# 性能配置
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000     # 重试延迟 (毫秒)
```

### 基础使用

```javascript
const {
  SessionManager,
  SessionCleanup,
  closeRedisClient,
} = require("./src/index");

async function main() {
  // 创建会话管理器
  const sessionManager = new SessionManager();

  // 创建会话
  const result = await sessionManager.createSession("user123", {
    name: "客服会话",
    type: "support",
  });
  const sessionId = result.sessionId;

  // 添加消息
  await sessionManager.addMessage(sessionId, {
    id: "msg-1",
    from: "user",
    text: "你好，我需要帮助",
    timestamp: new Date().toISOString(),
    type: "text",
  });

  // 获取消息历史
  const history = await sessionManager.getHistory(sessionId, 10);
  console.log("消息历史:", history);

  // 清理资源
  await closeRedisClient();
}

main().catch(console.error);
```

## 📚 API 文档

### SessionManager

#### 构造函数

```javascript
new SessionManager(redisClient?)
```

- `redisClient` (可选): 自定义 Redis 客户端实例

#### 会话管理方法

##### `createSession(userId, metadata?)`

创建新会话

- **参数**:
  - `userId` (string): 用户 ID
  - `metadata` (object, 可选): 会话元数据
- **返回**: `Promise<{sessionId, userId, createdAt, lastActiveAt, currentAgent, ...metadata}>`

##### `getSession(sessionId)`

获取会话信息

- **参数**: `sessionId` (string)
- **返回**: `Promise<object | null>`

##### `isSessionActive(sessionId)`

检查会话是否活跃

- **参数**: `sessionId` (string)
- **返回**: `Promise<boolean>`

##### `deleteSession(sessionId)`

删除会话

- **参数**: `sessionId` (string)
- **返回**: `Promise<{success: boolean, deletedKeys: number}>`

##### `extendSession(sessionId)`

延长会话活跃时间

- **参数**: `sessionId` (string)
- **返回**: `Promise<{success: boolean}>`

#### 消息管理方法

##### `addMessage(sessionId, message)`

添加消息到会话

- **参数**:
  - `sessionId` (string)
  - `message` (object): 消息对象
    ```javascript
    {
      id: string,        // 消息 ID
      from: string,      // 发送者 (user/assistant/system)
      text: string,      // 消息内容
      timestamp: string, // ISO 时间戳
      type?: string      // 消息类型 (可选)
    }
    ```
- **返回**: `Promise<{success: boolean, messageId: string, message: object}>`

##### `getHistory(sessionId, limit?)`

获取消息历史

- **参数**:
  - `sessionId` (string)
  - `limit` (number, 默认 20): 获取消息数量
- **返回**: `Promise<Array<object>>`

#### 代理管理方法

##### `getSessionAgent(sessionId)`

获取当前代理

- **参数**: `sessionId` (string)
- **返回**: `Promise<string | null>`

##### `switchAgent(sessionId, newAgent)`

切换代理

- **参数**:
  - `sessionId` (string)
  - `newAgent` (string): 新代理类型 (ai/human)
- **返回**: `Promise<{success: boolean, newAgent: string}>`

#### TTL 管理方法

##### `setSessionTTL(sessionId, ttlInSeconds)`

设置会话过期时间

- **参数**:
  - `sessionId` (string)
  - `ttlInSeconds` (number): 过期时间（秒）
- **返回**: `Promise<{success: boolean}>`

##### `getSessionTTL(sessionId)`

获取会话剩余时间

- **参数**: `sessionId` (string)
- **返回**: `Promise<number>` (-1: 永不过期, -2: 不存在)

#### 批量操作方法

##### `getUserSessions(userId)`

获取用户的所有会话

- **参数**: `userId` (string)
- **返回**: `Promise<Array<object>>`

##### `getActiveSessionsCount()`

获取活跃会话数量

- **返回**: `Promise<number>`

##### `cleanupExpiredSessions()`

清理过期会话

- **返回**: `Promise<{success: boolean, cleanedCount: number}>`

### SessionCleanup

自动清理工具类

#### 构造函数

```javascript
new SessionCleanup(sessionManager);
```

#### 方法

##### `start()`

启动定期清理

##### `stop()`

停止定期清理

##### `cleanup()`

手动执行一次清理

##### `getStatus()`

获取清理状态

- **返回**: `{isRunning: boolean, interval: number, nextCleanup: Date | null}`

## 🧪 测试

运行所有测试：

```bash
npm test
```

运行示例：

```bash
node example.js
```

## 📁 项目结构

```
chat-session/
├── src/
│   ├── managers/
│   │   └── SessionManager.js     # 会话管理器
│   ├── utils/
│   │   ├── redis.js              # Redis 连接管理
│   │   └── cleanup.js            # 清理工具
│   └── index.js                  # 主入口
├── tests/
│   ├── managers/
│   │   └── SessionManager.test.js
│   ├── cleanup.test.js
│   └── module.test.js
├── .env.example                  # 环境变量模板
├── example.js                    # 使用示例
├── package.json
└── README.md
```

## 🔧 技术栈

- **运行时**: Node.js (ES6+)
- **数据库**: Redis (ioredis 客户端)
- **测试框架**: Jest
- **工具库**: uuid, dotenv

## 📊 性能特性

- **连接池**: 使用 ioredis 连接池管理
- **批量操作**: 使用 Redis Pipeline 提升性能
- **内存优化**: 自动限制消息历史数量
- **自动清理**: 定期清理过期会话
- **优雅关闭**: 正确处理进程退出信号

## 🛡️ 错误处理

- 完整的错误捕获和日志记录
- 优雅的错误恢复机制
- 详细的错误信息和堆栈跟踪
- 连接断开自动重连

## 🔄 数据结构

### Redis 键结构

```
session:{sessionId}:meta     # 会话元数据 (Hash)
session:{sessionId}:agent    # 当前代理 (String)
session:{sessionId}:history  # 消息历史 (List)
```

### 会话元数据结构

```javascript
{
  userId: string,           // 用户 ID
  sessionId: string,        // 会话 ID
  createdAt: string,        // 创建时间 (ISO)
  lastActiveAt: string,     // 最后活跃时间 (ISO)
  currentAgent: string,     // 当前代理 (ai/human)
  agentSwitchedAt?: string, // 代理切换时间 (ISO, 可选)
  ...customMetadata         // 自定义元数据
}
```

### 消息结构

```javascript
{
  id: string,        // 消息 ID
  from: string,      // 发送者 (user/assistant/system)
  text: string,      // 消息内容
  timestamp: string, // 时间戳 (ISO)
  type?: string      // 消息类型 (可选)
}
```

## 🚀 部署建议

### 生产环境配置

1. **Redis 配置**:

   - 启用持久化 (AOF + RDB)
   - 配置内存限制和淘汰策略
   - 启用密码认证

2. **应用配置**:

   - 设置合理的 TTL 值
   - 配置适当的清理间隔
   - 监控内存使用情况

3. **监控指标**:
   - 活跃会话数量
   - 消息处理速度
   - Redis 连接状态
   - 清理效果统计

## 📝 更新日志

### v1.0.0 (2025-06-09)

- ✅ 完整的会话管理功能
- ✅ 消息历史管理
- ✅ 代理切换功能
- ✅ 自动清理工具
- ✅ 完整的测试覆盖
- ✅ 详细的文档和示例

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 🔗 相关链接

- [Redis 官方文档](https://redis.io/documentation)
- [ioredis 文档](https://github.com/luin/ioredis)
- [Jest 测试框架](https://jestjs.io/)
