# 📦 chat-session 模块开发 TODO

> **模块职责**：基于 Redis 的会话状态管理，维护用户对话上下文和接待者状态

## 🎯 MVP 核心任务（第 1 周）

### 🔥 P0 - 基础会话管理

- [ ] **环境搭建**

  - [ ] 创建 `chat-session/` 目录结构
  - [ ] 初始化 `package.json`，安装依赖 `ioredis`, `uuid`
  - [ ] 配置 Redis 连接参数
  - [ ] 创建 Redis 连接池

- [ ] **核心数据结构设计**

  - [ ] 设计 Redis Key 命名规范
    - `session:{sessionId}:agent` - 当前接待者 (ai/human)
    - `session:{sessionId}:history` - 消息历史记录
    - `session:{sessionId}:meta` - 会话元信息
  - [ ] 实现 `SessionManager` 类
  - [ ] 实现会话创建和初始化

- [ ] **状态管理核心功能**
  - [ ] 实现 `createSession(userId)` 创建新会话
  - [ ] 实现 `getSessionAgent(sessionId)` 获取当前接待者
  - [ ] 实现 `switchAgent(sessionId, agent)` 切换接待者
  - [ ] 实现 `addMessage(sessionId, message)` 添加消息记录

### 🟡 P1 - 消息历史管理

- [ ] **消息存储**

  - [ ] 实现消息格式标准化 `{from, text, timestamp, type}`
  - [ ] 实现 `getHistory(sessionId, limit)` 获取历史消息
  - [ ] 实现消息分页查询功能
  - [ ] 添加消息类型标识（user/ai/system/human）

- [ ] **会话生命周期**
  - [ ] 实现会话过期机制（24 小时自动清理）
  - [ ] 实现 `isSessionActive(sessionId)` 活跃状态检查
  - [ ] 实现 `extendSession(sessionId)` 延长会话时间

## 🚀 扩展功能（后续版本）

### 🟢 P2 - 高级功能

- [ ] **性能优化**

  - [ ] 实现 Lua 脚本优化批量操作
  - [ ] 添加本地缓存层减少 Redis 访问
  - [ ] 实现消息历史压缩存储

- [ ] **统计分析**
  - [ ] 实现会话统计数据收集
  - [ ] 添加接待者切换记录
  - [ ] 实现用户活跃度追踪

## 📁 目录结构

```
chat-session/
├── src/
│   ├── managers/
│   │   ├── SessionManager.js
│   │   └── index.js
│   ├── models/
│   │   ├── Session.js
│   │   └── Message.js
│   ├── utils/
│   │   ├── redis.js
│   │   └── constants.js
│   └── index.js
├── tests/
│   ├── session.test.js
│   └── redis.test.js
├── scripts/
│   └── cleanup.lua
└── package.json
```

## 🔧 技术要求

- **语言**: Node.js (ES6+)
- **Redis 客户端**: ioredis
- **UUID 生成**: uuid
- **测试框架**: jest
- **数据序列化**: JSON

## 📋 验收标准

- [ ] 能够成功连接 Redis 并执行基本操作
- [ ] 支持会话的创建、查询、更新、删除
- [ ] 支持接待者状态的动态切换
- [ ] 支持消息历史的存储和查询
- [ ] 具备会话过期自动清理机制
- [ ] 通过所有单元测试

## 🔗 依赖关系

- **被依赖**: `chat-core` 模块调用本模块
- **依赖**: Redis 服务
- **配置**: Redis 连接信息

## 📊 数据模型示例

```javascript
// 会话元信息
{
  sessionId: "sess_123456",
  userId: "user_789",
  createdAt: "2024-01-01T00:00:00Z",
  lastActiveAt: "2024-01-01T01:00:00Z",
  status: "active"
}

// 消息记录
{
  id: "msg_001",
  from: "user", // user/ai/human/system
  text: "你好，我想咨询一下产品信息",
  timestamp: "2024-01-01T00:01:00Z",
  type: "text"
}
```
