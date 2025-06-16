# 流式文本组件使用指南

## 概述

本项目提供了多种流式文本显示组件，用于实现类似ChatGPT的打字机效果。这些组件可以处理WebSocket实时流式数据，提供流畅的用户体验。

## 可用组件

### 1. StreamingMessage (推荐)

轻量级自定义组件，适合大多数场景。

**特点：**

- 零依赖
- 体积小
- 性能优秀
- 支持实时流式更新

**使用方法：**

```jsx
import StreamingMessage from "./components/StreamingMessage";

<StreamingMessage
  text={streamText}
  isComplete={isMessageComplete}
  speed={30} // 打字速度(毫秒)
/>;
```

### 2. TypeItStreamingMessage

基于TypeIt库的高级组件，功能更强大。

**特点：**

- 基于成熟的TypeIt库
- 支持更多动画效果
- 可自定义光标样式
- 支持生命周期回调

**使用方法：**

```jsx
import TypeItStreamingMessage from "./components/TypeItStreamingMessage";

<TypeItStreamingMessage
  text={streamText}
  isComplete={isMessageComplete}
  speed={50}
  showCursor={true}
  onComplete={() => console.log("打字完成")}
/>;
```

### 3. useStreamingText Hook

专门处理流式文本逻辑的Hook。

**使用方法：**

```jsx
import { useStreamingText } from "./hooks/useStreamingText";

const MyComponent = () => {
  const { displayText, isTyping, isComplete, updateStreamText, reset } =
    useStreamingText({
      speed: 50,
      enableTypewriter: true,
      onComplete: () => console.log("完成"),
    });

  // 更新流式文本
  const handleNewChunk = (newText, isComplete) => {
    updateStreamText(newText, isComplete);
  };

  return <div>{displayText}</div>;
};
```

## 在useChat中集成

修改`useChat.js`中的流式消息处理：

```jsx
import StreamingMessage from '../components/StreamingMessage';

// 在消息处理中使用
case "stream": {
  const messageId = data.id || `stream_${Date.now()}`;
  const streamText = data.fullText || data.text || data.content || "";

  if (currentStreamingMessageId.current !== messageId) {
    // 创建新的流式消息
    appendMsg({
      _id: messageId,
      type: "text",
      content: {
        text: (
          <StreamingMessage
            text={streamText}
            isComplete={data.isComplete}
            speed={30}
          />
        )
      },
      position: "left",
      user: {
        avatar: createElement(AIAvatar),
        name: "AI助手",
      },
    });
  } else {
    // 更新现有消息
    setMessages((prevMessages) => {
      // ... 更新逻辑
    });
  }
  break;
}
```

## WebSocket数据格式

确保你的WebSocket服务器发送以下格式的数据：

```json
{
  "id": "message-unique-id",
  "type": "stream",
  "text": "当前字符",
  "fullText": "完整的累积文本",
  "isComplete": false,
  "timestamp": "2025-06-15T03:10:19.701Z"
}
```

## 推荐的JavaScript库

### 1. TypeIt.js (最推荐)

- **官网**: https://www.typeitjs.com/
- **特点**: 功能强大，体积小(~4kb)，无依赖
- **价格**: 个人/开源免费，商业使用需付费

### 2. Typewriter Effect

- **GitHub**: https://github.com/tameemsafi/typewriterjs
- **特点**: 轻量级，易于使用
- **价格**: 完全免费

### 3. Typey.js

- **GitHub**: https://github.com/williamtroup/Typey.js
- **特点**: 轻量级，MIT许可
- **价格**: 完全免费

## 性能优化建议

1. **使用React.memo**包装组件避免不必要的重渲染
2. **合理设置打字速度**，太快可能影响用户体验
3. **及时清理定时器**，避免内存泄漏
4. **考虑虚拟化**，如果消息很多的话

## 故障排除

### 问题1: 流式文本不显示

- 检查WebSocket数据格式是否正确
- 确认`fullText`字段包含完整文本
- 检查组件的`text`和`isComplete`属性

### 问题2: 打字效果不流畅

- 调整`speed`参数
- 检查是否有其他定时器冲突
- 确保组件没有频繁重渲染

### 问题3: 内存泄漏

- 确保在组件卸载时清理定时器
- 使用useEffect的清理函数
- 避免在循环中创建定时器

## 会话初始化问题

关于"会话按钮显示未初始化"的问题：

这通常是正常现象，因为：

1. WebSocket连接需要时间建立
2. 会话初始化需要服务器确认
3. 可以添加连接状态指示器改善用户体验

```jsx
const ConnectionStatus = ({ connectionHealth }) => {
  const statusMap = {
    disconnected: "未连接",
    connecting: "连接中...",
    connected: "已连接",
    reconnecting: "重连中...",
    error: "连接错误",
  };

  return (
    <div className={`status-${connectionHealth}`}>
      {statusMap[connectionHealth] || "未知状态"}
    </div>
  );
};
```

## 示例演示

运行演示页面查看效果：

```jsx
import StreamingDemo from "./components/StreamingDemo";

// 在你的路由中添加
<Route path="/streaming-demo" component={StreamingDemo} />;
```

## 总结

- **简单场景**: 使用`StreamingMessage`组件
- **复杂需求**: 使用`TypeItStreamingMessage`组件
- **自定义逻辑**: 使用`useStreamingText` Hook
- **商业项目**: 考虑购买TypeIt商业许可证

选择合适的方案可以大大改善用户的聊天体验！
