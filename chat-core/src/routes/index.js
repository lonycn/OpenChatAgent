const express = require("express");
const { optionalAuth } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const Joi = require("joi");
const { validateBody, messageSchema } = require("../middleware/validation");
const { asyncHandler } = require("../middleware/error");
const { logger } = require("../logger");

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

// ProChat兼容的聊天API端点
router.post("/openai/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    // 获取最后一条用户消息
    const lastMessage =
      messages && messages.length > 0 ? messages[messages.length - 1] : null;

    if (!lastMessage || !lastMessage.content) {
      return res.status(400).json({
        error: "No valid message found",
      });
    }

    // 由于ProChat期望流式响应，我们返回一个简单的JSON响应
    // 实际的AI交互应该通过WebSocket进行
    res.json({
      id: "prochat-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "dashscope-qwen",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content:
              "请使用WebSocket连接进行实时对话。这个端点仅用于兼容性目的。",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });
  } catch (error) {
    console.error("ProChat API error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// 🚨 前端日志收集端点
const frontendLogSchema = Joi.object({
  id: Joi.string().required(),
  level: Joi.string().valid("DEBUG", "INFO", "WARN", "ERROR").required(),
  message: Joi.string().required(),
  data: Joi.object().default({}),
  timestamp: Joi.string().isoDate().required(),
  userAgent: Joi.string().allow("").default(""),
  url: Joi.string().uri().required(),
});

router.post(
  "/logs/frontend",
  validateBody(frontendLogSchema),
  asyncHandler(async (req, res) => {
    const logEntry = req.body;

    try {
      // 增强日志信息
      const enhancedLog = {
        ...logEntry,
        source: "frontend",
        ip: req.ip || req.connection.remoteAddress,
        headers: {
          "user-agent": req.get("User-Agent"),
          referer: req.get("Referer"),
          "x-forwarded-for": req.get("X-Forwarded-For"),
        },
        serverTimestamp: new Date().toISOString(),
      };

      // 根据日志级别调用相应的logger方法
      switch (logEntry.level.toUpperCase()) {
        case "ERROR":
          logger.error(`[FRONTEND] ${logEntry.message}`, enhancedLog);
          break;
        case "WARN":
          logger.warn(`[FRONTEND] ${logEntry.message}`, enhancedLog);
          break;
        case "DEBUG":
          logger.debug(`[FRONTEND] ${logEntry.message}`, enhancedLog);
          break;
        default:
          logger.info(`[FRONTEND] ${logEntry.message}`, enhancedLog);
      }

      // 如果是拦截器相关的重要日志，额外记录
      if (
        logEntry.message.includes("HTTP Request Blocked") ||
        logEntry.message.includes("拦截器") ||
        logEntry.level === "ERROR"
      ) {
        logger.warn(`[FRONTEND-CRITICAL] ${logEntry.message}`, {
          ...enhancedLog,
          priority: "high",
        });
      }

      res.status(200).json({
        success: true,
        message: "Log received successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to process frontend log:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process log entry",
        message: error.message,
      });
    }
  })
);

// 🚨 日志查询端点（用于调试）
router.get(
  "/logs/recent",
  asyncHandler(async (req, res) => {
    try {
      const { hours = 24, level, source } = req.query;

      // 获取最近的日志文件
      const recentLogs = logger.getRecentLogs(Math.ceil(hours / 24));

      if (recentLogs.length === 0) {
        return res.json({
          success: true,
          logs: [],
          message: "No recent log files found",
        });
      }

      // 读取最新日志文件的内容（简化实现）
      const fs = require("fs");
      const latestLogFile = recentLogs[0];

      let logContent = "";
      try {
        logContent = fs.readFileSync(latestLogFile.path, "utf8");
      } catch (readError) {
        return res.status(500).json({
          success: false,
          error: "Failed to read log file",
          message: readError.message,
        });
      }

      // 解析日志行
      const logLines = logContent
        .split("\n")
        .filter((line) => line.trim())
        .slice(-1000) // 最新1000行
        .map((line) => {
          try {
            // 尝试解析JSON格式的日志
            if (line.includes("[") && line.includes("]")) {
              return {
                raw: line,
                timestamp: line.match(/\[(.*?)\]/)?.[1],
                level: line.match(/\[(\w+)\]/g)?.[1]?.replace(/[\[\]]/g, ""),
                message: line.split("] ").slice(2).join("] "),
              };
            }
            return { raw: line };
          } catch (parseError) {
            return { raw: line, parseError: true };
          }
        });

      // 应用过滤器
      let filteredLogs = logLines;
      if (level) {
        filteredLogs = filteredLogs.filter(
          (log) => log.level?.toLowerCase() === level.toLowerCase()
        );
      }
      if (source) {
        filteredLogs = filteredLogs.filter((log) =>
          log.message?.includes(source.toUpperCase())
        );
      }

      res.json({
        success: true,
        logs: filteredLogs.slice(-100), // 返回最新100条
        totalLines: logLines.length,
        filteredLines: filteredLogs.length,
        logFile: latestLogFile.file,
        filters: { hours, level, source },
      });
    } catch (error) {
      console.error("Failed to retrieve logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve logs",
        message: error.message,
      });
    }
  })
);

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
