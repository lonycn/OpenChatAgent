# OpenChatAgent

**OpenChatAgent** is an open-source intelligent customer service system that combines AI chatbot capabilities with human agent fallback. The system supports multi-channel access (web, WeChat, mini program), with AI as the default responder and allows manual takeover by human support at any time.

> 💡 Currently under active development — MVP version focused on core functionality only.

## ✨ Features

- 🤖 AI-first auto-reply using Alibaba DashScope (Baichuan MCP)
- 👨‍💻 Human agent can join/leave the session, pausing/resuming AI
- 🔄 Agent switch via frontend button or webhook
- 📱 Multi-platform entry: Web / H5 / Mini Program / WeChat
- 💬 Built-in chat UI powered by Ant Design X
- 📡 WebSocket + REST API backend
- ⚙️ Redis-based session and context management

## 📦 Tech Stack

- Frontend: React + Ant Design X
- Backend: Node.js + WebSocket + Redis
- AI Engine: Alibaba DashScope API
- Mobile client: uniapp (optional)
- Optional Admin UI: Chatwoot or ant-design-pro

## 📅 Roadmap

- [x] AI auto-reply
- [x] Human agent takeover
- [ ] Chat history UI
- [ ] Admin panel
- [ ] Plugin support (logistics, orders, etc.)
- [ ] OpenAPI & deployment docs

## 📜 License

MIT

> Contributions welcome! PRs and Issues are appreciated.
