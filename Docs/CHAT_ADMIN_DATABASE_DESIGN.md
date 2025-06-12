# 🗄️ chat-admin 数据库设计文档

## 📋 数据库架构总览

基于当前 Redis + 关系型数据库的混合架构：

- **Redis**: 实时会话状态、缓存
- **PostgreSQL/MySQL**: 持久化数据存储

## 📊 核心数据表设计

### 1. 用户管理表

#### `users` (系统用户表)

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200),
  avatar_url VARCHAR(500),
  role ENUM('admin', 'supervisor', 'agent', 'guest') DEFAULT 'agent',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  timezone VARCHAR(100) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'zh-CN',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_role_status (role, status),
  INDEX idx_last_login (last_login_at)
);
```

#### `customer_contacts` (客户联系人表)

```sql
CREATE TABLE customer_contacts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  identifier VARCHAR(255) UNIQUE NOT NULL, -- 统一客户标识
  email VARCHAR(255),
  phone VARCHAR(50),
  name VARCHAR(200),
  avatar_url VARCHAR(500),
  custom_attributes JSON, -- 自定义属性
  tags JSON, -- 客户标签
  preferred_language VARCHAR(10) DEFAULT 'zh-CN',
  timezone VARCHAR(100),
  last_activity_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_identifier (identifier),
  INDEX idx_last_activity (last_activity_at)
);
```

### 2. 会话管理表

#### `conversations` (会话表)

```sql
CREATE TABLE conversations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL, -- 对应 Redis session_id
  contact_id BIGINT,
  assignee_id BIGINT NULL, -- 分配的客服
  inbox_id BIGINT NOT NULL,
  status ENUM('open', 'pending', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  channel_type ENUM('web_widget', 'facebook', 'whatsapp', 'email', 'api') NOT NULL,
  current_agent_type ENUM('ai', 'human') DEFAULT 'ai',
  agent_switched_at TIMESTAMP NULL,
  first_response_at TIMESTAMP NULL,
  resolved_at TIMESTAMP NULL,
  sla_policy_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (contact_id) REFERENCES customer_contacts(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (inbox_id) REFERENCES inboxes(id),

  INDEX idx_uuid (uuid),
  INDEX idx_status (status),
  INDEX idx_assignee (assignee_id),
  INDEX idx_created_at (created_at),
  INDEX idx_channel_type (channel_type)
);
```

#### `messages` (消息表)

```sql
CREATE TABLE messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  conversation_id BIGINT NOT NULL,
  sender_type ENUM('contact', 'agent', 'ai', 'system') NOT NULL,
  sender_id BIGINT NULL, -- 如果是客服发送
  content TEXT NOT NULL,
  message_type ENUM('text', 'image', 'file', 'system', 'event') DEFAULT 'text',
  metadata JSON, -- 附件、链接等元数据
  is_private BOOLEAN DEFAULT FALSE, -- 是否为内部备注
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id),

  INDEX idx_conversation (conversation_id),
  INDEX idx_created_at (created_at),
  INDEX idx_sender (sender_type, sender_id)
);
```

### 3. 收件箱和渠道表

#### `inboxes` (收件箱表)

```sql
CREATE TABLE inboxes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  channel_type ENUM('web_widget', 'facebook', 'whatsapp', 'email', 'api') NOT NULL,
  settings JSON, -- 渠道特定配置
  auto_assignment BOOLEAN DEFAULT TRUE,
  working_hours JSON, -- 工作时间配置
  out_of_office_message TEXT,
  greeting_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_channel_type (channel_type)
);
```

### 4. 团队和分配表

#### `teams` (团队表)

```sql
CREATE TABLE teams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  allow_auto_assign BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `team_members` (团队成员表)

```sql
CREATE TABLE team_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role ENUM('member', 'lead') DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_team_user (team_id, user_id),
  INDEX idx_team (team_id),
  INDEX idx_user (user_id)
);
```

#### `inbox_members` (收件箱权限表)

```sql
CREATE TABLE inbox_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  inbox_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (inbox_id) REFERENCES inboxes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_inbox_user (inbox_id, user_id)
);
```

### 5. 反馈和评价表

#### `csat_survey_responses` (客户满意度调查)

```sql
CREATE TABLE csat_survey_responses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id BIGINT NOT NULL,
  contact_id BIGINT,
  assigned_agent_id BIGINT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (contact_id) REFERENCES customer_contacts(id),
  FOREIGN KEY (assigned_agent_id) REFERENCES users(id),

  INDEX idx_conversation (conversation_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
);
```

