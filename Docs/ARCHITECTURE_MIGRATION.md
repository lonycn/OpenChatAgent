# 🚀 OpenChatAgent 架构迁移指南

## 📋 迁移概述

本文档记录了 OpenChatAgent 从 v2.0 微服务架构到 v3.0 统一服务架构的完整迁移过程。

### 🎯 迁移目标

- ✅ **简化架构**: 从 6 个服务减少到 3 个服务
- ✅ **提升性能**: 使用 Python FastAPI 替代 Node.js 微服务
- ✅ **降低复杂度**: 减少服务间通信开销
- ✅ **统一技术栈**: 后端统一使用 Python
- ✅ **改善维护性**: 单一代码库，便于管理

## 🔄 架构对比

### v2.0 旧架构 (已废弃)

```
┌─────────────────┐    ┌─────────────────┐
│  chat-ui:8001   │    │chat-admin-ui:8006│
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ chat-core:8002  │    │ chat-admin:8005 │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
    ┌─────┴─────┐                │
    ▼           ▼                ▼
┌─────────┐ ┌─────────┐    ┌─────────┐
│ai-service│ │chat-    │    │ MySQL   │
│  :8003   │ │session  │    │Database │
│          │ │ :8004   │    │         │
└─────────┘ └─────────┘    └─────────┘
                │
                ▼
            ┌─────────┐
            │  Redis  │
            │Database │
            └─────────┘
```

**问题**:
- 🔴 服务过多，部署复杂
- 🔴 服务间通信开销大
- 🔴 技术栈不统一 (Node.js)
- 🔴 配置管理复杂

### v3.0 新架构 (当前)

```
┌─────────────────┐    ┌─────────────────┐
│chat-front:8001  │    │chat-admin-ui:8006│
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────┬─────────────────┘
                 ▼
        ┌─────────────────┐
        │  chat-api:8000  │
        │   (FastAPI)     │
        │                 │
        │ ┌─────────────┐ │
        │ │ WebSocket   │ │
        │ │ Module      │ │
        │ └─────────────┘ │
        │ ┌─────────────┐ │
        │ │ AI Service  │ │
        │ │ Module      │ │
        │ └─────────────┘ │
        │ ┌─────────────┐ │
        │ │ Session     │ │
        │ │ Module      │ │
        │ └─────────────┘ │
        │ ┌─────────────┐ │
        │ │ Admin       │ │
        │ │ Module      │ │
        │ └─────────────┘ │
        └─────────┬───────┘
                  │
        ┌─────────┴───────┐
        ▼                 ▼
    ┌─────────┐       ┌─────────┐
    │  MySQL  │       │  Redis  │
    │Database │       │Database │
    └─────────┘       └─────────┘
```

**优势**:
- ✅ 服务数量减少 50%
- ✅ 统一的 Python 技术栈
- ✅ 更好的性能表现
- ✅ 简化的部署流程

## 📦 服务映射关系

| 旧服务 (v2.0) | 端口 | 新模块 (v3.0) | 位置 |
|---------------|------|---------------|------|
| chat-core | 8002 | WebSocket 模块 | `chat-api/src/websocket/` |
| ai-service | 8003 | AI 服务模块 | `chat-api/src/ai/` |
| chat-session | 8004 | 会话管理模块 | `chat-api/src/session/` |
| chat-admin | 8005 | 管理后台模块 | `chat-api/src/admin/` |
| chat-ui | 8001 | chat-front | `chat-front/` (重命名) |
| chat-admin-ui | 8006 | chat-admin-ui | `chat-admin-ui/` (保持) |

## 🔧 接口迁移

### WebSocket 接口

**旧接口**:
```
ws://localhost:8002/ws
```

**新接口**:
```
ws://localhost:8000/ws
```

### REST API 接口

**旧接口**:
```
http://localhost:8002/api/*
http://localhost:8003/api/*
http://localhost:8004/api/*
http://localhost:8005/api/*
```

**新接口**:
```
http://localhost:8000/api/v1/*
```

### 前端配置更新

**chat-front 配置更新**:
```javascript
// 旧配置
const WS_URL = 'ws://localhost:8002';
const API_URL = 'http://localhost:8002/api';

// 新配置
const WS_URL = 'ws://localhost:8000/ws';
const API_URL = 'http://localhost:8000/api/v1';
```

**chat-admin-ui 配置更新**:
```javascript
// 旧配置
const API_BASE_URL = 'http://localhost:8005/api/v1';
const WS_URL = 'ws://localhost:3001/ws';

// 新配置
const API_BASE_URL = 'http://localhost:8000/api/v1';
const WS_URL = 'ws://localhost:8000/ws';
```

## 📝 迁移检查清单

### ✅ 已完成

- [x] **删除旧服务**: ai-service, chat-admin, chat-core, chat-session
- [x] **更新前端配置**: chat-front WebSocket 和 API 地址
- [x] **更新管理后台配置**: chat-admin-ui 接口地址
- [x] **更新环境变量**: .env.example 文件
- [x] **更新端口配置**: PORT_CONFIGURATION.md
- [x] **更新项目文档**: README.md
- [x] **清理过时文档**: docs/ 目录整理

### 🔄 验证步骤

1. **启动服务验证**:
   ```bash
   # 启动 chat-api
   cd chat-api && python run.py
   
   # 启动 chat-front
   cd chat-front && npm run dev
   
   # 启动 chat-admin-ui
   cd chat-admin-ui && npm run start:dev
   ```

2. **功能验证**:
   - [ ] 用户聊天界面正常工作
   - [ ] WebSocket 连接正常
   - [ ] AI 回复功能正常
   - [ ] 管理后台登录正常
   - [ ] 会话管理功能正常

3. **接口验证**:
   ```bash
   # 健康检查
   curl http://localhost:8000/health
   
   # API 文档
   curl http://localhost:8000/docs
   ```

## 🚨 注意事项

1. **数据库兼容性**: 确保 MySQL 和 Redis 配置正确
2. **环境变量**: 更新所有相关的环境变量配置
3. **依赖管理**: Python 和 Node.js 依赖分别管理
4. **端口冲突**: 确保端口 8000, 8001, 8006 可用

## 📚 相关文档

- [chat-api README](../chat-api/README.md) - 后端 API 详细文档
- [PORT_CONFIGURATION.md](../PORT_CONFIGURATION.md) - 端口配置说明
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排除指南

---

**迁移完成日期**: 2025-06-16  
**迁移负责人**: OpenChatAgent Team  
**版本**: v3.0.0
