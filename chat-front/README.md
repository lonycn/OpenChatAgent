# Chat Front - 智能客服前端系统

基于 Ant Design X 的智能客服前端系统，支持完整的 Markdown 渲染和流式对话。

## 🎯 项目特点

### ✅ 已优化的功能

1. **系统消息优化**

   - 避免重复显示无意义的系统消息
   - 过滤掉"系统消息"等空白内容
   - 智能去重，防止相同消息多次显示

2. **完整的 Markdown 支持**

   - 支持代码高亮显示
   - 支持表格、列表、引用等格式
   - 支持标题、链接、段落等基础格式
   - 美观的样式设计，符合现代UI标准

3. **流式消息处理**

   - 完美的打字机效果
   - 基于消息ID的增量更新
   - 支持 stream 和 response 两种消息类型
   - 智能状态管理，避免卡顿

4. **用户体验优化**
   - 输入框自动清空
   - 连续对话支持
   - 实时连接状态显示
   - 调试窗口可控制显示

## 🚀 技术栈

- **框架**: React 18 + TypeScript + Vite
- **UI库**: Ant Design X + Ant Design
- **Markdown**: react-markdown + remark-gfm
- **WebSocket**: 自定义服务类，支持重连和心跳
- **状态管理**: React Hooks

## 📦 依赖包

```json
{
  "dependencies": {
    "@ant-design/icons": "^5.5.2",
    "@ant-design/x": "^1.4.0",
    "antd": "^5.23.0",
    "dayjs": "^1.11.13",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "uuid": "^11.1.0",
    "ws": "^8.18.2"
  }
}
```

## 🛠️ 开发指南

### 启动项目

```bash
# 安装依赖
npm install

# 启动开发服务器 (端口 8001)
npm run dev

# 或者从根目录启动所有服务
cd .. && npm run dev
```

### 项目结构

```
chat-front/
├── src/
│   ├── components/
│   │   └── MarkdownChatInterface.tsx  # 主聊天界面
│   ├── hooks/
│   │   └── useStreamingChat.ts        # 聊天逻辑Hook
│   ├── services/
│   │   └── websocketService.ts        # WebSocket服务
│   ├── types/
│   │   └── index.ts                   # 类型定义
│   ├── App.tsx                        # 主应用
│   ├── main.tsx                       # 入口文件
│   └── index.css                      # 全局样式
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## 🔧 核心功能

### 1. 系统消息过滤

```typescript
// 过滤掉不需要显示的系统消息
const shouldShowMessage = (text: string) => {
  // 过滤掉"系统消息"这种无意义的消息
  if (text === "系统消息" || text === "System message") {
    return false;
  }
  // 过滤掉空消息
  if (!text || text.trim() === "") {
    return false;
  }
  return true;
};
```

### 2. Markdown 渲染配置

```typescript
// 自定义 Markdown 组件
const markdownComponents = {
  code: ({ inline, children, ...props }) => {
    // 内联代码和代码块的不同样式
  },
  table: ({ children }) => {
    // 表格样式
  },
  // ... 更多组件配置
};
```

### 3. 流式消息处理

```typescript
// 处理流式消息的核心逻辑
const handleStreamMessage = useCallback((data: WebSocketMessage) => {
  // 基于消息ID的增量更新
  // 避免重复显示
  // 支持打字机效果
}, []);
```

## 🎨 UI 特性

### 消息气泡设计

- **用户消息**: 右侧蓝色气泡
- **AI消息**: 左侧渐变色气泡，带机器人头像
- **系统消息**: 居中显示，灰色背景

### 状态指示器

- **连接状态**: 绿色(已连接)/红色(断开)/黄色(重连中)
- **接待状态**: AI助手/人工客服标签
- **输入状态**: 实时显示"正在输入..."

### Markdown 样式

- **代码块**: GitHub风格，带语法高亮
- **表格**: 完整的边框和斑马纹
- **列表**: 合理的缩进和间距
- **引用**: 左侧边框线，斜体显示
- **链接**: 蓝色，悬停下划线

## 🐛 已修复的问题

1. ✅ **系统发送2条消息问题**

   - 添加消息去重机制
   - 过滤无意义的系统消息
   - 避免重复显示相同内容

2. ✅ **Markdown支持**

   - 集成 react-markdown 和 remark-gfm
   - 自定义组件样式
   - 支持代码高亮、表格、列表等

3. ✅ **输入框清空问题**

   - 使用受控组件模式
   - 发送后自动清空输入框

4. ✅ **连续对话问题**

   - 修复流式消息状态管理
   - 支持多轮连续对话

5. ✅ **调试窗口控制**
   - 只在URL包含?debug时显示
   - 正常使用时界面简洁

## 🔗 相关链接

- [Ant Design X 官方文档](https://x.ant.design/)
- [React Markdown 文档](https://github.com/remarkjs/react-markdown)
- [WebSocket API 文档](../chat-core/README.md)

## 📝 更新日志

### v1.0.0 (2024-12-XX)

- ✅ 完成基础聊天功能
- ✅ 集成 Ant Design X
- ✅ 添加 Markdown 支持
- ✅ 优化系统消息显示
- ✅ 修复连续对话问题
- ✅ 完善用户体验

---

**技术负责人**: AI Assistant  
**最后更新**: 2024-12-XX
