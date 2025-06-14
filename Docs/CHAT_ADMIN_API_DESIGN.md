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
      "name": "张三",
      "username": "agent001",
      "role": "agent",
      "status": "active",
      "avatar_url": "https://..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh_token_string"
  }
}
```

#### 兼容登录接口

```http
POST /api/login/account
Content-Type: application/json

{
  "email": "agent@example.com",
  "password": "password123"
}
```

#### 刷新 Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token_string"
}

Response:
{
  "success": true,
  "data": {
    "user": {...},
    "token": "new_access_token",
    "refresh_token": "new_refresh_token"
  }
}
```

#### 登出

```http
POST /api/v1/auth/logout
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "message": "登出成功"
  }
}
```

#### 获取当前用户信息

```http
GET /api/v1/auth/me
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "agent@example.com",
      "name": "张三",
      "username": "agent001",
      "role": "agent",
      "status": "active",
      "avatar_url": "https://...",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

#### 更新用户资料

```http
PUT /api/v1/auth/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "新姓名",
  "avatar_url": "https://new-avatar.com/image.jpg"
}
```

#### 修改密码

```http
PUT /api/v1/auth/password
Authorization: Bearer {token}
Content-Type: application/json

{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

#### 注册新用户（管理员功能）

```http
POST /api/v1/auth/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "new_agent",
  "name": "新客服",
  "email": "new@example.com",
  "password": "password123",
  "role": "agent",
  "status": "active"
}
```

### 2. 会话管理 `/api/v1/conversations`

#### 获取会话列表

```http
GET /api/v1/conversations?status=open,pending&page=1&per_page=20&assignee_id=123&inbox_id=1&priority=high,medium&channel_type=web_widget&current_agent_type=ai&search=关键词
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
          "phone": "+86 138****8888",
          "avatar_url": "https://..."
        },
        "status": "open",
        "priority": "medium",
        "channel_type": "web_widget",
        "current_agent_type": "ai",
        "assignee": {
          "id": 123,
          "name": "客服李四",
          "avatar_url": "https://..."
        },
        "inbox": {
          "id": 1,
          "name": "网站客服"
        },
        "unread_count": 3,
        "last_message": {
          "content": "需要帮助",
          "sender_type": "contact",
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

#### 获取会话统计

```http
GET /api/v1/conversations/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "total_conversations": 1250,
    "open_conversations": 45,
    "pending_conversations": 12,
    "resolved_conversations": 1180,
    "closed_conversations": 13,
    "my_conversations": 8,
    "unassigned_conversations": 5,
    "avg_response_time": 120,
    "avg_resolution_time": 1800
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

#### 接管会话

```http
POST /api/v1/conversations/{conversation_id}/takeover
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "conversation": {
      "id": 456,
      "assignee": {
        "id": 123,
        "name": "客服李四"
      },
      "current_agent_type": "human",
      "updated_at": "2024-01-15T10:35:00Z"
    }
  }
}
```

#### 分配会话

```http
POST /api/v1/conversations/{conversation_id}/assign
Authorization: Bearer {token}
Content-Type: application/json

{
  "assignee_id": 123
}

Response:
{
  "success": true,
  "data": {
    "conversation": {
      "id": 456,
      "assignee": {
        "id": 123,
        "name": "客服李四"
      },
      "updated_at": "2024-01-15T10:35:00Z"
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

Response:
{
  "success": true,
  "data": {
    "conversation": {
      "id": 456,
      "status": "resolved",
      "updated_at": "2024-01-15T10:35:00Z"
    }
  }
}
```

#### 标记已解决

```http
POST /api/v1/conversations/{conversation_id}/resolve
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "conversation": {
      "id": 456,
      "status": "resolved",
      "resolved_at": "2024-01-15T10:35:00Z"
    }
  }
}
```

#### 关闭会话

```http
POST /api/v1/conversations/{conversation_id}/close
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "conversation": {
      "id": 456,
      "status": "closed",
      "closed_at": "2024-01-15T10:35:00Z"
    }
  }
}
```

#### 切换服务类型 (AI ↔ 人工)

```http
POST /api/v1/conversations/{conversation_id}/ai-switch
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

### 3. 消息管理 `/api/v1/conversations/{conversation_id}/messages`

#### 获取会话消息

```http
GET /api/v1/conversations/{conversation_id}/messages?page=1&per_page=20
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1001,
        "uuid": "msg-uuid",
        "conversation_id": 456,
        "sender_type": "contact",
        "sender": {
          "id": 789,
          "name": "客户张三",
          "email": "customer@example.com"
        },
        "content": "我需要技术支持",
        "message_type": "text",
        "is_private": false,
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z"
      },
      {
        "id": 1002,
        "uuid": "msg-uuid-2",
        "conversation_id": 456,
        "sender_type": "agent",
        "sender": {
          "id": 123,
          "name": "客服李四"
        },
        "content": "您好！请问遇到了什么问题？",
        "message_type": "text",
        "is_private": false,
        "created_at": "2024-01-15T10:01:00Z",
        "updated_at": "2024-01-15T10:01:00Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 20,
      "total_count": 25,
      "total_pages": 2
    }
  }
}
```

#### 发送消息

```http
POST /api/v1/conversations/{conversation_id}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "感谢您的反馈，我们会尽快处理",
  "message_type": "text",
  "is_private": false
}

