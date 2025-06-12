# 🏢 chat-admin 模块开发 TODO（完整版）

> **模块职责**：客服管理后台，提供人工客服接管界面、会话管理、客户管理、数据分析等完整客服工作台

## 🗄️ 数据库基础设施

### 🔥 P0 - 核心数据表设计

- [x] **数据库初始化脚本**

  - [x] 创建用户管理表 (`users`, `customer_contacts`)
  - [x] 创建会话管理表 (`conversations`, `messages`)
  - [x] 创建收件箱和渠道表 (`inboxes`)
  - [x] 创建团队管理表 (`teams`, `team_members`)
  - [x] 配置数据库索引策略
  - [x] 设置外键约束和数据完整性

- [ ] **Redis 数据结构设计**

  - [ ] 实时会话状态缓存
  - [ ] 客服在线状态管理
  - [ ] 工作负载分配算法
  - [ ] 消息队列和通知系统

- [ ] **数据迁移脚本**
  - [ ] 从当前 Redis 会话数据迁移到数据库
  - [ ] 历史消息数据导入
  - [ ] 客户信息整合和去重

## 🎯 MVP 核心任务（第 3 周）

### 🔥 P0 - 项目基础架构

- [x] **项目初始化**

  - [x] 创建 `chat-admin/` 目录结构
  - [x] 初始化 Node.js + Express 后端项目
  - [x] 安装核心依赖：`express`, `mysql2`, `bcrypt`, `jsonwebtoken`, `ws`
  - [x] 配置开发环境和数据库连接
  - [x] 设置 ESLint + Prettier 代码规范

- [x] **认证和权限系统**

  - [x] 实现 JWT 认证机制
  - [x] 客服登录 API（支持邮箱登录）
  - [x] 基于角色的权限控制 (RBAC)
  - [x] 路由守卫和权限验证
  - [x] Token 自动刷新机制

- [x] **基础布局和导航**
  - [x] ProLayout 主布局设计
  - [x] 侧边栏导航菜单
  - [x] 顶部工具栏（用户信息、通知、设置）
  - [x] 面包屑导航
  - [x] 响应式布局适配

### 🔥 P0 - 核心客服功能

- [ ] **会话管理中心**

  - [ ] 会话列表页面 (支持筛选、搜索、分页)
    - [ ] 状态筛选：全部/待分配/进行中/已解决/已关闭
    - [ ] 渠道筛选：网页/微信/邮件等
    - [ ] 优先级筛选：低/中/高/紧急
    - [ ] 客服筛选：我的/团队/未分配
  - [ ] 实时会话数据更新 (WebSocket)
  - [ ] 会话详情页面
    - [ ] 完整对话历史展示
    - [ ] 客户信息面板
    - [ ] 会话操作按钮 (分配/转移/关闭)

- [ ] **会话接管功能**

  - [ ] "接管会话"按钮和确认逻辑
  - [ ] AI ↔ 人工切换功能
  - [ ] 接管状态实时同步
  - [ ] 自动分配规则配置
  - [ ] 轮询分配算法实现

- [ ] **实时消息处理**
  - [ ] WebSocket 连接管理
  - [ ] 新消息实时接收和展示
  - [ ] 客服回复消息功能
  - [ ] 消息发送状态反馈
  - [ ] 消息未读数统计

### 🟡 P1 - 客户和数据管理

- [ ] **客户信息管理**

  - [ ] 客户列表页面 (搜索、筛选、分页)
  - [ ] 客户详情页面
    - [ ] 基本信息展示和编辑
    - [ ] 历史会话记录
    - [ ] 自定义属性管理
    - [ ] 客户标签系统
  - [ ] 客户分组和标签功能
  - [ ] 客户活动时间线

- [ ] **数据分析仪表板**
  - [ ] 实时数据概览
    - [ ] 当前活跃会话数
    - [ ] 待处理会话队列
    - [ ] 在线客服状态
    - [ ] 平均响应时间
  - [ ] 今日数据统计
  - [ ] 趋势图表展示
  - [ ] 数据自动刷新

## 🚀 扩展功能（第 4-5 周）

### 🟡 P1 - 高级客服功能

- [ ] **内部协作工具**

  - [ ] 私有备注系统 (`@mention` 支持)
  - [ ] 内部工作流协作
  - [ ] 客服状态管理 (在线/忙碌/离开)
  - [ ] 工作负载均衡显示

