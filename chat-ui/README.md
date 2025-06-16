# OpenChatAgent 前端项目

基于阿里巴巴官方 ChatUI 组件库构建的智能客服前端应用。

## 🎯 项目特性

- ✅ **官方 ChatUI 组件**: 完全基于 @chatui/core 3.0.0
- ✅ **WebSocket 实时通信**: 支持与 chat-core 后端服务通信
- ✅ **流式消息支持**: 实时显示 AI 回复内容
- ✅ **转人工功能**: 支持 AI 与人工客服切换
- ✅ **连接状态监控**: 实时显示连接健康状态
- ✅ **自动重连机制**: 网络断开时自动重连
- ✅ **消息队列**: 离线消息缓存和重发
- ✅ **打字指示器**: 显示 AI 正在输入状态
- ✅ **快捷回复**: 预设常用回复选项

## 🛠 技术栈

- **React 18.3.1** - 前端框架
- **Vite 6.3.5** - 构建工具
- **@chatui/core 3.0.0** - 阿里巴巴官方聊天 UI 组件
- **WebSocket** - 实时通信
- **UUID** - 唯一标识生成

## 📦 安装依赖

```bash
npm install
```

## 🚀 启动开发服务器

```bash
npm run dev
```

访问地址：http://localhost:8001

## 🔧 环境配置

创建 `.env` 文件：

```env
VITE_CHAT_CORE_WS_URL=ws://localhost:8002
```

## 📁 项目结构

```
chat-ui/
├── src/
│   ├── components/          # 组件目录
│   │   ├── StatusBar.jsx   # 状态栏组件
│   │   └── TypewriterBubble.jsx # 打字机效果组件
│   ├── hooks/              # 自定义 Hooks
│   │   └── useChat.js      # 聊天逻辑 Hook
│   ├── services/           # 服务层
│   │   └── websocketService.js # WebSocket 服务
│   ├── App.jsx             # 主应用组件
│   └── main.jsx            # 应用入口
├── docs/                   # 文档目录
│   └── ChatUI-Usage-Guide.md # ChatUI 使用指南
└── README.md               # 项目说明
```

## 🐛 已修复的问题

### 1. WebSocket 消息格式验证错误

**问题**: `"sessionId" must be a string` 验证错误
**解决**: 只在 sessionId 存在且为字符串时才包含该字段

### 2. setTyping 函数不存在错误

**问题**: `setTyping is not a function`
**解决**: ChatUI 的 useMessages 不提供 setTyping，改为手动管理 typing 状态

### 3. 输入框不清空问题

**问题**: 发送消息后输入框文字残留
**解决**: 确保 onSend 回调返回 Promise

### 4. 流式消息不显示问题

**问题**: WebSocket 返回的流式消息不在界面显示
**解决**: 正确处理 `stream` 类型消息，实时更新界面

### 5. 死循环问题

**问题**: WebSocket 无限重连导致页面卡死
**解决**:

- 限制最大重连次数
- 添加手动断线状态检查
- 防止重复欢迎消息

## 🔌 WebSocket 消息协议

### 发送消息格式

```javascript
{
  type: 'text',
  text: '用户输入的消息',
  id: 'uuid',
  timestamp: '2025-06-15T02:04:08.089Z',
  userId: 'user_1234567890',
  sessionId: 'session_uuid' // 可选，仅在会话初始化后包含
}
```

### 接收消息格式

```javascript
// 普通文本消息
{
  type: 'text',
  text: 'AI 回复内容',
  from: 'ai',
  timestamp: '2025-06-15T02:04:08.089Z'
}

// 流式消息
{
  type: 'stream',
  id: 'message_id',
  text: '当前文本片段',
  fullText: '完整文本内容',
  isComplete: false,
  from: 'ai',
  sessionId: 'session_uuid',
  timestamp: '2025-06-15T02:04:08.089Z'
}

// 系统消息
{
  type: 'system',
  message: '系统提示信息'
}

// 会话初始化
{
  type: 'session_init',
  sessionId: 'session_uuid'
}
```

## 🎨 组件使用示例

### 基本聊天组件

```javascript
import React from "react";
import Chat, { Bubble } from "@chatui/core";
import { useChat } from "./hooks/useChat";

const ChatApp = () => {
  const { messages, isTyping, handleSend, connectionHealth } = useChat();

  const renderMessageContent = (msg) => {
    return <Bubble content={msg.content.text} />;
  };

  return (
    <Chat
      messages={messages}
      renderMessageContent={renderMessageContent}
      onSend={handleSend}
      placeholder="请输入消息..."
    />
  );
};
```

## 📚 相关文档

- [ChatUI 官方使用指南](./docs/ChatUI-Usage-Guide.md)
- [阿里巴巴 ChatUI 官方文档](https://github.com/alibaba/ChatUI)

## 🔍 调试技巧

1. **开启 WebSocket 调试日志**:

   ```javascript
   const wsService = createWebSocketService({
     debug: true,
   });
   ```

2. **查看浏览器 WebSocket 连接**:

   - 打开开发者工具
   - 切换到 Network 标签
   - 筛选 WS (WebSocket) 连接
   - 查看消息收发情况

3. **检查连接状态**:
   ```javascript
   console.log(wsService.getState());
   ```

## 🚨 常见问题

### Q: 消息发送后输入框不清空？

A: 确保 `onSend` 回调返回 `Promise.resolve()`

### Q: 收到的消息不显示在界面上？

A: 检查消息格式是否正确，必须包含 `type`、`content.text`、`position`

### Q: WebSocket 连接失败？

A: 检查 chat-core 服务是否启动，端口是否正确

### Q: 出现 "setTyping is not a function" 错误？

A: ChatUI 的 useMessages 不提供 setTyping，需要手动管理 typing 状态

## �� 许可证

MIT License