Response:
{
  "success": true,
  "data": {
    "message": {
      "id": 1003,
      "uuid": "msg-uuid-3",
      "conversation_id": 456,
      "sender_type": "agent",
      "sender": {
        "id": 123,
        "name": "客服李四"
      },
      "content": "感谢您的反馈，我们会尽快处理",
      "message_type": "text",
      "is_private": false,
      "created_at": "2024-01-15T10:40:00Z",
      "updated_at": "2024-01-15T10:40:00Z"
    }
  }
}
```

#### 添加私有备注

```http
POST /api/v1/conversations/{conversation_id}/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "客户情绪比较激动，需要耐心处理"
}

Response:
{
  "success": true,
  "data": {
    "note": {
      "id": 1004,
      "conversation_id": 456,
      "content": "客户情绪比较激动，需要耐心处理",
      "created_by": {
        "id": 123,
        "name": "客服李四"
      },
      "created_at": "2024-01-15T10:45:00Z"
    }
  }
}
```

### 4. 客户管理 `/api/v1/customers`

#### 获取客户列表

```http
GET /api/v1/customers?search=张三&page=1&per_page=20&tags=VIP客户
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 789,
        "identifier": "customer-uuid",
        "name": "客户张三",
        "email": "customer@example.com",
        "phone": "+86 138****8888",
        "avatar_url": "https://...",
        "custom_attributes": {
          "vip_level": "gold",
          "source": "website",
          "company": "示例公司"
        },
        "tags": ["VIP客户", "技术支持"],
        "last_activity_at": "2024-01-15T10:30:00Z",
        "conversations_count": 5,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-15T09:00:00Z"
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
GET /api/v1/customers/{customer_id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "customer": {
      "id": 789,
      "identifier": "customer-uuid",
      "name": "客户张三",
      "email": "customer@example.com",
      "phone": "+86 138****8888",
      "avatar_url": "https://...",
      "custom_attributes": {
        "vip_level": "gold",
        "source": "website",
        "company": "示例公司"
      },
      "tags": ["VIP客户", "技术支持"],
      "last_activity_at": "2024-01-15T10:30:00Z",
      "conversations_count": 5,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T09:00:00Z"
    }
  }
}
```

#### 更新客户信息

```http
PUT /api/v1/customers/{customer_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "新客户姓名",
  "email": "new@example.com",
  "phone": "+86 139****9999",
  "avatar_url": "https://new-avatar.com/image.jpg"
}

Response:
{
  "success": true,
  "data": {
    "customer": {
      "id": 789,
      "name": "新客户姓名",
      "email": "new@example.com",
      "phone": "+86 139****9999",
      "avatar_url": "https://new-avatar.com/image.jpg",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

#### 获取客户会话历史

```http
GET /api/v1/customers/{customer_id}/conversations?page=1&per_page=20
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": 456,
        "status": "resolved",
        "channel_type": "web_widget",
        "assignee": {
          "id": 123,
          "name": "客服李四"
        },
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T11:00:00Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 20,
      "total_count": 5,
      "total_pages": 1
    }
  }
}
```

#### 管理客户标签

```http
POST /api/v1/customers/{customer_id}/tags
Authorization: Bearer {token}
Content-Type: application/json

{
  "tags": ["重要客户", "技术支持"]
}

Response:
{
  "success": true,
  "data": {
    "customer": {
      "id": 789,
      "tags": ["重要客户", "技术支持"],
      "updated_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

### 5. 用户管理 `/api/v1/users`

#### 获取用户列表（管理员权限）

```http
GET /api/v1/users?page=1&per_page=20&search=张三&role=agent&status=active
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 123,
        "username": "agent001",
        "name": "客服张三",
        "email": "agent@example.com",
        "role": "agent",
        "status": "active",
        "avatar_url": "https://...",
        "last_login_at": "2024-01-15T10:00:00Z",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-15T09:00:00Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 20,
      "total_count": 25,
      "total_pages": 2
    }
  }
}
```

#### 获取用户详情

```http
GET /api/v1/users/{user_id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "username": "agent001",
      "name": "客服张三",
      "email": "agent@example.com",
      "role": "agent",
      "status": "active",
      "avatar_url": "https://...",
      "last_login_at": "2024-01-15T10:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T09:00:00Z"
    }
  }
}
```

#### 创建用户（管理员权限）

```http
POST /api/v1/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "new_agent",
  "name": "新客服",
  "email": "new@example.com",
  "password": "Password123",
  "role": "agent",
  "status": "active"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": 124,
      "username": "new_agent",
      "name": "新客服",
      "email": "new@example.com",
      "role": "agent",
      "status": "active",
      "created_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

