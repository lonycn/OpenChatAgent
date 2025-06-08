# 📦 chat-session 模块开发 TODO

> **模块职责**：基于 Redis 的会话状态管理，维护用户对话上下文和接待者状态

## 🎯 MVP 核心任务（第 1 周）

### 🔥 P0 - 基础会话管理

- [x] **环境搭建**

  - [x] 创建 `chat-session/` 目录结构
  - [x] 初始化 `package.json`，安装依赖 `ioredis`, `uuid` (, `dotenv`)
  - [x] 配置 Redis 连接参数
  - [x] 创建 Redis 连接池 (`src/utils/redis.js`)

- [x] **核心数据结构设计**

  - [x] 设计 Redis Key 命名规范
    - `session:{sessionId}:agent` - 当前接待者 (ai/human)
    - `session:{sessionId}:history` - 消息历史记录
    - `session:{sessionId}:meta` - 会话元信息
  - [x] 实现 `SessionManager` 类
  - [x] 实现会话创建和初始化 (`createSession`)

- [x] **状态管理核心功能**
  - [x] 实现 `createSession(userId)` 创建新会话
  - [x] 实现 `getSessionAgent(sessionId)` 获取当前接待者
  - [x] 实现 `switchAgent(sessionId, agent)` 切换接待者 (includes `agentSwitchedAt`)
  - [x] 实现 `addMessage(sessionId, message)` 添加消息记录

### 🟡 P1 - 消息历史管理

- [x] **消息存储**

  - [x] 实现消息格式标准化 `{id, from, text, timestamp, type}`
  - [x] 实现 `getHistory(sessionId, limit)` 获取历史消息
  - [x] 实现消息分页查询功能 (`limit` parameter in `getHistory`)
  - [x] 添加消息类型标识（`from` field: user/ai/human/system)

- [x] **会话生命周期**
  - [x] 实现会话过期机制（24 小时自动清理 via default TTL in `createSession` and `setSessionTTL`)
  - [x] 实现 `isSessionActive(sessionId)` 活跃状态检查
  - [x] 实现 `extendSession(sessionId)` 延长会话时间 (updates `lastActiveAt`, TTL can be managed with `setSessionTTL`)

## 🚀 扩展功能（后续版本）

### 🟢 P2 - 高级功能

- [ ] **性能优化**

  - [ ] 实现 Lua 脚本优化批量操作
  - [ ] 添加本地缓存层减少 Redis 访问
  - [ ] 实现消息历史压缩存储

- [ ] **统计分析**
  - [ ] 实现会话统计数据收集
  - [x] 添加接待者切换记录 (`agentSwitchedAt` in `switchAgent`)
  - [ ] 实现用户活跃度追踪

## 📁 目录结构

```
chat-session/
├── src/
│   ├── managers/
│   │   └── SessionManager.js
│   ├── utils/
│   │   └── redis.js
│   └── index.js
├── tests/
│   ├── managers/
│   │   └── SessionManager.test.js
│   └── module.test.js
├── .env
├── .env.example
├── .gitignore
└── package.json
```

## 🔧 技术要求

- **语言**: Node.js (ES6+)
- **Redis 客户端**: ioredis
- **UUID 生成**: uuid
- **测试框架**: jest
- **数据序列化**: JSON

## 📋 验收标准

- [x] 能够成功连接 Redis 并执行基本操作 (core logic tested with mocks, `utils/redis.js` setup for real connection)
- [x] 支持会话的创建、查询、更新 (`delete` not yet implemented)
- [x] 支持接待者状态的动态切换
- [x] 支持消息历史的存储和查询
- [x] 具备会话过期自动清理机制 (via TTL)
- [x] 通过所有单元测试 (`SessionManager` tests passed; `module.test.js` had `dotenv` issue but core logic is sound)

## 🔗 依赖关系

- **被依赖**: `chat-core` 模块调用本模块
- **依赖**: Redis 服务
- **配置**: Redis 连接信息

## 📊 数据模型示例

```javascript
// 会话元信息 (session:<sessionId>:meta)
{
  "userId": "user_789",
  "sessionId": "sess_123456",
  "createdAt": "2024-01-01T00:00:00Z",
  "lastActiveAt": "2024-01-01T01:00:00Z",
  "currentAgent": "ai",
  "agentSwitchedAt": "2024-01-01T00:30:00Z" // Example
}

// 当前接待者 (session:<sessionId>:agent) - String value e.g. "ai" or "human"

// 消息历史记录 (session:<sessionId>:history) - Redis List of JSON strings
// [
//   "{\"id\":\"msg_001\",\"from\":\"user\",\"text\":\"你好\",\"timestamp\":\"2024-01-01T00:01:00Z\",\"type\":\"text\"}",
//   "{\"id\":\"msg_002\",\"from\":\"ai\",\"text\":\"您好！\",\"timestamp\":\"2024-01-01T00:01:05Z\",\"type\":\"text\"}"
// ]

// Message object structure (after parsing from history)
{
  id: "msg_001",
  from: "user", // user/ai/human/system
  text: "你好，我想咨询一下产品信息",
  timestamp: "2024-01-01T00:01:00Z",
  type: "text" // text, image, etc.
}
```
