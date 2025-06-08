# 📦 ai-service 模块开发 TODO

> **模块职责**：封装阿里百炼 DashScope API，提供统一的 AI 对话接口

## 🎯 MVP 核心任务（第 1 周）

### 🔥 P0 - 基础对话能力

- [x] **环境配置**

  - [x] 创建 `ai-service/` 目录结构
  - [x] 初始化 `package.json`，安装依赖 `axios`, `dotenv`
  - [x] 创建 `.env.example` 配置模板
  - [x] 配置阿里百炼 API Key 和 Secret

- [x] **核心 API 封装**

  - [x] 实现 `DashScopeClient` 类
  - [x] 封装 `sendMessage(sessionId, text)` 方法
  - [x] 实现会话上下文管理（最近 10 条消息）
  - [x] 添加错误处理和重试机制

- [x] **基础测试**
  - [x] 编写单元测试用例
  - [x] 测试单轮对话功能
  - [x] 测试多轮对话上下文保持

### 🟡 P1 - 知识库集成

- [x] **知识库调用**

  - [x] 实现 `callKnowledge(query, knowledgeId)` 方法
  - [x] 支持知识库 ID 参数传递
  - [ ] 处理知识库查询结果格式化

- [x] **配置管理**
  - [x] 支持多个知识库配置
  - [ ] 实现知识库优先级策略

## 🚀 扩展功能（后续版本）

### 🟢 P2 - 高级功能

- [ ] **MCP 插件支持**

  - [ ] 封装 MCP 插件调用
  - [ ] 支持物流查询、订单查询等业务插件
  - [ ] 实现插件结果格式化

- [ ] **性能优化**
  - [ ] 添加响应缓存机制
  - [ ] 实现请求限流控制
  - [ ] 优化上下文截断策略

## 📁 目录结构

```
ai-service/
├── src/
│   ├── client/
│   │   ├── DashScopeClient.js
│   │   └── index.js
│   ├── utils/
│   │   ├── context.js
│   │   └── formatter.js
│   └── index.js
├── tests/
│   ├── client.test.js
│   ├── module.test.js
│   └── utils/
│       ├── context.test.js
│       └── formatter.test.js
├── .env
├── .env.example
├── .gitignore
└── package.json
```

## 🔧 技术要求

- **语言**: Node.js (ES6+)
- **HTTP 客户端**: axios
- **配置管理**: dotenv
- **测试框架**: jest
- **错误处理**: 统一错误码和消息

## 📋 验收标准

- [ ] 能够成功调用阿里百炼对话 API
- [ ] 支持会话上下文管理（session_id）
- [ ] 具备完整的错误处理机制
- [x] 通过所有单元测试
- [ ] 提供清晰的使用文档和示例

## 🔗 依赖关系

- **被依赖**: `chat-core` 模块调用本模块
- **依赖**: 阿里百炼 DashScope API
- **配置**: 需要有效的 API Key 和 Secret
