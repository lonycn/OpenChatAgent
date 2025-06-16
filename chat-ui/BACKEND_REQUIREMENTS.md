# 后端改进需求文档

## 📋 需求概述

为了提升用户体验，需要对后端WebSocket服务进行以下改进：

## 🎯 具体需求

### 1. 系统消息本地化

**当前问题**：

- 系统消息使用英文："Session initialized successfully."
- 对中文用户不友好

**改进需求**：

```javascript
// 当前 (chat-core/src/server/websocket.js:130)
message: `Session initialized successfully.`,

// 期望改为
message: `会话已成功建立`,
// 或者完全不显示此消息，仅在控制台记录
```

**实现建议**：

1. **选项A**：修改为中文消息
2. **选项B**：移除用户可见的初始化消息，仅保留服务端日志
3. **选项C**：添加配置项控制是否显示初始化消息

### 2. 用户身份管理优化

**当前问题**：

- 前端显示"用户: 未知"或使用sessionId
- 缺乏友好的用户标识

**改进需求**：

#### 2.1 用户ID生成策略

```javascript
// 建议的用户标识格式
{
  userId: "visitor_20241215_001",     // 访客ID
  displayName: "访客001",              // 显示名称
  sessionId: "sess_abc123...",        // 会话ID
  userType: "visitor",                // 用户类型：visitor/registered
  joinTime: "2024-12-15T10:30:00Z"   // 加入时间
}
```

#### 2.2 消息格式扩展

```javascript
// session_init 消息格式扩展
{
  type: "session_init",
  sessionId: "sess_abc123",
  user: {
    id: "visitor_20241215_001",
    displayName: "访客001",
    type: "visitor",
    joinTime: "2024-12-15T10:30:00Z"
  },
  message: "欢迎使用智能客服系统" // 可选的欢迎消息
}
```

### 3. 消息类型标准化

**当前问题**：

- 系统消息类型不统一
- 缺乏明确的消息分类

**改进需求**：

#### 3.1 消息类型定义

```javascript
const MESSAGE_TYPES = {
  // 用户消息
  USER_TEXT: "user_text",
  USER_IMAGE: "user_image",

  // 系统消息
  SYSTEM_INIT: "system_init", // 系统初始化
  SYSTEM_WELCOME: "system_welcome", // 欢迎消息
  SYSTEM_ERROR: "system_error", // 错误消息
  SYSTEM_NOTIFICATION: "system_notification", // 通知消息

  // AI回复
  AI_RESPONSE: "ai_response",
  AI_STREAMING: "streaming",

  // 转接相关
  HANDOVER_REQUEST: "handover_request",
  HANDOVER_SUCCESS: "handover_success",
  HANDOVER_FAILED: "handover_failed",

  // 会话管理
  SESSION_START: "session_start",
  SESSION_END: "session_end",
};
```

#### 3.2 系统消息配置

```javascript
// 系统消息配置
const SYSTEM_MESSAGES = {
  zh: {
    session_init: "会话已建立",
    welcome: "👋 您好！我是智能客服助手，很高兴为您服务！",
    handover_to_human: "🔄 正在为您转接人工客服，请稍候...",
    handover_to_ai: "🤖 已为您转接AI助手",
    connection_lost: "🔌 连接已断开，正在尝试重连...",
    connection_restored: "✅ 连接已恢复",
  },
  en: {
    session_init: "Session initialized",
    welcome: "👋 Hello! I'm your AI assistant, happy to help!",
    // ... 英文版本
  },
};
```

### 4. 配置管理

**改进需求**：

#### 4.1 环境配置

```javascript
// config/default.js
module.exports = {
  websocket: {
    // 消息配置
    messages: {
      locale: "zh", // 默认语言
      showInitMessage: false, // 是否显示初始化消息
      showWelcomeMessage: true, // 是否显示欢迎消息
      welcomeDelay: 1000, // 欢迎消息延迟(ms)
    },

    // 用户配置
    user: {
      visitorPrefix: "visitor", // 访客ID前缀
      displayNameFormat: "访客{number}", // 显示名称格式
      autoGenerateId: true, // 自动生成用户ID
    },
  },
};
```

## 🔧 实现优先级

### 高优先级 (立即实现)

1. ✅ **系统消息本地化** - 简单修改，影响用户体验
2. ✅ **移除或优化初始化消息** - 减少界面干扰

### 中优先级 (近期实现)

3. 🔄 **用户身份管理优化** - 提升用户体验
4. 🔄 **欢迎消息机制** - 更友好的用户引导

### 低优先级 (后续优化)

5. 📋 **消息类型标准化** - 代码规范化
6. 📋 **配置管理系统** - 系统可维护性

## 📝 API变更说明

### 新增消息类型

#### session_init (修改)

```javascript
// 发送给客户端
{
  type: "session_init",
  sessionId: "sess_abc123",
  user: {
    id: "visitor_20241215_001",
    displayName: "访客001",
    type: "visitor"
  }
  // 不再包含用户可见的message字段
}
```

#### system_welcome (新增)

```javascript
// 可选的欢迎消息
{
  type: "system_welcome",
  message: "👋 您好！我是智能客服助手，很高兴为您服务！",
  timestamp: "2024-12-15T10:30:01Z"
}
```

## 🧪 测试要求

### 功能测试

1. 验证初始化消息不再显示给用户
2. 验证用户身份信息正确生成和显示
3. 验证欢迎消息正确发送和显示

### 兼容性测试

1. 确保现有客户端功能不受影响
2. 验证新旧消息格式的兼容性

### 性能测试

1. 验证用户ID生成不影响连接性能
2. 测试大量并发连接的用户管理

## 📋 验收标准

### 用户体验

- [ ] 用户连接后不再看到英文的初始化消息
- [ ] 用户身份显示为友好的中文格式
- [ ] 欢迎消息及时且友好地显示

### 技术要求

- [ ] 代码符合现有架构规范
- [ ] 添加适当的错误处理
- [ ] 包含必要的日志记录
- [ ] 通过所有测试用例

## 🚀 部署计划

### 阶段1：紧急修复 (1-2天)

- 修改系统消息为中文
- 移除或优化初始化消息显示

### 阶段2：用户体验优化 (3-5天)

- 实现用户身份管理
- 添加欢迎消息机制

### 阶段3：系统完善 (1-2周)

- 消息类型标准化
- 配置管理系统

---

**联系方式**：如有技术问题，请联系前端开发团队进行接口对接确认。
