# 🔍 WebSocket 深度调试指南

## 🚨 核心问题分析

### 问题现象

用户报告 WebSocket 显示 "Pending" 状态，即使连接看起来正常。

### 可能原因分析

#### 1. ProChat 内部机制问题

ProChat 组件可能在以下情况下仍然发送 HTTP 请求：

- 内置的 AI 模型调用机制
- 流式响应处理逻辑
- 自动补全功能
- 插件系统调用

#### 2. React 严格模式副作用

- 组件重复挂载导致的连接冗余
- useEffect 重复执行
- 事件处理器重复注册

#### 3. 浏览器缓存和会话问题

- Service Worker 干扰
- 浏览器缓存的旧版本代码
- WebSocket 连接池污染

## 🛠️ 诊断工具

### 1. 实时监控面板

已集成到前端的 `WebSocketMonitor` 组件：

- 实时连接状态监控
- HTTP 请求拦截记录
- 消息收发日志
- 异常情况告警

### 2. 浏览器开发者工具检查

```javascript
// 在浏览器控制台执行以下命令

// 1. 检查被阻止的 HTTP 请求
console.log("Blocked requests:", window.blockedRequests);

// 2. 检查 WebSocket 连接状态
console.log("WebSocket state:", {
  readyState: window.ws?.readyState,
  url: window.ws?.url,
  protocol: window.ws?.protocol,
});

// 3. 检查 ProChat 内部状态
console.log(
  "ProChat elements:",
  document.querySelectorAll('[data-testid*="pro-chat"]')
);

// 4. 检查 React 严格模式
console.log("React StrictMode:", document.querySelector("div[data-reactroot]"));
```

### 3. 网络面板检查清单

- [ ] 没有到 `/api/openai/chat` 的 HTTP 请求
- [ ] WebSocket 连接状态为 "101 Switching Protocols"
- [ ] 没有意外的 CORS 预检请求
- [ ] 没有长时间 pending 的请求

## 🔧 解决方案层次

### 第一层：HTTP 请求拦截

```javascript
// 已实现：多重拦截器
- fetch 拦截器
- XMLHttpRequest 拦截器
- axios 拦截器
- DOM 变化监控
```

### 第二层：ProChat 配置优化

```javascript
// 当前配置
<ProChat
  request={async (messages) => {
    console.warn("🚫 ProChat request intercepted");
    return Promise.resolve({
      data: { choices: [{ message: { content: "请使用WebSocket模式" } }] },
    });
  }}
  modelProvider={null}
  config={null}
  enablePlugins={false}
  enableStreamRender={false}
/>
```

### 第三层：替代解决方案

#### 方案 A：完全自定义聊天组件

如果 ProChat 无法完全禁用 HTTP 请求，考虑使用原生组件：

```javascript
// 使用 antd 的 List + Input 组件替代 ProChat
import { List, Input, Button, Avatar } from "antd";
```

#### 方案 B：ProChat 版本降级

```bash
# 尝试使用更稳定的版本
npm install @ant-design/pro-chat@1.x.x
```

#### 方案 C：Iframe 隔离

```javascript
// 将 ProChat 放在 iframe 中完全隔离网络请求
<iframe src="/chat-isolated.html" />
```

## 🧪 测试方法

### 1. 自动化测试脚本

```javascript
// utils/websocket-test.js
const testWebSocketOnly = async () => {
  // 清空所有被阻止的请求记录
  window.blockedRequests = [];

  // 发送测试消息
  const testMessage = "测试WebSocket功能";
  // ... 发送逻辑

  // 等待5秒检查结果
  setTimeout(() => {
    const blockedCount = window.blockedRequests?.length || 0;
    console.log(`测试结果: ${blockedCount === 0 ? "✅ 通过" : "❌ 失败"}`);
    console.log(`被阻止的请求数量: ${blockedCount}`);
  }, 5000);
};
```

### 2. 压力测试

```javascript
// 连续发送多条消息测试
const stressTest = async () => {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // 发送消息
  }
};
```

## 📊 问题追踪记录

### 已知问题

1. **ProChat 内部 HTTP 调用**: ✅ 已通过拦截器解决
2. **React 严格模式重复挂载**: ✅ 已通过 useMemo 优化
3. **WebSocket 连接管理**: ✅ 已优化连接生命周期

### 待验证问题

1. **浏览器缓存影响**: ⏳ 需要硬刷新测试
2. **ProChat 版本兼容性**: ⏳ 可能需要版本降级
3. **第三方库冲突**: ⏳ 检查依赖冲突

## 🎯 最终解决步骤

### 立即执行

1. **启用调试监控**: 打开右侧调试面板
2. **清空浏览器缓存**: Ctrl+Shift+R 硬刷新
3. **检查控制台输出**: 观察是否有 HTTP 请求被拦截

### 如果问题持续

1. **尝试隐身模式**: 排除插件和缓存影响
2. **检查 ProChat 版本**: 考虑降级到稳定版本
3. **使用替代组件**: 考虑自定义聊天界面

### 数据收集

如果问题仍然存在，请收集以下信息：

- 浏览器类型和版本
- `window.blockedRequests` 内容
- Network 面板截图
- Console 错误日志
- WebSocket 连接详情

## 🔗 相关文档

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 通用故障排除
- [README_WEBSOCKET.md](./README_WEBSOCKET.md) - WebSocket 实现详情
- [USAGE.md](./USAGE.md) - 使用说明

---

**更新时间**: 2025-06-11  
**状态**: 活跃开发中  
**负责人**: AI Assistant
