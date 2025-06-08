以下是为本项目撰写的《DEVELOP_TODO.md》清单，涵盖所有核心模块（chat-ui、chat-core、ai-service、chat-session、chat-admin、chat-client）的开发任务，按照推荐的执行顺序排列，并标注优先级（🔥高、🟡中、🟢低）。

---

# 📌 DEVELOP_TODO.md

> 本文档用于跟踪“AI 智能客服系统”的各阶段开发任务，支持多人协作和逐步推进。

---

## ✅ 第一阶段：基础框架搭建（Week 1）

### 📁 `ai-service` 模块

- 🔥 封装阿里百炼对话 API（基础聊天）

- 🔥 支持知识库调用（附 knowledge_id 参数）

- 🔥 支持 session_id 上下文追踪

- 🟡 封装 MCP 任务插件调用（如物流、订单）

### 📁 `chat-core` 模块

- 🔥 搭建 WebSocket 服务端（ws/express）

- 🔥 实现 AI/人工 路由判断逻辑

- 🔥 定义统一消息格式 `{session_id, user_id, text}`

- 🔥 实现 REST 接口：切换 agent（ai ↔ human）

- 🟡 接入 Chatwoot webhook（客服接入通知）

### 📁 `chat-session` 模块

- 🔥 设计 Redis 存储结构（session:）

- 🔥 存储会话上下文 + 当前接待者 agent 状态

- 🟡 添加聊天记录分页读取接口

- 🟢 增加自动过期清理逻辑（如 30 分钟不活跃）

---

## ✅ 第二阶段：前端对接实现（Week 2）

### 📁 `chat-ui` 模块（Ant Design X）

- 🔥 初始化聊天界面（气泡/快捷指令）

- 🔥 WebSocket 客户端连接与消息展示

- 🔥 “客服接管”与“AI 接管”按钮状态联动

- 🟡 标注 AI 回复（AI/Human 标签）

### 📁 `chat-client` 模块（uniapp）

- 🔥 创建通用聊天页面（兼容小程序 + H5）

- 🔥 WebSocket 客户端封装 + reconnect 机制

- 🔥 消息渲染与发送操作

- 🟡 支持文件/图片上传（暂留）

---

## ✅ 第三阶段：客服与管理功能（Week 3）

### 📁 `chat-admin` 模块（管理台/客服工作台）

- 🔥 展示当前所有会话状态（进行中/历史）

- 🔥 提供“接管”按钮（切换 agent 为 human）

- 🔥 显示消息流、消息标注、AI 来源等

- 🟡 可视化知识库管理页（后期支持）

- 🟢 客服评价统计、满意度列表

---

## ✅ 第四阶段：系统整合测试与部署（Week 4）

- 🔥 编写集成测试用例（AI、人工切换流程）

- 🔥 搭建本地测试 Redis、SQLite 环境

- 🔥 部署 Node 服务（使用 PM2 / Docker）

- 🔥 配置前端构建 + 打包上线（Vite）

- 🟢 上传示例知识库（FAQ / 文档）

- 🟢 接入阿里百炼正式环境 key

---

## 🧩 备选增强任务（可进入 V1.1）

- ⏳ 客户评分按钮（反馈 AI 是否满意）

- ⏳ 记录 AI 错误标注（供后续学习训练）

- ⏳ 多客服排队逻辑（无需 Chatwoot 时）

- ⏳ 接入飞书、企业微信等平台渠道

- ⏳ 引入分布式向量检索（如后期替换知识库）

---

## 🧠 开发建议

- 使用 Cursor + Jules 全流程开发推荐：
  
  - 每个模块新建子项目结构，并定义清晰的 index.ts / main.ts
  
  - 封装 API 接口统一调用层（如 useAgentChat、sendMessage）
  
  - 所有模块使用 `.env` 管理配置项（尤其是阿里百炼）


