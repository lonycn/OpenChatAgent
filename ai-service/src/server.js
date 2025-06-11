const express = require("express");
const cors = require("cors");
const { DashScopeClient } = require("./client");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化AI客户端
let aiClient;
try {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  DASHSCOPE_API_KEY not found in environment variables");
    aiClient = null;
  } else {
    aiClient = new DashScopeClient(apiKey);
    console.log("✅ AI Service initialized with DashScope API");
  }
} catch (error) {
  console.error("❌ Error initializing AI client:", error.message);
  aiClient = null;
}

// 健康检查端点
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ai-service",
    aiClient: aiClient ? "connected" : "not configured",
  });
});

// 聊天端点
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!aiClient) {
      return res.json({
        response: "抱歉，AI服务当前不可用。请检查API密钥配置。",
      });
    }

    console.log(`🤖 Processing message for session ${sessionId}: ${message}`);

    const response = await aiClient.sendMessage(sessionId, message);

    res.json({
      response,
      sessionId,
    });
  } catch (error) {
    console.error("❌ Error in chat endpoint:", error);
    res.status(500).json({
      error: "Internal server error",
      response: "抱歉，处理您的消息时出现错误。",
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🤖 AI Service listening on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});
