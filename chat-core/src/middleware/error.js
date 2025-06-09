/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 创建常见错误的便捷方法
 */
class ErrorFactory {
  static badRequest(message = "Bad Request", code = "BAD_REQUEST") {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new AppError(message, 401, code);
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new AppError(message, 403, code);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new AppError(message, 404, code);
  }

  static conflict(message = "Conflict", code = "CONFLICT") {
    return new AppError(message, 409, code);
  }

  static tooManyRequests(
    message = "Too many requests",
    code = "TOO_MANY_REQUESTS"
  ) {
    return new AppError(message, 429, code);
  }

  static internal(message = "Internal server error", code = "INTERNAL_ERROR") {
    return new AppError(message, 500, code);
  }

  static serviceUnavailable(
    message = "Service unavailable",
    code = "SERVICE_UNAVAILABLE"
  ) {
    return new AppError(message, 503, code);
  }
}

/**
 * 异步错误捕获包装器
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 处理中间件
 */
function notFoundHandler(req, res, next) {
  const error = ErrorFactory.notFound(`Route ${req.originalUrl} not found`);
  next(error);
}

/**
 * 全局错误处理中间件
 */
function globalErrorHandler(error, req, res, next) {
  let err = { ...error };
  err.message = error.message;

  // 记录错误日志
  console.error("Error:", {
    message: err.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // MongoDB 重复键错误
  if (error.code === 11000) {
    const message = "Duplicate field value entered";
    err = ErrorFactory.badRequest(message, "DUPLICATE_FIELD");
  }

  // MongoDB 验证错误
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((val) => val.message)
      .join(", ");
    err = ErrorFactory.badRequest(message, "VALIDATION_ERROR");
  }

  // JWT 错误
  if (error.name === "JsonWebTokenError") {
    err = ErrorFactory.unauthorized("Invalid token", "INVALID_TOKEN");
  }

  if (error.name === "TokenExpiredError") {
    err = ErrorFactory.unauthorized("Token expired", "TOKEN_EXPIRED");
  }

  // 发送错误响应
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message || "Internal server error",
      code: err.code || "INTERNAL_ERROR",
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
      }),
    },
  });
}

/**
 * WebSocket 错误处理
 */
function handleWebSocketError(ws, error, context = {}) {
  console.error("WebSocket Error:", {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });

  // 发送错误消息给客户端
  if (ws.readyState === ws.OPEN) {
    ws.send(
      JSON.stringify({
        type: "error",
        error: {
          message: error.message || "An error occurred",
          code: error.code || "WEBSOCKET_ERROR",
          timestamp: new Date().toISOString(),
        },
      })
    );
  }
}

/**
 * 进程级错误处理
 */
function setupProcessErrorHandlers() {
  // 捕获未处理的 Promise 拒绝
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // 优雅关闭应用
    process.exit(1);
  });

  // 捕获未捕获的异常
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // 优雅关闭应用
    process.exit(1);
  });

  // 优雅关闭
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully");
    process.exit(0);
  });
}

module.exports = {
  AppError,
  ErrorFactory,
  asyncHandler,
  notFoundHandler,
  globalErrorHandler,
  handleWebSocketError,
  setupProcessErrorHandlers,
};
