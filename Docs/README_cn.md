# OpenChatAgent 开源客服系统

**OpenChatAgent** 是一个开源的智能客服系统，结合了 AI 自动回复与人工客服协同能力。支持网页、小程序、微信公众号等多端接入，默认由 AI 提供服务，可随时由人工客服接管或退出，实现高效与灵活并存的客服体验。

> ⚠️ 当前处于 MVP 开发阶段，仅实现核心功能。

## ✨ 项目特性

- 🤖 默认使用阿里百炼 DashScope 接入 AI 对话引擎
- 👨‍💻 人工客服可随时接入/退出会话，自动切换 AI
- 🔄 支持按钮控制或 webhook 控制接待状态
- 📱 多端接入：Web / H5 / 微信小程序 / 微信公众号
- 💬 内置 Ant Design X 聊天 UI 组件
- 📡 使用 WebSocket + REST 实现前后通信
- ⚙️ Redis 管理会话上下文与状态

## 📦 技术栈

- 前端：React + Ant Design X
- 后端：Node.js + Redis + Express + WebSocket
- AI 服务：阿里百炼（DashScope MCP）
- 客户端：uniapp（可选）
- 后台管理：Chatwoot 或 ant-design-pro（可选）

## 📅 路线图

- [x] 基于 AI 的默认客服
- [x] 人工客服接入/退出机制
- [ ] 聊天历史与会话列表
- [ ] 后台客服工作台
- [ ] 插件式业务流程（如物流、订单）
- [ ] 部署文档与 API 开放

## 📜 开源协议

MIT 许可证

欢迎 PR 和 Issue 一起参与共建 🎉
