# 🧱 DEVELOP_GUIDE：AI 智能客服系统开发指南

## 🔧 端口统一配置 (800x 系列)

为了便于管理和记忆，所有服务统一使用 **800x** 端口系列：

| 服务模块          | 端口 | 说明                          |
| ----------------- | ---- | ----------------------------- |
| **chat-ui**       | 8001 | 用户前端聊天界面              |
| **chat-core**     | 8002 | 消息网关 + WebSocket 服务     |
| **ai-service**    | 8003 | AI 服务 (阿里百炼 API)        |
| **chat-session**  | 8004 | 会话管理服务 (Redis)          |
| **chat-admin**    | 8005 | 管理后台 API                  |
| **chat-admin-ui** | 8006 | 管理后台前端 (Ant Design Pro) |

**服务间调用关系**：

- `chat-ui (8001)` → WebSocket → `chat-core (8002)`
- `chat-core (8002)` → HTTP → `ai-service (8003)` + `chat-session (8004)`
- `chat-admin-ui (8006)` → HTTP → `chat-admin (8005)`

---

本文件基于当前 AI + 人工客服系统的整体架构，细化了每个子模块的功能设计，借鉴 Chatwoot 的功能体系，并结合 Ant Design X、阿里百炼 MCP、Redis 状态协同的技术实现。

## 🚀 MVP 开发顺序（4 周计划）

### 第 1 周：后端基础设施（并行开发）

1. **ai-service** - 阿里百炼 API 封装
2. **chat-session** - Redis 会话管理
3. **chat-core** - 消息网关和路由

### 第 2 周：前端界面开发（并行开发）

4. **chat-ui** - Web 聊天界面
5. **chat-client** - 多端客户端

### 第 3 周：管理后台开发

6. **chat-admin** - 客服管理后台

### 第 4 周：集成测试和部署

- 端到端测试
- 性能优化
- 生产部署

> 💡 **开发建议**：严格按照 🔥 P0 → 🟡 P1 → 🟢 P2 优先级开发，确保 MVP 核心功能优先完成。

---

## 📁 1. chat-ui（前端聊天界面）

### 📌 目标

提供用户对话界面，支持 AI 对话气泡、人工接管提示、快捷指令、满意度反馈。

### ✅ 功能设计

- 聊天消息展示（气泡样式：左用户 / 右 AI / 系统提示）

- 输入框 + 发送按钮（支持快捷 Enter / Shift+Enter）

- 发送消息节流控制（避免暴刷）

- 会话状态提示（当前由 AI 还是人工服务）

- 接管按钮（显示"转人工"/"AI 接管"）

- 满意度反馈按钮（👍 👎）

- 快捷指令入口（如常见问题、查看订单等）

- 滚动加载历史记录（分页）

### 📦 技术建议

- 使用 React + Ant Design X (ProChat 组件)

- 状态管理：useXChat + useXAgent

- 消息下推：WebSocket (已实现)

### 🔌 WebSocket 实现详情

**连接流程**：

1. 页面加载时自动建立 WebSocket 连接到 `ws://localhost:8002`
2. 发送第一条消息时自动初始化会话（`type: 'init'`）
3. 后续消息使用常规文本格式（`type: 'text'`）

**消息格式**：

```javascript
// 初始化消息
{
  type: 'init',
  payload: {
    userId: 'generated-uuid',
    initialMessage: { text: '用户消息', type: 'text' }
  }
}

// 常规消息
{
  type: 'text',
  text: '用户消息内容',
  sessionId: 'session-uuid',
  userId: 'user-uuid'
}
```

**ProChat 配置**：

- `request={false}` - 禁用 HTTP 请求模式
- `modelProvider="custom"` - 使用自定义提供者
- 完全通过 WebSocket 处理消息收发

---

## 📁 2. chat-core（消息网关 + 状态控制服务）

### 📌 目标

统一接入所有前端消息，路由至 AI 或人工，并维护会话状态（是否接管、上下文）

### ✅ 功能设计

- WebSocket 服务端实现（每个客户端建立 session）

- 接收用户消息并记录上下文

- 判断当前 agent（ai/human），转发消息

- 接收 AI 回复后下发

- 提供 REST API：

  - `POST /switch-agent` 切换接待方

  - `GET /session/:id` 获取当前状态

  - `POST /feedback` 提交用户反馈

### 📦 技术建议

- Node.js + Express + ws (已实现)

- 会话状态：Redis

- 日志记录：本地文件或 SQLite（开发期）

### 🔌 WebSocket 服务器实现

**核心功能**：

