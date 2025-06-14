const express = require("express");
const { query } = require("express-validator");
const ReportController = require("../controllers/reportController");
const { authenticateToken, requireRole } = require("../../middleware/auth");

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取概览统计
router.get(
  "/overview",
  [
    query("start_date")
      .optional()
      .isISO8601()
      .withMessage("开始日期格式不正确"),
    query("end_date")
      .optional()
      .isISO8601()
      .withMessage("结束日期格式不正确"),
  ],
  ReportController.getOverview
);

// 获取会话统计
router.get(
  "/conversations",
  [
    query("start_date")
      .optional()
      .isISO8601()
      .withMessage("开始日期格式不正确"),
    query("end_date")
      .optional()
      .isISO8601()
      .withMessage("结束日期格式不正确"),
    query("group_by")
      .optional()
      .isIn(["hour", "day", "week", "month"])
      .withMessage("分组方式必须是hour、day、week或month"),
  ],
  ReportController.getConversationStats
);

// 获取客服绩效统计
router.get(
  "/agents",
  [
    query("start_date")
      .optional()
      .isISO8601()
      .withMessage("开始日期格式不正确"),
    query("end_date")
      .optional()
      .isISO8601()
      .withMessage("结束日期格式不正确"),
    query("agent_id")
      .optional()
      .isInt({ min: 1 })
      .withMessage("客服ID必须是有效的整数"),
  ],
  ReportController.getAgentPerformance
);

// 获取响应时间统计
router.get(
  "/response-time",
  [
    query("start_date")
      .optional()
      .isISO8601()
      .withMessage("开始日期格式不正确"),
    query("end_date")
      .optional()
      .isISO8601()
      .withMessage("结束日期格式不正确"),
    query("group_by")
      .optional()
      .isIn(["hour", "day", "week", "month"])
      .withMessage("分组方式必须是hour、day、week或month"),
  ],
  ReportController.getResponseTimeStats
);

// 获取满意度统计
router.get(
  "/satisfaction",
  [
    query("start_date")
      .optional()
      .isISO8601()
      .withMessage("开始日期格式不正确"),
    query("end_date")
      .optional()
      .isISO8601()
      .withMessage("结束日期格式不正确"),
    query("group_by")
      .optional()
      .isIn(["hour", "day", "week", "month"])
      .withMessage("分组方式必须是hour、day、week或month"),
  ],
  ReportController.getSatisfactionStats
);

// 获取渠道统计
router.get(
  "/channels",
  [
    query("start_date")
      .optional()
      .isISO8601()
      .withMessage("开始日期格式不正确"),
    query("end_date")
      .optional()
      .isISO8601()
      .withMessage("结束日期格式不正确"),
  ],
  ReportController.getChannelStats
);

// 导出报表 - 只有管理员和有权限的客服可以导出
router.get(
  "/export",
  requireRole(["admin", "agent"]),
  [
    query("report_type")
      .isIn(["overview", "conversations", "agents", "response_time", "satisfaction", "channels"])
      .withMessage("报表类型必须是overview、conversations、agents、response_time、satisfaction或channels"),
    query("start_date")
      .isISO8601()
      .withMessage("开始日期格式不正确"),
    query("end_date")
      .isISO8601()
      .withMessage("结束日期格式不正确"),
    query("format")
      .optional()
      .isIn(["csv", "json"])
      .withMessage("导出格式必须是csv或json"),
  ],
  ReportController.exportReport
);

module.exports = router;