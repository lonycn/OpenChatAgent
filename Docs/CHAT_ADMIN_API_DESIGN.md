# 🌐 chat-admin API 接口设计文档

## 📋 API 架构总览

基于 RESTful 设计原则，结合 WebSocket 实时通信，支持：

- **REST API**: 标准 CRUD 操作
- **WebSocket**: 实时消息推送
- **统一鉴权**: JWT + RBAC 权限控制
- **版本管理**: API 版本化支持

## 🔐 认证与授权

### JWT Token 结构

```json
{
  "user_id": 123,
  "email": "agent@example.com",
  "role": "agent",
  "permissions": ["conversations:read", "conversations:write"],
  "exp": 1640995200,
  "iat": 1640908800
}
```

### 权限级别定义

```typescript
type Permission =
  | "conversations:read"
  | "conversations:write"
  | "conversations:assign"
  | "contacts:read"
  | "contacts:write"
  | "contacts:delete"
  | "reports:read"
  | "reports:export"
  | "settings:read"
  | "settings:write"
  | "users:read"
  | "users:write"
  | "users:manage"
  | "inboxes:read"
  | "inboxes:write";

type Role = "admin" | "supervisor" | "agent" | "guest";
```

## 📡 API 端点设计

### 1. 认证管理 `/api/v1/auth`

#### 登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "agent@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "agent@example.com",
      "full_name": "张三",
      "role": "agent",
      "avatar_url": "https://...",
      "permissions": ["conversations:read", "conversations:write"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh_token_string"
  }
}
```

#### 刷新 Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token_string"
}
```

#### 登出

```http
POST /api/v1/auth/logout
Authorization: Bearer {token}
```

### 2. 会话管理 `/api/v1/conversations`

#### 获取会话列表

```http
GET /api/v1/conversations?status=open&page=1&per_page=20&assignee_id=123
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": 456,
        "uuid": "session-uuid",
        "contact": {
          "id": 789,
          "name": "客户张三",
          "email": "customer@example.com",
          "avatar_url": "https://..."
        },
        "status": "open",
        "priority": "medium",
        "channel_type": "web_widget",
        "current_agent_type": "ai",
        "assignee": {
          "id": 123,
          "full_name": "客服李四"
        },
        "unread_count": 3,
        "last_message": {
          "content": "需要帮助",
          "created_at": "2024-01-15T10:30:00Z"
        },
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 20,
      "total_count": 156,
      "total_pages": 8
    }
  }
}
```

#### 获取会话详情

```http
GET /api/v1/conversations/{conversation_id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "conversation": {
      "id": 456,
      "uuid": "session-uuid",
      "contact": {
        "id": 789,
        "name": "客户张三",
        "email": "customer@example.com",
        "phone": "+86 138****8888",
        "custom_attributes": {
          "vip_level": "gold",
          "source": "website"
        }
      },
      "status": "open",
      "priority": "medium",
      "labels": [
        {
          "id": 1,
          "title": "技术支持",
          "color": "#ff6b6b"
        }
      ],
      "assignee": {
        "id": 123,
        "full_name": "客服李四",
        "avatar_url": "https://..."
      },
      "messages": [
        {
          "id": 1001,
          "uuid": "msg-uuid",
          "sender_type": "contact",
          "content": "我需要技术支持",
          "message_type": "text",
          "is_private": false,
          "created_at": "2024-01-15T10:00:00Z"
        },
        {
          "id": 1002,
          "uuid": "msg-uuid-2",
          "sender_type": "ai",
          "content": "您好！我是智能助手，请问遇到了什么问题？",
          "message_type": "text",
          "is_private": false,
          "created_at": "2024-01-15T10:01:00Z"
        }
      ],
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### 分配会话

```http
PUT /api/v1/conversations/{conversation_id}/assign
Authorization: Bearer {token}
Content-Type: application/json

{
  "assignee_id": 123,
  "team_id": 5  // 可选
}

