-- Chat Admin Database Schema
-- MySQL 8.0+ 兼容
-- 字符集: utf8mb4_unicode_ci

USE chat_admin;

-- 1. 用户表 (客服人员)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role ENUM('admin', 'supervisor', 'agent', 'guest') NOT NULL DEFAULT 'agent',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    language VARCHAR(10) DEFAULT 'zh-CN',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role_status (role, status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 客户联系人表
CREATE TABLE IF NOT EXISTS customer_contacts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
    name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    custom_attributes JSON,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_last_seen (last_seen_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 收件箱表 (渠道管理)
CREATE TABLE IF NOT EXISTS inboxes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    channel_type ENUM('web_widget', 'facebook', 'whatsapp', 'email', 'api') NOT NULL,
    channel_config JSON,
    greeting_message TEXT,
    greeting_enabled BOOLEAN DEFAULT TRUE,
    working_hours_enabled BOOLEAN DEFAULT FALSE,
    working_hours JSON,
    auto_assignment_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_channel_type (channel_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 对话表
CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
    contact_id BIGINT NOT NULL,
    assignee_id BIGINT NULL,
    inbox_id BIGINT NOT NULL,
    status ENUM('open', 'pending', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    channel_type ENUM('web_widget', 'facebook', 'whatsapp', 'email', 'api') NOT NULL,
    current_agent_type ENUM('ai', 'human') NOT NULL DEFAULT 'ai',
    agent_switched_at TIMESTAMP NULL,
    first_reply_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contact_id) REFERENCES customer_contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (inbox_id) REFERENCES inboxes(id) ON DELETE CASCADE,
    
    INDEX idx_contact_id (contact_id),
    INDEX idx_assignee_id (assignee_id),
    INDEX idx_inbox_id (inbox_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_current_agent_type (current_agent_type),
    INDEX idx_last_activity (last_activity_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 消息表
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
    conversation_id BIGINT NOT NULL,
    sender_type ENUM('contact', 'agent', 'ai', 'system') NOT NULL,
    sender_id BIGINT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system', 'event') NOT NULL DEFAULT 'text',
    metadata JSON,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_type (sender_type),
    INDEX idx_sender_id (sender_id),
    INDEX idx_message_type (message_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 标签表
CREATE TABLE IF NOT EXISTS labels (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#1890ff',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 对话标签关联表
CREATE TABLE IF NOT EXISTS conversation_labels (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    label_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_conversation_label (conversation_id, label_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_label_id (label_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 团队表
CREATE TABLE IF NOT EXISTS teams (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 团队成员关联表
CREATE TABLE IF NOT EXISTS team_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    team_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_team_user (team_id, user_id),
    INDEX idx_team_id (team_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. 会话事件表 (用于审计和统计)
CREATE TABLE IF NOT EXISTS conversation_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    event_type ENUM('created', 'assigned', 'resolved', 'reopened', 'agent_switched', 'label_added', 'label_removed') NOT NULL,
    event_data JSON,
    user_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_event_type (event_type),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认数据
-- 默认管理员用户
INSERT INTO users (email, password_hash, full_name, role, status) VALUES 
('admin@chatadmin.com', '$2b$10$rQZ9uAKx8UQ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', '系统管理员', 'admin', 'active');

-- 默认收件箱
INSERT INTO inboxes (name, channel_type, greeting_message) VALUES 
('网站客服', 'web_widget', '您好！欢迎咨询，我是AI助手，有什么可以帮助您的吗？'),
('API接口', 'api', '欢迎使用API接口');

-- 默认标签
INSERT INTO labels (name, color, description) VALUES 
('紧急', '#ff4d4f', '需要紧急处理的问题'),
('技术支持', '#1890ff', '技术相关问题'),
('售前咨询', '#52c41a', '产品咨询和售前支持'),
('售后服务', '#faad14', '售后服务和问题处理'),
('投诉建议', '#722ed1', '用户投诉和建议');

-- 默认团队
INSERT INTO teams (name, description) VALUES 
('客服团队', '负责日常客户服务工作'),
('技术支持', '负责技术问题解答和支持'); 