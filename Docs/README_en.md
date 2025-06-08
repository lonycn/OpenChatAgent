# OpenChatAgent Open Source Customer Service System

**OpenChatAgent** is an open-source intelligent customer service system that combines AI auto-reply capabilities with human agent collaboration. It supports multi-channel access including web pages, mini-programs, and WeChat official accounts. By default, AI provides the service, and human agents can take over or exit at any time, achieving a customer service experience that is both efficient and flexible.

> ⚠️ Currently in the MVP development stage, only core functionalities are implemented.

## ✨ Project Features

- 🤖 Defaults to using Alibaba DashScope to access the AI dialogue engine
- 👨‍💻 Human agents can join/exit sessions at any time, automatically switching with AI
- 🔄 Supports agent status control via buttons or webhooks
- 📱 Multi-platform access: Web / H5 / WeChat Mini Program / WeChat Official Account
- 💬 Built-in Ant Design X chat UI components
- 📡 Uses WebSocket + REST for front-end and back-end communication
- ⚙️ Manages session context and status using Redis

## 📦 Tech Stack

- Frontend: React + Ant Design X
- Backend: Node.js + Redis + Express + WebSocket
- AI Service: Alibaba DashScope (MCP)
- Client-side: uniapp (optional)
- Admin Panel: Chatwoot or ant-design-pro (optional)

## 📅 Roadmap

- [x] AI-based default customer service
- [x] Mechanism for human agents to join/exit
- [ ] Chat history and session list
- [ ] Agent workspace for backend
- [ ] Plugin-based business processes (e.g., logistics, orders)
- [ ] Deployment documentation and API exposure

## 📜 License

MIT License

Contributions via PRs and Issues are welcome to build together 🎉
