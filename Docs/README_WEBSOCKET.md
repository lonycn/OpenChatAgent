# 🔌 WebSocket 实时通信实现指南

## 📋 概述

本系统使用 WebSocket 实现前端与后端的实时通信，替代传统的 HTTP 轮询方式，提供更好的用户体验和更低的延迟。

## 🏗️ 架构设计

```
前端 (React + ProChat)
    ↕️ WebSocket
消息网关 (chat-core)
    ↕️ HTTP API
AI服务 (ai-service) + 会话服务 (chat-session)
```

## 🔄 消息流程

### 1. 连接建立

```javascript
// 前端自动连接
websocketService.connect(eventHandlers);
```

### 2. 会话初始化

```javascript
// 第一条消息时发送init类型
{
  type: 'init',
  payload: {
    userId: 'generated-uuid',
    initialMessage: {
      text: '用户的第一条消息',
      type: 'text'
    }
  }
}
```

### 3. 常规消息

```javascript
// 后续消息发送text类型
{
  type: 'text',
  text: '用户消息内容',
  sessionId: 'session-uuid',
  userId: 'user-uuid'
}
```

### 4. AI 响应

```javascript
// 服务器返回AI回复
{
  id: 'message-uuid',
  from: 'ai',
  text: 'AI回复内容',
  timestamp: '2025-06-10T16:30:00.000Z',
  sessionId: 'session-uuid'
}
```

## 📁 关键文件

### 前端 WebSocket 服务

- **文件**: `chat-ui/src/services/websocketService.js`
- **功能**: 管理 WebSocket 连接、发送/接收消息
- **方法**:
  - `connect(eventHandlers)` - 建立连接
  - `sendMessage(messageObject)` - 发送消息
  - `disconnect()` - 断开连接

### 前端聊天容器

- **文件**: `chat-ui/src/components/Chat/ChatContainer.jsx`
- **功能**: ProChat 组件集成、消息状态管理
- **特性**:
  - 禁用 ProChat 内置 HTTP 请求 (`request={false}`)
  - 自定义消息处理逻辑
  - 会话状态显示

### 后端 WebSocket 服务器

- **文件**: `chat-core/src/server/websocket.js`
- **功能**: WebSocket 服务器实现、消息路由
- **特性**:
  - 连接管理
  - 消息验证
  - 错误处理

### 消息路由器

- **文件**: `chat-core/src/services/MessageRouter.js`
- **功能**: 消息分发到 AI 服务或人工客服
- **流程**:
  1. 接收 WebSocket 消息
  2. 创建/获取会话
  3. 调用 AI 服务
  4. 返回响应

### 消息验证

- **文件**: `chat-core/src/middleware/validation.js`
- **功能**: 验证 WebSocket 消息格式
- **支持类型**: `text`, `init`, `system`, `image`, `file`

## 🚀 使用方法

### 启动系统

```bash
npm run dev
```

### 访问前端

```
http://localhost:5173
```

### 发送消息

1. 页面加载后自动建立 WebSocket 连接
2. 输入消息并发送
3. 系统自动处理会话初始化
4. AI 服务返回智能回复

## 🔧 配置说明

### 环境变量

```bash
# WebSocket连接地址
VITE_CHAT_CORE_WS_URL=ws://localhost:3001

# API服务地址
VITE_CHAT_CORE_API_URL=http://localhost:3001/api
```

### ProChat 配置（重要！）

```javascript
<ProChat
  messages={messages}
  onSend={handleSendMessage}
  // 🚨 关键配置：完全拦截并禁用ProChat的内置HTTP请求
  request={async () => {
    // 返回一个永远不会resolve的Promise，阻止任何HTTP请求
    return new Promise(() => {});
  }}
  modelProvider="custom" // 自定义提供者
  config={{
    model: "custom",
    provider: "custom",
    baseURL: "", // 设置为空字符串
    apiKey: "", // 设置为空字符串
  }}
  // 强制禁用所有内置请求功能
  userMeta={{}}
  assistantMeta={{}}
  stream={false}
  autoSend={false}
/>
```

> ⚠️ **重要提示**：仅设置 `request={false}` 不足以完全禁用 ProChat 的 HTTP 请求。必须使用上述的 `request={async () => new Promise(() => {})}` 方式来完全拦截请求。

## 🐛 故障排除

### 常见问题

1. **WebSocket 连接失败**

   - 检查 chat-core 服务是否运行在 3001 端口
   - 确认防火墙设置

2. **消息发送失败**

   - 检查消息格式是否符合验证规则
   - 确认 WebSocket 连接状态

3. **AI 回复错误**

   - 检查 AI 服务是否正常运行
   - 确认 API 密钥配置（或使用 demo 模式）

4. **ProChat 仍然发送 HTTP 请求**
   - 现象：浏览器网络面板显示 `POST /api/openai/chat` 请求
   - 原因：ProChat 内置的 HTTP 请求机制没有完全禁用
   - 解决方案：使用 `request={async () => new Promise(() => {})}` 完全拦截请求
   - 验证：检查网络面板应该不再有 HTTP 请求，只有 WebSocket 连接

### 调试方法

1. **前端调试**

   ```javascript
   // 浏览器控制台查看WebSocket日志
   console.log("WebSocket状态:", websocketService.socket?.readyState);
   ```

2. **后端调试**
   ```bash
   # 查看服务日志
   npm run dev
   ```

## 📊 性能特点

- ✅ **实时通信**: 毫秒级消息传递
- ✅ **低延迟**: 无 HTTP 轮询开销
- ✅ **自动重连**: 连接断开自动恢复
- ✅ **消息验证**: 确保数据完整性
- ✅ **错误处理**: 完善的异常处理机制

## 🔄 扩展功能

### 支持的消息类型

- `text` - 文本消息
- `init` - 会话初始化
- `system` - 系统消息
- `image` - 图片消息（预留）
- `file` - 文件消息（预留）

### 代理切换

```javascript
// 切换到人工客服
handleSwitchAgent("human");

// 切换回AI
handleSwitchAgent("ai");
```

---

## 📝 更新日志

- **v1.0.0** - 基础 WebSocket 实现
- **v1.1.0** - 添加消息验证和错误处理
- **v1.2.0** - 支持会话初始化和代理切换
- **v1.3.0** - 集成 ProChat 组件，禁用 HTTP 模式
- **v1.4.0** - 修复 ProChat HTTP 请求问题，完全实现 WebSocket 通信
- **v1.5.0** - 修复 React 严格模式问题，优化连接稳定性

## 🎯 测试验证

### WebSocket 功能测试结果

```
✅ WebSocket连接成功
✅ 会话初始化正常 - 收到系统消息和会话ID
✅ AI回复正常 - 收到AI的智能回复
✅ 多轮对话正常 - 可以进行连续对话
✅ 连接管理正常 - 自动重连和错误处理
```

### 前端集成测试结果

```
✅ ProChat组件正常渲染
✅ WebSocket连接状态显示正确
✅ 消息发送和接收正常
✅ 会话状态管理正常
✅ 代理切换功能正常
```

---

_最后更新: 2025-06-11_
