const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Joi = require("joi");
const { validateBody, messageSchema } = require("../middleware/validation");
const { asyncHandler } = require("../middleware/error");
// const messageRouter = require('../services/MessageRouter'); // Placeholder

const router = express.Router();

// Mock MessageRouter for now
const mockMessageRouter = {
  handleIncomingMessage: async (
    connectionId,
    userId,
    incomingMessage,
    source
  ) => {
    console.log(
      `MockMessageRouter: handleIncomingMessage called via ${
        source || "websocket"
      } for userId: ${userId}`,
      incomingMessage
    );
    // This mock simulates that handleIncomingMessage would eventually lead to an AI response.
    // For an HTTP request, the response is sent back via HTTP, not WebSocket.
    // So, this HTTP endpoint will directly craft the AI response.
    return {
      id: uuidv4(),
      from: "ai",
      text: `AI HTTP Echo: ${incomingMessage.text}`,
      timestamp: new Date().toISOString(),
      type: "text",
      sessionId: incomingMessage.sessionId, // Assuming sessionId is passed in incomingMessage for HTTP
    };
  },
};

// HTTP 消息模式定义
const httpMessageSchema = messageSchema.keys({
  sessionId: Joi.string().required(),
  userId: Joi.string().optional(), // 从认证中间件获取
});

// POST /api/messages (Send Message via HTTP)
router.post(
  "/",
  validateBody(httpMessageSchema),
  asyncHandler(async (req, res) => {
    const { sessionId, text, type = "text", metadata } = req.body;

    // 优先使用认证用户的 ID
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User authentication required",
      });
    }

    console.log(
      `API POST /api/messages: Received HTTP message from userId: ${userId} for session: ${sessionId}`
    );

    // 创建用户消息对象
    const userMessage = {
      id: uuidv4(),
      from: "user",
      text,
      type,
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };

    // 模拟调用 MessageRouter 处理消息
    // 在实际实现中，这里会调用真正的 MessageRouter
    const aiResponse = await mockMessageRouter.handleIncomingMessage(
      null, // HTTP 请求没有 connectionId
      userId,
      userMessage,
      "http"
    );

    // 返回 AI 响应
    res.status(200).json({
      success: true,
      data: {
        userMessage,
        aiResponse,
      },
    });
  })
);

module.exports = router;