Response:
{
  "success": true,
  "data": {
    "conversation": {
      "id": 456,
      "assignee": {
        "id": 123,
        "full_name": "客服李四"
      },
      "updated_at": "2024-01-15T10:35:00Z"
    }
  }
}
```

#### 切换服务类型 (AI ↔ 人工)

```http
PUT /api/v1/conversations/{conversation_id}/switch-agent
Authorization: Bearer {token}
Content-Type: application/json

{
  "agent_type": "human"  // 或 "ai"
}

Response:
{
  "success": true,
  "data": {
    "conversation": {
      "id": 456,
      "current_agent_type": "human",
      "agent_switched_at": "2024-01-15T10:35:00Z"
    }
  }
}
```

#### 更新会话状态

```http
PUT /api/v1/conversations/{conversation_id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "resolved"  // open, pending, resolved, closed
}
```

### 3. 消息管理 `/api/v1/conversations/{conversation_id}/messages`

#### 发送消息

```http
POST /api/v1/conversations/{conversation_id}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "感谢您的反馈，我们会尽快处理",
  "message_type": "text",
  "is_private": false,
  "metadata": {
    "attachments": [],
    "mentions": []
  }
}

Response:
{
  "success": true,
  "data": {
    "message": {
      "id": 1003,
      "uuid": "msg-uuid-3",
      "sender_type": "agent",
      "sender": {
        "id": 123,
        "full_name": "客服李四"
      },
      "content": "感谢您的反馈，我们会尽快处理",
      "message_type": "text",
      "is_private": false,
      "created_at": "2024-01-15T10:40:00Z"
    }
  }
}
```

#### 添加私有备注

```http
POST /api/v1/conversations/{conversation_id}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "客户情绪比较激动，需要耐心处理",
  "message_type": "text",
  "is_private": true
}
```

### 4. 客户管理 `/api/v1/contacts`

#### 获取客户列表

```http
GET /api/v1/contacts?search=张三&page=1&per_page=20
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": 789,
        "identifier": "customer-uuid",
        "name": "客户张三",
        "email": "customer@example.com",
        "phone": "+86 138****8888",
        "avatar_url": "https://...",
        "custom_attributes": {
          "vip_level": "gold",
          "source": "website"
        },
        "tags": ["VIP客户", "技术支持"],
        "last_activity_at": "2024-01-15T10:30:00Z",
        "conversations_count": 5,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 20,
      "total_count": 1520,
      "total_pages": 76
    }
  }
}
```

#### 获取客户详情

```http
GET /api/v1/contacts/{contact_id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "contact": {
      "id": 789,
      "identifier": "customer-uuid",
      "name": "客户张三",
      "email": "customer@example.com",
      "phone": "+86 138****8888",
      "custom_attributes": {
        "vip_level": "gold",
        "source": "website",
        "company": "示例公司"
      },
      "conversations": [
        {
          "id": 456,
          "status": "open",
          "channel_type": "web_widget",
          "created_at": "2024-01-15T10:00:00Z"
        }
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T09:00:00Z"
    }
  }
}
```

### 5. 团队管理 `/api/v1/teams`

#### 获取团队列表

```http
GET /api/v1/teams
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "teams": [
      {
        "id": 1,
        "name": "技术支持团队",
        "description": "负责技术相关问题的解答",
        "members_count": 8,
        "online_members_count": 5,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 6. 实时统计 `/api/v1/dashboard`

#### 获取仪表板数据

```http
GET /api/v1/dashboard/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "real_time": {
      "active_conversations": 45,
      "pending_conversations": 12,
      "online_agents": 8,
      "avg_response_time": 120  // 秒
    },
    "today": {
      "new_conversations": 156,
      "resolved_conversations": 134,
      "total_messages": 892,
      "avg_resolution_time": 1800  // 秒
    },
    "this_week": {
      "conversations_count": 1024,
      "resolution_rate": 0.89,
      "csat_score": 4.2
    }
  }
}
```

### 7. 报表管理 `/api/v1/reports`

#### 会话报表

```http
GET /api/v1/reports/conversations?start_date=2024-01-01&end_date=2024-01-31&group_by=day
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "metrics": [
      {
        "date": "2024-01-01",
        "conversations_count": 156,
        "resolved_count": 134,
        "avg_response_time": 120,
        "avg_resolution_time": 1800
      }
    ],
    "summary": {
      "total_conversations": 4856,
      "total_resolved": 4234,
      "resolution_rate": 0.87,
      "avg_response_time": 95
    }
  }
}
```

#### 客服工作量报表

```http
GET /api/v1/reports/agents?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "agents": [
      {
        "agent": {
          "id": 123,
          "full_name": "客服李四"
        },
        "conversations_count": 245,
        "resolved_count": 223,
        "avg_response_time": 85,
        "csat_score": 4.5,
        "online_hours": 160
      }
    ]
  }
}
```

## 🔄 WebSocket 实时接口

### 连接建立

```javascript
const ws = new WebSocket("ws://localhost:3001/admin/ws");

// 认证
ws.send(
  JSON.stringify({
    type: "auth",
    token: "jwt_token_here",
  })
);
```

### 实时事件推送

#### 新会话通知

```json
{
  "type": "conversation:new",
  "data": {
    "conversation": {
      "id": 456,
      "contact": {
        "name": "新客户",
        "email": "new@example.com"
      },
      "status": "open",
      "channel_type": "web_widget",
      "created_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

#### 新消息通知

```json
{
  "type": "message:new",
  "data": {
    "conversation_id": 456,
    "message": {
      "id": 1004,
      "sender_type": "contact",
      "content": "还有其他问题吗？",
      "created_at": "2024-01-15T11:05:00Z"
    }
  }
}
```

#### 会话状态变更

```json
{
  "type": "conversation:updated",
  "data": {
    "conversation_id": 456,
    "changes": {
      "status": "resolved",
      "assignee_id": 123
    },
    "updated_at": "2024-01-15T11:10:00Z"
  }
}
```

#### 客服状态变更

```json
{
  "type": "agent:status_changed",
  "data": {
    "agent_id": 123,
    "status": "online", // online, away, busy, offline
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

## 📱 移动端适配接口

### 移动端专用接口

```http
GET /api/v1/mobile/conversations/summary
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "my_conversations": {
      "open": 12,
      "pending": 3
    },
    "team_conversations": {
      "unassigned": 8,
      "urgent": 2
    },
    "notifications": [
      {
        "id": 1,
        "type": "new_message",
        "conversation_id": 456,
        "message": "来自客户张三的新消息",
        "created_at": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

### 推送通知配置

```http
POST /api/v1/mobile/push-tokens
Authorization: Bearer {token}
Content-Type: application/json

{
  "device_token": "device_push_token",
  "platform": "ios",  // ios, android
  "enabled": true
}
```

## 🛡️ API 安全策略

### 1. 请求限制

- 登录接口：5 次/分钟
- 一般接口：100 次/分钟
- 批量接口：10 次/分钟

### 2. 数据过滤

- 基于角色的数据访问控制
- 敏感信息自动脱敏
- SQL 注入防护

### 3. 审计日志

```json
{
  "user_id": 123,
  "action": "conversation:assign",
  "resource_id": 456,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2024-01-15T11:00:00Z"
}
```

## 📊 API 性能监控

### 关键指标

- 响应时间：P95 < 500ms
- 错误率：< 0.1%
- 并发连接：支持 1000+ WebSocket 连接
- 吞吐量：1000+ requests/second

### 缓存策略

- 用户信息：Redis 缓存 30 分钟
- 团队列表：内存缓存 10 分钟
- 统计数据：Redis 缓存 5 分钟

## 🔧 错误处理

### 统一错误格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数不正确",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  },
  "request_id": "req_123456789"
}
```

### 错误码定义

- `AUTH_REQUIRED`: 需要认证
- `PERMISSION_DENIED`: 权限不足
- `VALIDATION_ERROR`: 参数验证失败
- `RESOURCE_NOT_FOUND`: 资源不存在
- `RATE_LIMIT_EXCEEDED`: 请求频率超限
- `INTERNAL_ERROR`: 服务器内部错误
