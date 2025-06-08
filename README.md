# OpenChatAgent (开放聊天智能客服)

**OpenChatAgent** 是一个开源的智能客服系统，它结合了 AI 聊天机器人功能与人工坐席回退机制。该系统支持多渠道接入（网页、微信、小程序），默认由 AI 应答，并允许人工客服随时接管。

> 💡 目前正在积极开发中 — MVP 版本仅关注核心功能。

## ✨ 产品特性

- 🤖 AI 优先自动回复，基于阿里百炼 DashScope (通义千问 MCP)
- 👨‍💻 人工坐席可随时加入/离开会话，暂停/恢复 AI 服务
- 🔄 支持通过前端按钮或 Webhook 进行坐席切换
- 📱 多平台入口：Web / H5 / 小程序 / 微信
- 💬 内置聊天 UI，基于 Ant Design X
- 📡 WebSocket + REST API 后端
- ⚙️ 基于 Redis 的会话和上下文管理

## 📦 技术栈

- 前端：React + Ant Design X
- 后端：Node.js + WebSocket + Redis
- AI 引擎：阿里百炼 DashScope API
- 移动客户端：uniapp (可选)
- 可选的管理后台：Chatwoot 或 ant-design-pro

## 📅 路线图

- [x] AI 自动回复
- [x] 人工坐席接管
- [ ] 聊天历史界面
- [ ] 管理面板
- [ ] 插件支持（物流、订单查询等）
- [ ] OpenAPI 及部署文档

## 📜 开源许可

MIT

> 欢迎贡献！感谢提交 PR 和 Issue。
