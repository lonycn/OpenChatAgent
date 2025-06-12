# Chat Admin - 智能客服管理后台

> **版本**: 1.0.0
> **状态**: 开发中 🚧

## 📋 项目概述

Chat Admin 是一个现代化的智能客服管理后台系统，提供完整的客服工作台、会话管理、客户管理和数据分析功能。

## 🏗️ 项目架构

```
chat-admin/
├── frontend/          # React + TypeScript + Ant Design 前端
├── src/              # Node.js + Express 后端 API
├── config/           # 数据库和服务配置
├── scripts/          # 数据库脚本和工具
└── docs/            # 项目文档
```

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0

### 2. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend && npm install
```

### 3. 数据库配置

```bash
# 确保 MySQL 服务运行
mysql.server start

# 导入数据库结构和初始数据
npm run migrate
```

### 4. 启动开发服务

```bash
# 方式1: 同时启动前后端
npm run dev

# 方式2: 分别启动
npm run dev:backend   # 后端 API (端口 3004)
npm run dev:frontend  # 前端界面 (端口 3005)
```

## 🌐 访问地址

- **管理后台**: http://localhost:3005
- **API 文档**: http://localhost:3004/health
- **默认账号**: admin@chatadmin.com / admin123456

## 📊 已完成功能

### ✅ 数据库设计和基础设施

- [x] 10 个核心数据表设计
- [x] MySQL 数据库初始化脚本
- [x] 数据索引和外键约束配置
- [x] 默认数据和测试账号

### ✅ 后端 API 系统

- [x] Express.js RESTful API 架构
- [x] JWT 认证和权限控制系统
- [x] 用户管理 CRUD 操作
- [x] 数据库连接池和事务支持
- [x] 请求验证和错误处理

### ✅ 前端界面框架

- [x] React 18 + TypeScript 项目架构
- [x] Ant Design 组件库集成
- [x] 路由守卫和状态管理 (Zustand)
- [x] 主布局和导航系统
- [x] 登录页面和认证流程
- [x] 响应式设计适配

### ✅ 认证系统

- [x] JWT Token 生成和验证
- [x] 用户登录/登出 API
- [x] Token 自动刷新机制
- [x] 基于角色的权限控制 (RBAC)
- [x] 前端路由守卫

## 🛠️ 开发中功能

### 🔄 会话管理

- [ ] 实时会话列表
- [ ] 会话详情页面
- [ ] AI/人工切换功能
- [ ] WebSocket 实时通信

### 🔄 客户管理

- [ ] 客户信息管理
- [ ] 客户标签系统
- [ ] 历史会话记录

### 🔄 数据报表

- [ ] 实时数据仪表板
- [ ] 客服绩效统计
- [ ] 满意度分析

## 📁 核心文件结构

```
chat-admin/
├── frontend/
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API 服务
│   │   ├── store/         # 状态管理
│   │   ├── types/         # TypeScript 类型
│   │   └── utils/         # 工具函数
│   ├── public/            # 静态资源
│   └── package.json       # 前端依赖配置
├── src/
│   ├── controllers/       # API 控制器
│   ├── middleware/        # 中间件
│   ├── models/           # 数据模型
│   ├── routes/           # 路由配置
│   └── services/         # 业务逻辑
├── config/
│   └── database.js       # 数据库配置
└── scripts/
    └── init-database.js  # 数据库初始化
```

## 🔧 开发工具

### 后端技术栈

- **框架**: Express.js + Node.js
- **数据库**: MySQL 8.0 + Redis
- **认证**: JWT + bcrypt
- **验证**: express-validator + Joi
- **测试**: Jest + Supertest

### 前端技术栈

- **框架**: React 18 + TypeScript
- **构建**: Vite
- **UI 库**: Ant Design + Pro Components
- **状态**: Zustand + React Query
- **路由**: React Router v6

## 📋 可用脚本

```bash
# 开发环境
npm run dev              # 启动前后端开发服务
npm run dev:backend      # 仅启动后端 API
npm run dev:frontend     # 仅启动前端界面

# 生产环境
npm start               # 启动后端服务
npm run build           # 构建前端静态文件

# 数据库
npm run migrate         # 运行数据库迁移
npm run seed           # 插入初始数据

# 代码质量
npm run lint           # 代码检查
npm run test           # 运行测试
```

## 🔍 API 测试

```bash
# 健康检查
curl http://localhost:3004/health

# 用户登录
curl -X POST http://localhost:3004/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@chatadmin.com", "password": "admin123456"}'

# 获取用户信息
curl http://localhost:3004/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚧 下一步开发计划

1. **实时通信** - WebSocket 集成和消息实时推送
2. **会话管理** - 完整的会话列表和详情页面
3. **客户系统** - 客户信息管理和标签系统
4. **数据报表** - 图表组件和统计分析
5. **移动适配** - PWA 支持和移动端优化

## 📞 技术支持

如有问题请查看:

- [API 设计文档](../docs/CHAT_ADMIN_API_DESIGN.md)
- [数据库设计文档](../docs/CHAT_ADMIN_DATABASE_DESIGN.md)
- [开发计划文档](../docs/TODO_chat-admin.md)

---

**项目状态**: 🟡 核心功能开发中 | **进度**: 35% | **预计完成**: 2 周内

## 🗄️ 数据库设计

### 核心表结构

1. **users** - 客服人员表
2. **customer_contacts** - 客户联系人表
3. **conversations** - 对话表
4. **messages** - 消息表
5. **inboxes** - 收件箱/渠道表
6. **labels** - 标签表
7. **teams** - 团队表
8. **conversation_events** - 对话事件表

### 数据库连接配置

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chat_admin
DB_USER=root
DB_PASSWORD=123456
```

## 🔗 相关项目

- [chat-ui](../chat-ui/) - 前端聊天界面
- [chat-core](../chat-core/) - 消息网关服务
- [ai-service](../ai-service/) - AI 服务封装
- [chat-session](../chat-session/) - 会话管理

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**下一步开发计划**: 实现用户管理功能和对话管理系统

## 🎯 API 端点

### 认证接口

- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/refresh` - 刷新令牌
- `POST /api/v1/auth/logout` - 用户登出
- `GET /api/v1/auth/me` - 获取当前用户信息
- `PUT /api/v1/auth/profile` - 更新用户资料
- `PUT /api/v1/auth/password` - 修改密码
- `POST /api/v1/auth/register` - 注册新用户（管理员）

### 系统接口

- `GET /health` - 健康检查
