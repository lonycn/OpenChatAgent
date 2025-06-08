# 📦 chat-core 模块开发 TODO

> **模块职责**：消息网关和状态控制中心，统一处理前端消息并路由到 AI 或人工客服

## 🎯 MVP 核心任务（第 1 周）

### 🔥 P0 - 基础消息网关

- [ ] **项目初始化**

  - [ ] 创建 `chat-core/` 目录结构
  - [ ] 初始化 `package.json`，安装依赖 `express`, `ws`, `cors`
  - [ ] 配置基础 Express 服务器
  - [ ] 设置跨域和中间件

- [ ] **WebSocket 服务**

  - [ ] 实现 WebSocket 服务器 (`ws` 库)
  - [ ] 实现客户端连接管理 (`ConnectionManager`)
  - [ ] 实现消息广播机制
  - [ ] 添加连接认证和会话绑定

- [ ] **消息路由核心**
  - [ ] 实现 `MessageRouter` 类
  - [ ] 实现消息格式标准化和验证
  - [ ] 实现 AI/人工 路由判断逻辑
  - [ ] 集成 `ai-service` 和 `chat-session` 模块

### 🟡 P1 - REST API 接口

- [ ] **会话控制 API**

  - [ ] `POST /api/sessions` - 创建新会话
  - [ ] `GET /api/sessions/:id` - 获取会话状态
  - [ ] `POST /api/sessions/:id/switch-agent` - 切换接待者
  - [ ] `GET /api/sessions/:id/history` - 获取历史消息

- [ ] **消息处理 API**
  - [ ] `POST /api/messages` - 发送消息（备用 HTTP 接口）
  - [ ] `POST /api/feedback` - 提交用户反馈
  - [ ] 实现统一错误处理中间件
  - [ ] 添加请求日志记录

### 🔥 P0 - 消息处理流程

- [ ] **用户消息处理**

  - [ ] 接收用户消息并验证格式
  - [ ] 查询当前会话接待者状态
  - [ ] 根据状态路由到 AI 或等待人工
  - [ ] 保存消息到会话历史

- [ ] **AI 回复处理**
  - [ ] 调用 `ai-service` 获取 AI 回复
  - [ ] 格式化 AI 回复消息
  - [ ] 通过 WebSocket 推送给客户端
  - [ ] 保存 AI 回复到历史记录

## 🚀 扩展功能（后续版本）

### 🟢 P2 - 高级功能

- [ ] **Webhook 集成**

  - [ ] 支持 Chatwoot webhook 接收
  - [ ] 实现客服接入通知机制
  - [ ] 添加第三方系统集成接口

- [ ] **性能优化**
  - [ ] 实现消息队列处理
  - [ ] 添加限流和防刷机制
  - [ ] 实现连接池管理优化

## 📁 目录结构

```
chat-core/
├── src/
│   ├── server/
│   │   ├── app.js
│   │   ├── websocket.js
│   │   └── index.js
│   ├── routes/
│   │   ├── sessions.js
│   │   ├── messages.js
│   │   └── index.js
│   ├── services/
│   │   ├── MessageRouter.js
│   │   ├── ConnectionManager.js
│   │   └── index.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── error.js
│   └── index.js
├── tests/
│   ├── routes.test.js
│   ├── websocket.test.js
│   └── integration.test.js
└── package.json
```

## 🔧 技术要求

- **语言**: Node.js (ES6+)
- **Web 框架**: Express.js
- **WebSocket**: ws
- **中间件**: cors, helmet, morgan
- **测试框架**: jest, supertest
- **进程管理**: PM2 (生产环境)

## 📋 验收标准

- [ ] WebSocket 服务正常启动并接受连接
- [ ] 能够正确路由消息到 AI 或人工
- [ ] REST API 接口功能完整且响应正确
- [ ] 支持会话状态的动态切换
- [ ] 具备完整的错误处理机制
- [ ] 通过所有单元测试和集成测试

## 🔗 依赖关系

- **依赖**: `ai-service`, `chat-session` 模块
- **被依赖**: `chat-ui`, `chat-client` 模块
- **外部服务**: Redis (通过 chat-session)

## 📊 消息流程图

```
用户消息 → WebSocket → MessageRouter → 判断Agent
                                      ├─ AI → ai-service → 返回回复
                                      └─ Human → 等待人工处理
```

## 🚨 关键注意事项

1. **消息格式统一**: 确保所有消息都遵循统一的数据结构
2. **错误处理**: 网络异常、AI 服务异常等都需要优雅处理
3. **状态同步**: WebSocket 连接状态与会话状态保持一致
4. **性能考虑**: 大量并发连接时的内存和 CPU 使用优化