- [ ] **快捷操作工具**

  - [ ] 预设回复模板 (Canned Responses)
  - [ ] 快捷标签添加
  - [ ] 批量操作功能
  - [ ] 键盘快捷键支持

- [ ] **质量管理**
  - [ ] 客户满意度调查展示
  - [ ] 会话质量评分
  - [ ] 客服绩效统计
  - [ ] 服务时效监控

### 🟢 P2 - 管理员功能

- [ ] **用户和权限管理**

  - [ ] 客服账号管理 (增删改查)
  - [ ] 角色权限配置
  - [ ] 团队管理和分组
  - [ ] 收件箱权限分配

- [ ] **系统配置管理**

  - [ ] 工作时间设置
  - [ ] 自动回复配置
  - [ ] 会话路由规则
  - [ ] 通知设置管理

- [ ] **高级报表系统**
  - [ ] 会话量趋势分析
  - [ ] 客服工作量报表
  - [ ] 客户满意度报告
  - [ ] 渠道效果分析
  - [ ] 报表导出功能 (Excel/CSV)

## 📱 移动端适配（第 5-6 周）

### 🔥 P0 - 移动端核心功能

- [ ] **移动端响应式设计**

  - [ ] 断点设计和媒体查询
  - [ ] 移动端导航适配
  - [ ] 触屏交互优化
  - [ ] 移动端布局组件

- [ ] **PWA 支持**

  - [ ] Service Worker 配置
  - [ ] 离线缓存策略
  - [ ] 应用清单配置
  - [ ] 安装提示功能

- [ ] **移动端专用接口**
  - [ ] 轻量级数据接口
  - [ ] 消息推送 API
  - [ ] 移动端性能优化
  - [ ] 断网重连机制

### 🟡 P1 - 移动端增强体验

- [ ] **消息推送通知**

  - [ ] Web Push Notifications
  - [ ] 通知权限管理
  - [ ] 个性化通知设置
  - [ ] 通知点击跳转

- [ ] **移动端手势支持**
  - [ ] 滑动操作
  - [ ] 长按菜单
  - [ ] 下拉刷新
  - [ ] 上拉加载更多

## 📁 项目目录结构

