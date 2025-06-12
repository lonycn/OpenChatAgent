# 📚 项目介绍

**OpenChatAgent** 是一个开源的智能客服解决方案，结合了 AI 自动回复与人工坐席接管能力。项目以多模块形式组织，便于前后端解耦与未来扩展。

## ✨ 主要特性

- 🤖 默认通过阿里百炼 DashScope 提供 AI 回复
- 👨‍💻 人工坐席可随时接管或退出会话
- 🔌 支持 Web / 小程序 / 微信 等多端接入
- 🔄 统一的 WebSocket 通信与 REST API
- 💾 使用 Redis 管理会话与上下文

## 🏗️ 模块架构

```
OpenChatAgent/
├── chat-ui        # 前端聊天界面 (React + Ant Design X)
├── chat-core      # 消息网关与路由服务 (Node.js/Express)
├── ai-service     # 阿里百炼 API 封装及知识库查询
├── chat-session   # 基于 Redis 的会话管理
├── websocket-module/  # 独立的 WebSocket 管理模块 (可选)
└── Docs           # 开发文档与设计方案
```

各模块通过 HTTP 或 WebSocket 协作：前端 `chat-ui` 与 `chat-core` 保持 WebSocket 连接，`chat-core` 根据会话状态调用 `ai-service` 或转交人工，并在 `chat-session` 中记录会话数据。`websocket-module` 进一步提供插件化的 WebSocket 管理能力，可在需要时替换或扩展。

## 🚀 快速开始

1. 安装 Node.js 与 Redis
2. 运行一键启动脚本：

```bash
./start-dev.sh
```

脚本会安装依赖并启动 `chat-ui`、`chat-core`、`ai-service`、`chat-session` 四个服务，默认端口可在 `.env` 中配置。

访问地址：
- 前端界面: `http://localhost:5173`
- API 网关: `http://localhost:3001`

更多使用方式请参考根目录 `README.md`。

## 🔍 当前架构分析

- **多服务拆分**：项目采用多包工作区模式，不同职责独立成模块，便于维护和部署。
- **WebSocket 与 HTTP 并存**：实时消息使用 WebSocket，配置和会话管理走 REST API。
- **Redis 存储会话**：`chat-session` 负责会话及代理状态，支持 TTL 与历史记录限制。
- **AI 服务封装**：`ai-service` 对接阿里百炼 DashScope，并提供知识库查询和重试机制。
- **前端简洁**：`chat-ui` 以 React + Ant Design X 构建，内置基本的聊天界面与消息列表。
- **WebSocket 模块化尝试**：`websocket-module` 提供更完备的连接池、插件系统和监控能力，旨在解决现有实现中"对话后没有返回"等问题。

## 💡 改进建议

1. **完善测试与 CI**：目前各模块仅提供基础测试脚本，可引入持续集成（GitHub Actions 等）自动运行单元测试和 lint。
2. **补充文档与示例**：文档比较分散，建议在 `Docs/` 中增加整体架构图和典型交互流程说明，便于新贡献者快速上手。
3. **Docker 化部署**：提供官方的 Dockerfile 与 docker-compose，简化本地和生产环境部署。
4. **类型安全**：逐步引入 TypeScript 或 JSDoc 强化类型约束，提高代码可维护性。
5. **监控与日志**：在 `chat-core`、`ai-service` 等服务中加入统一的日志与监控方案（如 Prometheus、Winston），便于排查问题。
6. **插件机制**：结合 `websocket-module`，设计标准的插件接口，实现如订单查询、物流追踪等业务扩展。

欢迎根据实际需求继续完善和扩展该项目。更多细节可查阅文档目录下的其他文件。

