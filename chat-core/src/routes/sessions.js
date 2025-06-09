const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  validateBody,
  validateParams,
  validateQuery,
  sessionCreateSchema,
  switchAgentSchema,
  sessionIdSchema,
  historyQuerySchema,
} = require("../middleware/validation");
const { asyncHandler } = require("../middleware/error");
// const sessionManager = require('chat-session').sessionManager; // Placeholder for actual SessionManager
// const connectionManager = require('../services/ConnectionManager'); // Placeholder for ConnectionManager

const router = express.Router();

// Mock SessionManager for now, as it's from another module and not yet integrated.
const mockSessionManager = {
  createSession: async (userId) => {
    console.log(
      `MockSessionManager: createSession called for userId: ${userId}`
    );
    return {
      sessionId: `mockSessionId_${uuidv4().substring(0, 8)}`,
      userId,
      createdAt: new Date().toISOString(),
      currentAgent: "ai",
      lastActiveAt: new Date().toISOString(),
    };
  },
  getSession: async (sessionId) => {
    console.log(
      `MockSessionManager: getSession called for sessionId: ${sessionId}`
    );
    if (sessionId === "nonexistent_session_id") return null;
    return {
      sessionId,
      userId: `mockUser_${sessionId.substring(0, 4)}`,
      createdAt: new Date().toISOString(),
      currentAgent: "ai",
      lastActiveAt: new Date().toISOString(),
    };
  },
  switchAgent: async (sessionId, newAgent) => {
    console.log(
      `MockSessionManager: switchAgent called for sessionId: ${sessionId}, newAgent: ${newAgent}`
    );
    return { success: true, newAgent };
  },
  getHistory: async (sessionId, limit) => {
    console.log(
      `MockSessionManager: getHistory called for sessionId: ${sessionId}, limit: ${limit}`
    );
    return [
      {
        id: uuidv4(),
        from: "user",
        text: "Hello (from mock history)",
        timestamp: new Date(Date.now() - 10000).toISOString(),
        type: "text",
        sessionId,
      },
      {
        id: uuidv4(),
        from: "ai",
        text: "AI: Hi there! (from mock history)",
        timestamp: new Date().toISOString(),
        type: "text",
        sessionId,
      },
    ];
  },
};

// POST /api/sessions (Create Session)
router.post(
  "/",
  validateBody(sessionCreateSchema),
  asyncHandler(async (req, res) => {
    // 优先使用认证用户的 ID，否则使用请求体中的 userId
    const userId =
      req.user?.id || req.body.userId || `user_${uuidv4().substring(0, 8)}`;

    // const session = await sessionManager.createSession(userId); // Real call
    const session = await mockSessionManager.createSession(userId); // Mock call

    res.status(201).json({
      success: true,
      data: session,
    });
  })
);

// GET /api/sessions/:sessionId (Get Session Details)
router.get(
  "/:sessionId",
  validateParams(sessionIdSchema),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    // const session = await sessionManager.getSession(sessionId); // Real call
    const session = await mockSessionManager.getSession(sessionId); // Mock call

    if (session) {
      res.json({
        success: true,
        data: session,
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }
  })
);

// POST /api/sessions/:sessionId/switch-agent (Switch Agent)
router.post(
  "/:sessionId/switch-agent",
  validateParams(sessionIdSchema),
  validateBody(switchAgentSchema),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { agent: newAgent } = req.body;

    // const result = await sessionManager.switchAgent(sessionId, newAgent); // Real call
    const result = await mockSessionManager.switchAgent(sessionId, newAgent); // Mock call

    if (result.success) {
      console.log(
        `API: Agent switched to ${newAgent} for session ${sessionId}`
      );
      // TODO: 通过 WebSocket 通知客户端代理切换
      // const associatedConnectionId = findConnectionIdForSession(sessionId);
      // if (associatedConnectionId) {
      //   connectionManager.sendMessageToConnection(associatedConnectionId, {
      //     type: 'agent_switch',
      //     newAgent,
      //     sessionId
      //   });
      // }

      res.json({
        success: true,
        data: { sessionId, newAgent },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || "Failed to switch agent",
      });
    }
  })
);

// GET /api/sessions/:sessionId/history (Get History)
router.get(
  "/:sessionId/history",
  validateParams(sessionIdSchema),
  validateQuery(historyQuerySchema),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { limit, offset } = req.query;

    // const history = await sessionManager.getHistory(sessionId, limit, offset); // Real call
    const history = await mockSessionManager.getHistory(sessionId, limit); // Mock call

    res.json({
      success: true,
      data: {
        sessionId,
        messages: history,
        pagination: {
          limit,
          offset,
          total: history.length, // 在实际实现中应该返回真实的总数
        },
      },
    });
  })
);

module.exports = router;
