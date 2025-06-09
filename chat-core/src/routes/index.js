const express = require("express");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

// 应用认证中间件到所有路由（可选认证）
router.use(optionalAuth);

// 健康检查路由
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "chat-core",
    version: "1.0.0",
  });
});

// 会话管理路由
const sessionsRouter = require("./sessions");
router.use("/sessions", sessionsRouter);

// 消息处理路由
const messagesRouter = require("./messages");
router.use("/messages", messagesRouter);

// 反馈处理路由
const feedbackRouter = require("./feedback");
router.use("/feedback", feedbackRouter);

// API 信息路由
router.get("/info", (req, res) => {
  res.json({
    service: "chat-core",
    description: "消息网关和状态控制中心",
    version: "1.0.0",
    endpoints: {
      websocket: "/ws",
      rest: {
        sessions: "/api/sessions",
        messages: "/api/messages",
        feedback: "/api/feedback",
      },
    },
    features: [
      "WebSocket 实时通信",
      "AI/人工客服路由",
      "会话状态管理",
      "消息历史记录",
      "用户反馈收集",
    ],
  });
});

module.exports = router;
