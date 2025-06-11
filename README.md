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

## 🚀 快速开始

### 🔧 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Redis (用于会话管理)

### ⚡ 一键启动

**方式 1: 使用脚本（推荐）**

```bash
# macOS/Linux
./start-dev.sh

# Windows
start-dev.bat
```

**方式 2: 使用命令行工具**

```bash
# 安装依赖
npm install

# 交互式管理界面
npm run cli

# 直接启动开发模式
npm run dev

# 启动单个服务
npm run cli dev -s chat-ui
```

**方式 3: 手动启动**

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 DASHSCOPE_API_KEY 等配置

# 3. 生成各模块环境文件
npm run env:setup

# 4. 启动所有服务
npm run dev
```

### 🌐 访问地址

- 🖥️ **前端界面**: http://localhost:5173
- 🔗 **API 网关**: http://localhost:3001
- 🤖 **AI 服务**: http://localhost:3002
- 💾 **会话服务**: http://localhost:3003

### ⚙️ 环境配置

核心配置项（.env 文件）：

```bash
# 阿里百炼API密钥（必须）
DASHSCOPE_API_KEY=sk-your_api_key_here

# Redis连接
REDIS_HOST=localhost
REDIS_PORT=6379

# 服务端口
CHAT_CORE_PORT=3001
AI_SERVICE_PORT=3002
CHAT_SESSION_PORT=3003
```

## 📁 项目结构

```
OpenChatAgent/
├── chat-ui/          # React前端聊天界面
├── chat-core/        # Node.js消息网关服务
├── ai-service/       # 阿里百炼API封装
├── chat-session/     # Redis会话管理
├── scripts/          # 管理脚本
├── .env.example      # 环境变量模板
├── package.json      # 根项目配置
├── start-dev.sh      # Linux/macOS启动脚本
└── start-dev.bat     # Windows启动脚本
```

## 📋 可用命令

```bash
npm run dev           # 启动所有服务（开发模式）
npm run start         # 启动所有服务（生产模式）
npm run cli           # 交互式管理界面
npm run install:all   # 安装所有依赖
npm run env:setup     # 设置环境变量
npm run clean         # 清理项目文件
npm run test          # 运行所有测试
```

## 📅 路线图

- [x] AI 自动回复
- [x] 人工坐席接管
- [x] 统一环境配置管理
- [x] 一键启动开发环境
- [ ] 聊天历史界面
- [ ] 管理面板
- [ ] 插件支持（物流、订单查询等）
- [ ] Docker 部署支持
- [ ] OpenAPI 及部署文档

## 📜 开源许可

MIT

> 欢迎贡献！感谢提交 PR 和 Issue。
