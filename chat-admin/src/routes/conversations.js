const express = require('express');
const { body, param, query } = require("express-validator");
const router = express.Router();

const ConversationController = require("../controllers/conversationController");
const { authenticateToken } = require("../../middleware/auth");

// 验证规则
const conversationIdValidation = [
  param("conversationId").isInt({ min: 1 }).withMessage("会话ID必须是正整数"),
];

const assignConversationValidation = [
  body("assignee_id").isInt({ min: 1 }).withMessage("客服ID必须是正整数"),
];

const updateStatusValidation = [
  body("status")
    .isIn(["open", "pending", "resolved", "closed"])
    .withMessage("状态值无效"),
];

const switchAgentValidation = [
  body("agent_type")
    .isIn(["ai", "human"])
    .withMessage("代理类型必须是 ai 或 human"),
];

const addNoteValidation = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("备注内容长度必须在1-1000字符之间"),
];

const sendMessageValidation = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("消息内容长度必须在1-5000字符之间"),
  body("message_type")
    .optional()
    .isIn(["text", "image", "file", "system"])
    .withMessage("消息类型无效"),
  body("is_private")
    .optional()
    .isBoolean()
    .withMessage("is_private必须是布尔值"),
];

const paginationValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("页码必须是正整数"),
  query("per_page")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("每页数量必须在1-100之间"),
];

// 所有路由都需要认证
router.use(authenticateToken);

// 获取会话列表
router.get("/", paginationValidation, ConversationController.getConversations);

// 获取会话统计
router.get("/stats", ConversationController.getStats);

// 获取会话详情
router.get(
  "/:conversationId",
  conversationIdValidation,
  ConversationController.getConversation
);

// 接管会话
router.post(
  "/:conversationId/takeover",
  conversationIdValidation,
  ConversationController.takeoverConversation
);

// 分配会话
router.post(
  "/:conversationId/assign",
  conversationIdValidation,
  assignConversationValidation,
  ConversationController.assignConversation
);

// 更新会话状态
router.put(
  "/:conversationId/status",
  conversationIdValidation,
  updateStatusValidation,
  ConversationController.updateConversationStatus
);

// 标记已解决
router.post(
  "/:conversationId/resolve",
  conversationIdValidation,
  ConversationController.resolveConversation
);

// 关闭会话
router.post(
  "/:conversationId/close",
  conversationIdValidation,
  ConversationController.closeConversation
);

// AI/人工切换
router.post(
  "/:conversationId/switch-agent",
  conversationIdValidation,
  switchAgentValidation,
  ConversationController.switchAgent
);

// 获取会话消息
router.get(
  "/:conversationId/messages",
  conversationIdValidation,
  paginationValidation,
  ConversationController.getConversationMessages
);

// 发送消息
router.post(
  "/:conversationId/messages",
  conversationIdValidation,
  sendMessageValidation,
  ConversationController.sendMessage
);

// 添加私有备注
router.post(
  "/:conversationId/notes",
  conversationIdValidation,
  addNoteValidation,
  ConversationController.addNote
);

module.exports = router;
