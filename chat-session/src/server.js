const express = require("express");
const cors = require("cors");
const SessionManager = require("./managers/SessionManager");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8004;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化会话管理器
let sessionManager;
try {
  sessionManager = new SessionManager();
  console.log("✅ Session Service initialized with Redis");
} catch (error) {
  console.error("❌ Error initializing session manager:", error.message);
  process.exit(1);
}

// 健康检查端点
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "chat-session",
    redis: "connected",
  });
});

// 创建新会话
app.post("/api/sessions", async (req, res) => {
  try {
    const { userId, metadata = {} } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const sessionData = await sessionManager.createSession(userId, metadata);

    res.json({
      sessionId: sessionData.sessionId,
      userId,
      agent: "ai", // 默认代理
      status: "created",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error creating session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 获取会话代理类型
app.get("/api/sessions/:sessionId/agent", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const agent = await sessionManager.getSessionAgent(sessionId);

    res.json({
      sessionId,
      agent: agent || "ai", // 默认为ai
    });
  } catch (error) {
    console.error("❌ Error getting session agent:", error);
    res.status(500).json({
      error: "Internal server error",
      agent: "ai", // 默认返回ai
    });
  }
});

// 设置会话代理类型
app.post("/api/sessions/:sessionId/agent", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { agent } = req.body;

    if (!["ai", "human"].includes(agent)) {
      return res.status(400).json({ error: 'Agent must be "ai" or "human"' });
    }

    await sessionManager.switchAgent(sessionId, agent);

    res.json({
      sessionId,
      agent,
      message: `Session agent set to ${agent}`,
    });
  } catch (error) {
    console.error("❌ Error setting session agent:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 添加消息到会话
app.post("/api/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const message = req.body;

    console.log(`💾 Adding message to session ${sessionId}`);

    await sessionManager.addMessage(sessionId, message);

    res.json({
      sessionId,
      messageId: message.id,
      status: "added",
    });
  } catch (error) {
    console.error("❌ Error adding message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 获取会话消息历史
app.get("/api/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await sessionManager.getHistory(
      sessionId,
      parseInt(limit)
    );

    res.json({
      sessionId,
      messages: messages || [],
      count: messages ? messages.length : 0,
    });
  } catch (error) {
    console.error("❌ Error getting messages:", error);
    res.status(500).json({
      error: "Internal server error",
      messages: [],
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`💾 Session Service listening on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});
