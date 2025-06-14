const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const path = require("path");

// 加载环境变量
dotenv.config({ path: path.join(__dirname, ".env") });

// 导入路由
const authRoutes = require("./routes/auth");
const conversationRoutes = require("./src/routes/conversations");

// 导入数据库
const db = require("./config/database");

const app = express();
const PORT = process.env.PORT || 8005;

// 安全中间件
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS配置
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 压缩响应
app.use(compression());

// 请求体解析
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 请求限制
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15分钟
  max: process.env.RATE_LIMIT_MAX || 100, // 限制每个IP 100个请求
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "请求过于频繁，请稍后再试",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 登录接口特殊限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 5次登录尝试
  message: {
    success: false,
    error: {
      code: "LOGIN_RATE_LIMIT_EXCEEDED",
      message: "登录尝试过于频繁，请15分钟后再试",
    },
  },
  skipSuccessfulRequests: true,
});

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});

// 健康检查
app.get("/health", async (req, res) => {
  try {
    const dbStatus = await db.checkConnection();

    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: dbStatus ? "connected" : "disconnected",
        version: process.env.APP_VERSION || "1.0.0",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "HEALTH_CHECK_FAILED",
        message: "健康检查失败",
      },
    });
  }
});

// API路由
app.use("/api/v1/auth", loginLimiter, authRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/customers", require("./src/routes/customers"));
app.use("/api/v1/users", require("./src/routes/users"));
app.use("/api/v1/reports", require("./src/routes/reports"));
app.use("/api/v1/tags", require("./src/routes/tags"));
app.use("/api/v1/permissions", require("./src/routes/permissions"));

// 兼容 Ant Design Pro 默认API路径
app.use("/api/login", loginLimiter, authRoutes); // 兼容前端默认路径
app.use("/api/auth", loginLimiter, authRoutes); // 兼容简化路径

// 404处理
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "请求的资源不存在",
    },
  });
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // 数据库错误
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(400).json({
      success: false,
      error: {
        code: "DUPLICATE_ENTRY",
        message: "数据已存在",
      },
    });
  }

  // JWT错误
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "无效的认证令牌",
      },
    });
  }

  // 验证错误
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.message,
      },
    });
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "服务器内部错误"
          : error.message,
    },
  });
});

// 优雅关闭
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");

  try {
    await db.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }

  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");

  try {
    await db.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }

  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
🚀 Chat Admin Server Started
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
📊 Database: ${process.env.DB_NAME}
🔐 JWT Secret: ${process.env.JWT_SECRET ? "✓ Configured" : "✗ Missing"}
⏰ Timezone: ${process.env.DB_TIMEZONE || "+08:00"}

📋 Available Endpoints:
  GET  /health                    - Health check
  POST /api/v1/auth/login         - User login
  POST /api/v1/auth/refresh       - Refresh token
  POST /api/v1/auth/logout        - User logout
  GET  /api/v1/auth/me            - Get current user
  PUT  /api/v1/auth/profile       - Update profile
  PUT  /api/v1/auth/password      - Change password
  POST /api/v1/auth/register      - Register user (Admin)

🔗 Documentation: http://localhost:${PORT}/health
  `);
});

module.exports = app;
