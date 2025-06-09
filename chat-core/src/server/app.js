const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const {
  globalErrorHandler,
  notFoundHandler,
  setupProcessErrorHandlers,
} = require("../middleware/error");

const app = express();

// 设置进程级错误处理
setupProcessErrorHandlers();

// 安全中间件
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS 配置
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:5173",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 请求日志
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// 解析请求体
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 根路由
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Chat-core service is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API 路由
const apiRouter = require("../routes");
app.use("/api", apiRouter);

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(globalErrorHandler);

module.exports = app;
