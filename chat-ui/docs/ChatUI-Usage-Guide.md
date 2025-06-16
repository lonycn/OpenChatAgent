# ChatUI 官方使用指南

本文档总结了阿里巴巴官方 ChatUI (@chatui/core) 的正确使用方法，以及在开发过程中遇到的问题和解决方案。

## 1. 基本安装和导入

```bash
npm install @chatui/core
```

```javascript
import Chat, { Bubble, useMessages } from "@chatui/core";
import "@chatui/core/dist/index.css";
```

## 2. useMessages Hook 的正确用法

### ✅ 正确用法

```javascript
import { useMessages } from "@chatui/core";

const MyComponent = () => {
  // useMessages 只返回 messages 和 appendMsg
  const { messages, appendMsg } = useMessages([]);

  // 手动管理 typing 状态
  const [isTyping, setIsTyping] = useState(false);

  return (
    <Chat
      messages={messages}
      onSend={handleSend}
      // 其他属性...
    />
  );
};
```

### ❌ 错误用法

```javascript
// 错误：useMessages 没有 setTyping 方法
const { messages, appendMsg, setTyping } = useMessages([]);
// 这会导致 "setTyping is not a function" 错误
```

## 3. 消息格式规范

### 标准消息格式

```javascript
const message = {
  type: "text",
  content: { text: "消息内容" },
  position: "left", // 'left' | 'right' | 'center'
  user: {
    avatar: "🤖",
    name: "AI助手",
  },
};

appendMsg(message);
```

### 消息位置说明

- `left`: AI/客服消息（左侧显示）
- `right`: 用户消息（右侧显示）
- `center`: 系统消息（居中显示）

## 4. Chat 组件的正确配置

```javascript
<Chat
  messages={messages}
  renderMessageContent={renderMessageContent}
  onSend={handleSend}
  placeholder="请输入消息..."
  quickReplies={[
    { name: "你好", isNew: true, isHighlight: false },
    { name: "帮助", isNew: false, isHighlight: false },
    { name: "转人工", isNew: false, isHighlight: true },
  ]}
  onQuickReplyClick={handleQuickReplyClick}
/>
```

### 重要属性说明

- `messages`: 消息数组
- `renderMessageContent`: 自定义消息渲染函数
- `onSend`: 发送消息回调，**必须返回 Promise**
- `onQuickReplyClick`: 快捷回复点击回调

## 5. onSend 回调的正确实现

### ✅ 正确实现

```javascript
const handleSend = useCallback(
  (type, val) => {
    if (type === "text" && val.trim()) {
      // 添加用户消息
      appendMsg({
        type: "text",
        content: { text: val },
        position: "right",
      });

      // 发送到服务器
      sendToServer(val);
    }

    // 必须返回 Promise，这样输入框才会清空
    return Promise.resolve();
  },
  [appendMsg]
);
```

### ❌ 错误实现

```javascript
const handleSend = (type, val) => {
  // 处理消息...
  // 没有返回 Promise，输入框不会清空
};
```

## 6. 自定义消息渲染

```javascript
const renderMessageContent = (msg) => {
  const { content } = msg;

  // 使用官方 Bubble 组件
  return <Bubble content={content.text} />;
};
```

## 7. 快捷回复的正确处理

```javascript
const handleQuickReplyClick = (item) => {
  if (item.name === "转人工") {
    // 特殊操作
    handleHandoverRequest();
  } else {
    // 普通消息发送
    handleSend("text", item.name);
  }
};
```

## 8. 常见错误和解决方案

### 错误 1: setTyping is not a function

**原因**: ChatUI 的 useMessages 没有 setTyping 方法

**解决方案**: 手动管理 typing 状态

```javascript
const { messages, appendMsg } = useMessages([]);
const [isTyping, setIsTyping] = useState(false);
```

### 错误 2: 输入框不清空

**原因**: onSend 回调没有返回 Promise

**解决方案**: 确保 onSend 返回 Promise

```javascript
const handleSend = useCallback((type, val) => {
  // 处理逻辑...
  return Promise.resolve(); // 必须返回 Promise
}, []);
```

### 错误 3: 消息不显示

**原因**: 消息格式不正确

**解决方案**: 使用标准消息格式

```javascript
appendMsg({
  type: "text",
  content: { text: "消息内容" }, // 注意是 content.text
  position: "left",
});
```

## 9. WebSocket 集成最佳实践

### 消息处理

```javascript
const handleWebSocketMessage = useCallback(
  (data) => {
    switch (data.type) {
      case "text":
      case "message":
      case "response":
        appendMsg({
          type: "text",
          content: { text: data.text || data.content },
          position: "left",
          user: {
            avatar: "🤖",
            name: "AI助手",
          },
        });
        break;

      case "stream":
        // 流式消息处理
        appendMsg({
          type: "text",
          content: { text: data.text },
          position: "left",
          user: {
            avatar: "🤖",
            name: "AI助手",
          },
        });

        if (data.isComplete) {
          setIsTyping(false);
        }
        break;

      case "system":
        appendMsg({
          type: "text",
          content: { text: data.message },
          position: "center",
        });
        break;
    }
  },
  [appendMsg]
);
```

### 发送消息到服务器

```javascript
const handleSend = useCallback(
  (type, val) => {
    if (type === "text" && val.trim()) {
      // 1. 先添加用户消息到界面
      appendMsg({
        type: "text",
        content: { text: val },
        position: "right",
      });

      // 2. 发送到 WebSocket 服务器
      if (wsService && wsService.getState().connectionState === "CONNECTED") {
        const message = {
          type: "text",
          text: val,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          userId: currentUserId,
        };

        // 只在有 sessionId 时才添加
        if (sessionId && typeof sessionId === "string") {
          message.sessionId = sessionId;
        }

        wsService.send(message);
        setIsTyping(true); // 显示 AI 正在输入
      }
    }

    return Promise.resolve(); // 确保输入框清空
  },
  [appendMsg, wsService, sessionId, currentUserId]
);
```

## 10. 样式自定义

ChatUI 提供了丰富的 CSS 变量用于自定义样式：

```css
:root {
  --primary-color: #1890ff;
  --text-color: #333;
  --bg-color: #f5f5f5;
  --bubble-bg: #fff;
  --bubble-border-radius: 8px;
}
```

## 11. 性能优化建议

1. **使用 useCallback**: 所有事件处理函数都应该用 useCallback 包装
2. **避免频繁重渲染**: 使用 useRef 保存稳定的状态引用
3. **消息去重**: 防止重复添加相同消息
4. **内存清理**: 组件卸载时清理 WebSocket 连接

## 12. 调试技巧

1. **开启调试日志**: 在 WebSocket 服务中设置 `debug: true`
2. **监控消息流**: 在浏览器开发者工具中查看 WebSocket 消息
3. **状态检查**: 定期检查连接状态和消息队列

## 总结

使用 ChatUI 时需要注意：

1. `useMessages` 只返回 `messages` 和 `appendMsg`
2. `onSend` 必须返回 Promise
3. 消息格式必须包含 `type`、`content`、`position`
4. 手动管理 typing 状态
5. 正确处理 WebSocket 消息格式验证

遵循这些最佳实践可以避免常见错误，构建稳定可靠的聊天应用。