### 6. 自动化和标签表

#### `labels` (标签表)

```sql
CREATE TABLE labels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#1f93ff', -- hex 颜色
  show_on_sidebar BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_title (title)
);
```

#### `conversation_labels` (会话标签关联表)

```sql
CREATE TABLE conversation_labels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id BIGINT NOT NULL,
  label_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,

  UNIQUE KEY unique_conversation_label (conversation_id, label_id)
);
```

#### `canned_responses` (预设回复模板)

```sql
CREATE TABLE canned_responses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  short_code VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY unique_short_code (short_code)
);
```

### 7. 知识库表

#### `articles` (知识库文章表)

```sql
CREATE TABLE articles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(300) NOT NULL,
  content LONGTEXT NOT NULL,
  description TEXT,
  slug VARCHAR(300) UNIQUE,
  category_id BIGINT,
  author_id BIGINT,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  views INTEGER DEFAULT 0,
  meta_title VARCHAR(300),
  meta_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (author_id) REFERENCES users(id),

  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_slug (slug),
  FULLTEXT idx_content (title, content, description)
);
```

### 8. 报表和统计表

#### `reporting_events` (报表事件表)

```sql
CREATE TABLE reporting_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  value DECIMAL(15,2),
  conversation_id BIGINT,
  inbox_id BIGINT,
  user_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_name_created (name, created_at),
  INDEX idx_conversation (conversation_id),
  INDEX idx_inbox (inbox_id),
  INDEX idx_user (user_id)
);
```

## 🔄 Redis 数据结构设计

### 实时会话状态

```
session:{session_id}:meta          # 会话元数据
session:{session_id}:agent         # 当前服务代理 (ai/human)
session:{session_id}:history       # 消息历史 (List)
session:{session_id}:typing        # 正在输入状态
```

### 客服在线状态

```
agent:{user_id}:status            # 在线状态 (online/away/busy/offline)
agent:{user_id}:current_sessions  # 当前处理的会话 (Set)
active_agents                     # 当前在线客服列表 (Sorted Set)
```

### 工作负载分配

```
inbox:{inbox_id}:queue           # 待分配会话队列
inbox:{inbox_id}:round_robin     # 轮询分配状态
team:{team_id}:load_balancer     # 团队负载均衡
```

## 📈 数据索引策略

### 高频查询索引

1. **会话列表查询**: `(status, created_at)`, `(assignee_id, status)`
2. **消息查询**: `(conversation_id, created_at)`
3. **客户搜索**: `(email)`, `(phone)`, `(name)`
4. **统计报表**: `(created_at)`, `(inbox_id, created_at)`

### 复合索引优化

```sql
-- 客服工作台查询优化
CREATE INDEX idx_conversations_agent_dashboard
ON conversations (assignee_id, status, updated_at);

-- 收件箱会话列表优化
CREATE INDEX idx_conversations_inbox_status
ON conversations (inbox_id, status, priority, created_at);

-- 报表统计优化
CREATE INDEX idx_messages_reporting
ON messages (created_at, conversation_id, sender_type);
```

## 🔒 数据安全策略

### 1. 敏感数据加密

- 客户邮箱、手机号码字段加密
- 消息内容支持端到端加密选项
- API 密钥和第三方集成凭据加密存储

### 2. 数据访问控制

- 基于角色的访问控制 (RBAC)
- 收件箱级别的权限控制
- 客户数据访问日志记录

### 3. 数据备份策略

- 定期数据库备份
- Redis 持久化配置
- 关键业务数据异地备份

## 🚀 性能优化策略

### 1. 查询优化

- 分表分库策略 (按时间/收件箱分片)
- 读写分离架构
- 查询缓存策略

### 2. 实时性能

- WebSocket 连接池管理
- Redis 集群部署
- CDN 静态资源加速

### 3. 扩展性设计

- 水平扩展支持
- 微服务架构兼容
- API 接口版本管理

## 📊 数据分析需求

### 1. 实时指标

- 活跃会话数量
- 客服在线状态
- 平均响应时间
- 待处理会话队列长度

### 2. 历史报表

- 会话量趋势分析
- 客服工作量统计
- 客户满意度报告
- 渠道效果分析

### 3. 业务洞察

- 客户行为分析
- 问题分类统计
- 知识库使用效果
- 自动化规则效果评估
