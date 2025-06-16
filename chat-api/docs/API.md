# 🌐 Chat API 接口文档

## 📋 目录
- [接口概览](#接口概览)
- [认证授权](#认证授权)
- [聊天接口](#聊天接口)
- [管理接口](#管理接口)
- [WebSocket 接口](#websocket-接口)
- [错误处理](#错误处理)

## 🔍 接口概览

### 🌐 基础信息
- **Base URL**: `http://localhost:8000`
- **API Version**: `v1`
- **Content-Type**: `application/json`
- **认证方式**: `Bearer Token (JWT)`

### 📊 HTTP 状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 🔒 认证授权

### 🔑 用户登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "full_name": "管理员",
      "role": "admin"
    }
  }
}
```

### 🔄 刷新令牌
```http
POST /api/v1/auth/refresh
Authorization: Bearer <access_token>
```

### 👤 获取当前用户信息
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

### 🚪 用户登出
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

## 💬 聊天接口

### 📝 创建会话
```http
POST /api/v1/chat/sessions
Content-Type: application/json

{
  "user_id": "guest_123",
  "metadata": {
    "source": "web",
    "user_agent": "Mozilla/5.0...",
    "ip": "192.168.1.1"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "session_id": "sess_abc123",
    "user_id": "guest_123",
    "agent_type": "ai",
    "status": "active",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### 📊 获取会话信息
```http
GET /api/v1/chat/sessions/{session_id}
```

### 🔄 切换代理类型
```http
POST /api/v1/chat/sessions/{session_id}/switch-agent
Content-Type: application/json

{
  "agent_type": "human",  // "ai" | "human"
  "reason": "customer_request"
}
```

### 📨 发送消息 (HTTP 备用接口)
```http
POST /api/v1/chat/messages
Content-Type: application/json

{
  "session_id": "sess_abc123",
  "content": "你好，我需要帮助",
  "message_type": "text"
}
```

### 📜 获取消息历史
```http
GET /api/v1/chat/sessions/{session_id}/messages?limit=50&offset=0
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_123",
        "session_id": "sess_abc123",
        "sender_type": "user",
        "content": "你好",
        "message_type": "text",
        "created_at": "2024-01-01T10:00:00Z"
      },
      {
        "id": "msg_124",
        "session_id": "sess_abc123",
        "sender_type": "ai",
        "content": "您好！有什么可以帮助您的吗？",
        "message_type": "text",
        "created_at": "2024-01-01T10:00:01Z"
      }
    ],
    "total": 2,
    "has_more": false
  }
}
```

## 👥 管理接口

### 🔍 获取对话列表
```http
GET /api/v1/admin/conversations?status=open&limit=20&offset=0
Authorization: Bearer <access_token>
```

**查询参数**:
- `status`: 对话状态 (`open`, `pending`, `resolved`, `closed`)
- `agent_type`: 代理类型 (`ai`, `human`)
- `assignee_id`: 指派客服ID
- `priority`: 优先级 (`low`, `medium`, `high`, `urgent`)
- `limit`: 每页数量 (默认20)
- `offset`: 偏移量 (默认0)

### 👤 获取客户列表
```http
GET /api/v1/admin/customers?search=keyword&limit=20&offset=0
Authorization: Bearer <access_token>
```

### 📊 获取统计数据
```http
GET /api/v1/admin/analytics/dashboard
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "today": {
      "total_conversations": 156,
      "active_conversations": 23,
      "ai_handled": 134,
      "human_handled": 22,
      "avg_response_time": 2.5
    },
    "this_week": {
      "total_conversations": 1024,
      "customer_satisfaction": 4.2,
      "resolution_rate": 0.89
    }
  }
}
```

### 👥 用户管理
```http
# 获取用户列表
GET /api/v1/admin/users
Authorization: Bearer <access_token>

# 创建用户
POST /api/v1/admin/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "agent@example.com",
  "full_name": "客服小王",
  "role": "agent",
  "password": "password123"
}

# 更新用户
PUT /api/v1/admin/users/{user_id}
Authorization: Bearer <access_token>

# 删除用户
DELETE /api/v1/admin/users/{user_id}
Authorization: Bearer <access_token>
```

## 📡 WebSocket 接口

### 🔌 连接建立
```javascript
// 连接 WebSocket
const ws = new WebSocket('ws://localhost:8000/ws');

// 认证 (可选)
ws.send(JSON.stringify({
  type: 'auth',
  data: {
    token: 'your_jwt_token'
  }
}));
```

### 📨 消息格式

#### 📤 发送消息
```json
{
  "type": "message",
  "data": {
    "session_id": "sess_abc123",
    "content": "你好，我需要帮助",
    "message_type": "text"
  }
}
```

#### 📥 接收消息
```json
{
  "type": "message",
  "data": {
    "id": "msg_124",
    "session_id": "sess_abc123",
    "sender_type": "ai",
    "content": "您好！有什么可以帮助您的吗？",
    "message_type": "text",
    "created_at": "2024-01-01T10:00:01Z"
  }
}
```

#### 🔄 状态更新
```json
{
  "type": "status_update",
  "data": {
    "session_id": "sess_abc123",
    "agent_type": "human",
    "assignee": {
      "id": 1,
      "name": "客服小王"
    },
    "message": "客服小王已接管对话"
  }
}
```

#### 🤖 AI 流式回复
```json
{
  "type": "ai_stream",
  "data": {
    "session_id": "sess_abc123",
    "content": "根据您的问题",
    "is_complete": false,
    "full_content": "根据您的问题"
  }
}
```

### 📋 消息类型

| 类型 | 说明 | 方向 |
|------|------|------|
| `auth` | 身份认证 | 客户端 → 服务端 |
| `message` | 聊天消息 | 双向 |
| `typing` | 正在输入 | 双向 |
| `status_update` | 状态更新 | 服务端 → 客户端 |
| `ai_stream` | AI流式回复 | 服务端 → 客户端 |
| `error` | 错误信息 | 服务端 → 客户端 |
| `ping` | 心跳检测 | 双向 |

## ❌ 错误处理

### 📋 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "email",
      "issue": "邮箱格式不正确"
    }
  }
}
```

### 🚨 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `UNAUTHORIZED` | 401 | 未认证或令牌无效 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `SESSION_NOT_FOUND` | 404 | 会话不存在 |
| `AI_SERVICE_ERROR` | 500 | AI服务调用失败 |
| `DATABASE_ERROR` | 500 | 数据库操作失败 |

### 🔧 WebSocket 错误
```json
{
  "type": "error",
  "data": {
    "code": "INVALID_MESSAGE_FORMAT",
    "message": "消息格式不正确",
    "details": "缺少必需字段: session_id"
  }
}
```

## 📊 限流规则

| 接口类型 | 限制 | 时间窗口 |
|----------|------|----------|
| 登录接口 | 5次 | 1分钟 |
| 发送消息 | 60次 | 1分钟 |
| 管理接口 | 100次 | 1分钟 |
| WebSocket连接 | 10个 | 每IP |

## 🔧 开发工具

### 📖 API 文档
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 🧪 测试工具
```bash
# 健康检查
curl http://localhost:8000/health

# 登录测试
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

这个API文档提供了完整的接口规范，便于前端开发和第三方集成。