- 连接管理：自动分配连接 ID，维护活跃连接池
- 消息验证：使用 Joi 验证消息格式
- 会话路由：根据消息类型路由到 AI 服务或人工客服
- 错误处理：完善的异常处理和错误反馈机制

**支持的消息类型**：

- `init` - 会话初始化
- `text` - 文本消息
- `system` - 系统消息
- `image` - 图片消息（预留）
- `file` - 文件消息（预留）

**API 端点**：

- `GET /api/health` - 健康检查
- `POST /api/openai/chat` - OpenAI 兼容接口（备用）
- `POST /api/sessions/:id/switch-agent` - 切换代理

---

## 📁 3. ai-service（阿里百炼封装）

### 📌 目标

统一封装与阿里百炼 DashScope MCP 的 API 调用（会话、知识库、工作流）

### ✅ 功能设计

- `sendMessage(sessionId, text)` → AI 回复文本

- `uploadKnowledge(doc)` → 上传 FAQ 文档

- `callFunction(intent, slots)` → 调用插件能力

- 自动识别是否需要调用 MCP 工作流（如物流查询）

- 自动拼接上下文（记忆支持）

- 错误处理机制（token 过期等）

### 📦 技术建议

- axios 封装 REST API

- 配置文件管理 ak/sk、agentId

- 接入缓存机制避免重复调用

---

## 📁 4. chat-session（会话管理模块）

### 📌 目标

负责维护会话的上下文信息、接待方状态、消息记录、session 生命周期。

### ✅ 功能设计

- Redis 数据结构设计：

  - `session:<id>:agent` = ai / human

  - `session:<id>:history` = List[{from, msg, ts}]

  - `session:<id>:meta` = user_id, created_at, etc.

- 会话过期策略（24h 自动清除）

- 上下文截断策略（仅传近 N 条给 AI）

- 接管切换记录（带时间戳）

### 📦 技术建议

- Redis client：ioredis

- 采用 namespace 结构防止污染

- 可加 Lua 脚本优化读取操作

---

## 📁 5. chat-admin（客服管理后台）

### 📌 目标

提供内部客服人员的可视化界面，显示对话列表、接管入口、评分记录。

### ✅ 功能设计

- 会话池视图（当前活跃会话、状态、转人工按钮）

- 客服登录、权限控制

- 客服点击某会话 → 接管（自动更新 Redis agent 状态）

- 会话详情面板（对话内容、上下文、评分）

- 历史对话搜索（按用户/关键词）

- 标记 AI 错误回复记录

### 📦 技术建议

- 基于 ant-design-pro / react-admin 搭建

- 使用统一 API（由 chat-core 暴露）

- 提供客服身份的 token 校验机制

---

## 📁 6. chat-client（多端接入入口）

### 📌 目标

支持 H5 网页、小程序、公众号等接入渠道，打通统一 AI 服务。

### ✅ 功能设计

- 建立唯一 session_id 机制（设备 ID + 用户 ID）

- WebSocket / 微信消息接口 对接 chat-core

- 使用 uniapp 封装通用聊天组件

- 自动回复欢迎语，错误提示（如 AI 暂停）

- 探测用户活跃度（进入/退出会话）

- 持久化本地记录（如聊天缓存）

### 📦 技术建议

- uniapp + Vue3 + uView / vant

- WebSocket 通道统一封装

- 微信端采用服务号或企微对接消息

---

# 📌 总结

该 DEVELOP_GUIDE 文档将作为开发团队的模块划分说明书。每个模块具备清晰的边界、职责和通信接口，满足"默认 AI 服务 + 人工随时接管 + 多端接入 + 快速上线"目标.

---

# 核心模块 TODO（按开发优先级排序）

## 1

[x] TODO_ai-service.md - AI 服务模块
阿里百炼 API 封装
对话和知识库集成
第 1 周开发重点

## 2

[x] TODO_chat-session.md - 会话管理模块
Redis 会话状态管理
消息历史存储
第 1 周开发重点

## 3

[x] TODO_chat-core.md - 消息网关模块
WebSocket + REST API
消息路由和状态控制
第 1 周开发重点

## 4

[x] TODO_chat-ui.md - 前端聊天界面
Ant Design X 聊天组件
用户交互界面
第 2 周开发重点

[] TODO_chat-client.md - 多端客户端
uniapp 多端适配
H5/小程序支持
第 2 周开发重点

[] TODO_chat-admin.md - 管理后台
客服工作台
会话接管功能
第 3 周开发重点
🗺️ 总体规划文档

[] TODO_MVP_ROADMAP.md - MVP 开发路线图
4 周详细开发计划
模块依赖关系图
风险控制和成功指标