#### 更新用户

```http
PUT /api/v1/users/{user_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "更新后的姓名",
  "email": "updated@example.com",
  "role": "agent",
  "status": "active"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "name": "更新后的姓名",
      "email": "updated@example.com",
      "role": "agent",
      "status": "active",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

#### 删除用户（管理员权限）

```http
DELETE /api/v1/users/{user_id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "message": "用户删除成功"
  }
}
```

#### 重置用户密码（管理员权限）

```http
POST /api/v1/users/{user_id}/reset-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "new_password": "NewPassword123"
}

Response:
{
  "success": true,
  "data": {
    "message": "密码重置成功"
  }
}
```

#### 获取用户统计

```http
GET /api/v1/users/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "total_users": 25,
    "active_users": 22,
    "inactive_users": 3,
    "online_users": 8,
    "roles": {
      "admin": 2,
      "agent": 20,
      "viewer": 3
    }
  }
}
```

### 6. 报表管理 `/api/v1/reports`

#### 获取概览统计

```http
GET /api/v1/reports/overview?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "summary": {
      "total_conversations": 4856,
      "resolved_conversations": 4234,
      "pending_conversations": 245,
      "closed_conversations": 377,
      "resolution_rate": 0.87,
      "avg_response_time": 95,
      "avg_resolution_time": 1800,
      "customer_satisfaction": 4.2
    },
    "trends": {
      "conversations_growth": 0.15,
      "resolution_rate_change": 0.03,
      "response_time_change": -0.08
    }
  }
}
```

#### 会话统计报表

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
        "pending_count": 12,
        "closed_count": 10,
        "avg_response_time": 120,
        "avg_resolution_time": 1800
      }
    ],
    "summary": {
      "total_conversations": 4856,
      "total_resolved": 4234,
      "resolution_rate": 0.87,
      "avg_response_time": 95,
      "avg_resolution_time": 1650
    }
  }
}
```

#### 客服绩效报表

```http
GET /api/v1/reports/agents?start_date=2024-01-01&end_date=2024-01-31&agent_id=123
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "agents": [
      {
        "agent": {
          "id": 123,
          "name": "客服李四",
          "email": "agent@example.com"
        },
        "conversations_count": 245,
        "resolved_count": 223,
        "pending_count": 15,
        "closed_count": 7,
        "avg_response_time": 85,
        "avg_resolution_time": 1650,
        "customer_satisfaction": 4.5,
        "online_hours": 160,
        "resolution_rate": 0.91
      }
    ],
    "summary": {
      "total_agents": 12,
      "avg_conversations_per_agent": 203,
      "avg_resolution_rate": 0.88,
      "avg_response_time": 92
    }
  }
}
```

#### 响应时间统计

```http
GET /api/v1/reports/response-time?start_date=2024-01-01&end_date=2024-01-31&group_by=day
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "metrics": [
      {
        "date": "2024-01-01",
        "avg_response_time": 120,
        "min_response_time": 15,
        "max_response_time": 600,
        "median_response_time": 95
      }
    ],
    "summary": {
      "overall_avg_response_time": 95,
      "best_day": "2024-01-15",
      "worst_day": "2024-01-03",
      "improvement_trend": -0.08
    }
  }
}
```

#### 满意度统计

```http
GET /api/v1/reports/satisfaction?start_date=2024-01-01&end_date=2024-01-31&group_by=week
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "metrics": [
      {
        "period": "2024-W01",
        "avg_rating": 4.2,
        "total_ratings": 156,
        "rating_distribution": {
          "5": 78,
          "4": 45,
          "3": 20,
          "2": 8,
          "1": 5
        }
      }
    ],
    "summary": {
      "overall_satisfaction": 4.2,
      "total_responses": 1250,
      "response_rate": 0.65
    }
  }
}
```

#### 渠道统计

```http
GET /api/v1/reports/channels?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "channels": [
      {
        "channel_type": "web_widget",
        "conversations_count": 2856,
        "resolved_count": 2534,
        "avg_response_time": 85,
        "resolution_rate": 0.89
      },
      {
        "channel_type": "email",
        "conversations_count": 1245,
        "resolved_count": 1089,
        "avg_response_time": 120,
        "resolution_rate": 0.87
      }
    ],
    "summary": {
      "total_conversations": 4856,
      "most_active_channel": "web_widget",
      "best_performing_channel": "web_widget"
    }
  }
}
```

#### 导出报表

```http
GET /api/v1/reports/export?report_type=conversations&start_date=2024-01-01&end_date=2024-01-31&format=csv
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "download_url": "https://api.example.com/downloads/report_20240115.csv",
    "expires_at": "2024-01-15T12:00:00Z",
    "file_size": 2048576
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
