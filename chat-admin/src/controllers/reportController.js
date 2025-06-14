const { validationResult } = require('express-validator');
const ReportService = require("../services/reports");

class ReportController {
  // 获取概览统计
  static async getOverview(req, res) {
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

      const { start_date, end_date } = req.query;
      const overview = await ReportService.getOverview(start_date, end_date);

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      console.error("Get overview error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取概览统计失败",
        },
      });
    }
  }

  // 获取会话统计
  static async getConversationStats(req, res) {
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

      const { start_date, end_date, group_by = "day" } = req.query;
      const stats = await ReportService.getConversationStats(start_date, end_date, group_by);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get conversation stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取会话统计失败",
        },
      });
    }
  }

  // 获取客服绩效统计
  static async getAgentPerformance(req, res) {
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

      const { start_date, end_date, agent_id } = req.query;
      const performance = await ReportService.getAgentPerformance(start_date, end_date, agent_id);

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error("Get agent performance error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取客服绩效统计失败",
        },
      });
    }
  }

  // 获取响应时间统计
  static async getResponseTimeStats(req, res) {
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

      const { start_date, end_date, group_by = "day" } = req.query;
      const stats = await ReportService.getResponseTimeStats(start_date, end_date, group_by);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get response time stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取响应时间统计失败",
        },
      });
    }
  }

  // 获取满意度统计
  static async getSatisfactionStats(req, res) {
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

      const { start_date, end_date, group_by = "day" } = req.query;
      const stats = await ReportService.getSatisfactionStats(start_date, end_date, group_by);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get satisfaction stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取满意度统计失败",
        },
      });
    }
  }

  // 获取渠道统计
  static async getChannelStats(req, res) {
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

      const { start_date, end_date } = req.query;
      const stats = await ReportService.getChannelStats(start_date, end_date);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get channel stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取渠道统计失败",
        },
      });
    }
  }

  // 导出报表
  static async exportReport(req, res) {
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

      const { report_type, start_date, end_date, format = "csv" } = req.query;
      const reportData = await ReportService.exportReport(report_type, start_date, end_date, format);

      // 设置响应头
      const filename = `${report_type}_${start_date}_${end_date}.${format}`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", format === "csv" ? "text/csv" : "application/json");

      res.send(reportData);
    } catch (error) {
      console.error("Export report error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "导出报表失败",
        },
      });
    }
  }
}

module.exports = ReportController;