```
chat-admin/
├── public/
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── components/           # 通用组件
│   │   ├── Chat/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── ConversationCard.tsx
│   │   ├── Customer/
│   │   │   ├── CustomerCard.tsx
│   │   │   ├── CustomerProfile.tsx
│   │   │   └── CustomerTags.tsx
│   │   ├── Dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   └── RealtimeStats.tsx
│   │   └── Common/
│   │       ├── Layout.tsx
│   │       ├── Loading.tsx
│   │       └── ErrorBoundary.tsx
│   ├── pages/               # 页面组件
│   │   ├── Dashboard/
│   │   │   └── index.tsx
│   │   ├── Conversations/
│   │   │   ├── List.tsx
│   │   │   ├── Detail.tsx
│   │   │   └── Inbox.tsx
│   │   ├── Customers/
│   │   │   ├── List.tsx
│   │   │   └── Detail.tsx
│   │   ├── Reports/
│   │   │   ├── Overview.tsx
│   │   │   ├── Agents.tsx
│   │   │   └── CSAT.tsx
│   │   ├── Settings/
│   │   │   ├── Profile.tsx
│   │   │   ├── Teams.tsx
│   │   │   └── Permissions.tsx
│   │   └── Auth/
│   │       ├── Login.tsx
│   │       └── ForgotPassword.tsx
│   ├── services/            # API 服务
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   ├── auth.ts
│   │   ├── conversations.ts
│   │   ├── customers.ts
│   │   └── reports.ts
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useConversations.ts
│   │   ├── useCustomers.ts
│   │   └── usePermissions.ts
│   ├── store/               # 状态管理
│   │   ├── auth.ts
│   │   ├── conversations.ts
│   │   ├── customers.ts
│   │   └── ui.ts
│   ├── utils/               # 工具函数
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── request.ts
│   │   ├── permissions.ts
│   │   └── formatters.ts
│   ├── types/               # TypeScript 类型定义
│   │   ├── api.ts
│   │   ├── conversation.ts
│   │   ├── customer.ts
│   │   ├── user.ts
│   │   └── common.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/                   # 测试文件
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── utils/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## 🔧 技术栈和依赖

### 核心技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: Ant Design + Pro Components
- **状态管理**: Zustand + React Query
- **路由**: React Router v6
- **HTTP 客户端**: axios
- **WebSocket**: socket.io-client
- **图表**: @ant-design/charts
- **表单**: Ant Design Form
- **测试框架**: Vitest + React Testing Library

### 开发工具

- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript
- **CSS 处理**: Tailwind CSS + CSS Modules
- **版本控制**: Git + Husky
- **构建部署**: Docker + Nginx

## 📋 数据模型 TypeScript 定义

```typescript
// 用户相关类型
interface User {
  id: number;
  email: string;
  username?: string;
  full_name: string;
  avatar_url?: string;
  role: "admin" | "supervisor" | "agent" | "guest";
  status: "active" | "inactive" | "suspended";
  timezone: string;
  language: string;
  permissions: Permission[];
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// 客户相关类型
interface Customer {
  id: number;
  identifier: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar_url?: string;
  custom_attributes: Record<string, any>;
  tags: string[];
  preferred_language: string;
  timezone?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

// 会话相关类型
interface Conversation {
  id: number;
  uuid: string;
  contact: Customer;
  assignee?: User;
  inbox_id: number;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  channel_type: "web_widget" | "facebook" | "whatsapp" | "email" | "api";
  current_agent_type: "ai" | "human";
  agent_switched_at?: string;
  labels: Label[];
  unread_count: number;
  last_message?: Message;
  created_at: string;
  updated_at: string;
}

// 消息相关类型
interface Message {
  id: number;
  uuid: string;
  conversation_id: number;
  sender_type: "contact" | "agent" | "ai" | "system";
  sender?: User;
  content: string;
  message_type: "text" | "image" | "file" | "system" | "event";
  metadata?: Record<string, any>;
  is_private: boolean;
  created_at: string;
}

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}
```

## 📊 验收标准

### 功能验收

- [ ] 客服能够成功登录并访问管理界面
- [ ] 支持会话列表查看和实时更新
- [ ] 会话接管和 AI ↔ 人工切换功能正常
- [ ] 客服能够发送消息和添加私有备注
- [ ] 客户信息查看和管理功能完整
- [ ] 数据统计和报表功能正常
- [ ] 移动端响应式适配良好

### 性能验收

- [ ] 页面首次加载时间 < 3 秒
- [ ] 消息实时延迟 < 500ms
- [ ] 支持 100+ 并发用户
- [ ] 移动端性能评分 > 90

### 安全验收

- [ ] JWT 认证机制完整
- [ ] 权限控制验证有效
- [ ] 敏感数据加密存储
- [ ] API 接口安全防护

## 🔗 系统集成

### 依赖服务

- **chat-core**: WebSocket 连接和 REST API
- **chat-session**: 会话数据管理
- **ai-service**: AI 响应处理
- **数据库**: PostgreSQL/MySQL + Redis

### 外部集成

- **消息推送**: Web Push API
- **文件存储**: 阿里云 OSS / AWS S3
- **监控分析**: Google Analytics / 百度统计

## 🚨 关键注意事项

### 开发优先级

1. **基础功能优先**: 登录、会话列表、消息收发
2. **实时性保障**: WebSocket 连接稳定性
3. **用户体验**: 界面响应速度和交互流畅度
4. **移动端适配**: 渐进式增强，桌面优先

### 架构考虑

1. **可扩展性**: 支持插件化扩展
2. **国际化**: 多语言支持预留
3. **主题定制**: 支持企业品牌定制
4. **性能优化**: 代码分割和懒加载

### 安全考虑

1. **数据权限**: 严格的角色权限控制
2. **接口安全**: API 防护和限流
3. **客户隐私**: 敏感信息保护
4. **审计日志**: 操作行为记录

## 🎯 里程碑规划

### 第 3 周末 (MVP 完成)

- [ ] 基础认证和权限系统
- [ ] 会话列表和详情页面
- [ ] 基础消息收发功能
- [ ] 简单的数据统计

### 第 4 周末 (功能增强)

- [ ] 客户管理功能
- [ ] 高级会话操作
- [ ] 报表和分析
- [ ] 内部协作工具

### 第 5 周末 (移动端适配)

- [ ] 响应式设计完成
- [ ] PWA 功能实现
- [ ] 移动端优化
- [ ] 推送通知功能

### 第 6 周末 (完善和部署)

- [ ] 性能优化和测试
- [ ] 安全加固
- [ ] 部署文档
- [ ] 用户培训材料
