const ConversationService = require("../services/conversations");
const { validationResult } = require("express-validator");

class ConversationController {
  // 获取会话列表
  static async getConversations(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const filters = {
        page: parseInt(req.query.page) || 1,
        per_page: Math.min(parseInt(req.query.per_page) || 20, 50),
        status: req.query.status ? req.query.status.split(",") : undefined,
        assignee_id: req.query.assignee_id
          ? parseInt(req.query.assignee_id)
          : undefined,
        inbox_id: req.query.inbox_id ? parseInt(req.query.inbox_id) : undefined,
        priority: req.query.priority
          ? req.query.priority.split(",")
          : undefined,
        channel_type: req.query.channel_type
          ? req.query.channel_type.split(",")
          : undefined,
        current_agent_type: req.query.current_agent_type,
        search: req.query.search,
      };

      const result = await ConversationService.getList(filters);

      res.json({
        success: true,
        data: {
          conversations: result.data,
          meta: result.meta,
        },
      });
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取会话列表失败",
        },
      });
    }
  }

  // 获取会话详情
  static async getConversation(req, res) {
    try {
      const { conversationId } = req.params;

      const conversation = await ConversationService.getById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "会话不存在",
          },
        });
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取会话详情失败",
        },
      });
    }
  }

  // 分配会话
  static async assignConversation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { conversationId } = req.params;
      const { assignee_id } = req.body;

      await ConversationService.assign(conversationId, assignee_id);

      res.json({
        success: true,
        data: {
          message: "会话分配成功",
        },
      });
    } catch (error) {
      console.error("Assign conversation error:", error);

      if (error.message === "Conversation not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "会话不存在",
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "分配会话失败",
        },
      });
    }
  }

  // 更新会话状态
  static async updateConversationStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { conversationId } = req.params;
      const { status } = req.body;

      await ConversationService.updateStatus(conversationId, status);

      res.json({
        success: true,
        data: {
          message: "会话状态更新成功",
        },
      });
    } catch (error) {
      console.error("Update conversation status error:", error);

      if (error.message === "Conversation not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "会话不存在",
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "更新会话状态失败",
        },
      });
    }
  }

  // 切换代理类型
  static async switchAgent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { conversationId } = req.params;
      const { agent_type } = req.body;

      const result = await ConversationService.switchAgent(
        conversationId,
        agent_type
      );

      res.json({
        success: true,
        data: {
          message: "代理切换成功",
          agent_type: result.agent_type,
        },
      });
    } catch (error) {
      console.error("Switch agent error:", error);

      if (error.message === "Conversation not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "会话不存在",
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "切换代理失败",
        },
      });
    }
  }

  // 获取会话消息
  static async getConversationMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const per_page = Math.min(parseInt(req.query.per_page) || 50, 100);

      const result = await ConversationService.getMessages(
        conversationId,
        page,
        per_page
      );

      res.json({
        success: true,
        data: {
          messages: result.data,
          meta: result.meta,
        },
      });
    } catch (error) {
      console.error("Get conversation messages error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取会话消息失败",
        },
      });
    }
  }

  // 发送消息
  static async sendMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { conversationId } = req.params;
      const { content, message_type = "text", is_private = false } = req.body;
      const senderId = req.user.id; // 从认证中间件获取

      const message = await ConversationService.sendMessage(
        conversationId,
        senderId,
        content,
        message_type,
        is_private
      );

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "发送消息失败",
        },
      });
    }
  }

  // 获取会话统计
  static async getStats(req, res) {
    try {
      const userId = req.query.user_id || null;
      const stats = await ConversationService.getStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取统计数据失败",
        },
      });
    }
  }
}

module.exports = ConversationController;
