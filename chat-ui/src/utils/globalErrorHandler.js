// 🚨 全局错误处理器 - 拦截所有错误并记录到日志
import { v4 as uuidv4 } from "uuid";

const BACKEND_LOG_URL = "http://localhost:3001/api/logs/frontend";

class GlobalErrorHandler {
  constructor() {
    this.errorBuffer = [];
    this.maxBufferSize = 50;
    this.flushInterval = 5000; // 5秒批量发送
    this.isInitialized = false;

    console.log("🔧 GlobalErrorHandler: 构造函数被调用");
    this.initialize();
  }

  initialize() {
    if (this.isInitialized) {
      console.log("⚠️ GlobalErrorHandler: 已经初始化过了，跳过");
      return;
    }

    console.log("🚀 GlobalErrorHandler: 开始初始化...");

    try {
      // 1. 全局未捕获异常处理
      window.addEventListener("error", (event) => {
        console.log("🔴 GlobalErrorHandler: 捕获到全局错误", event);
        this.handleError({
          type: "JavaScript Error",
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          level: "ERROR",
        });
      });

      // 2. Promise未捕获拒绝处理
      window.addEventListener("unhandledrejection", (event) => {
        console.log("🔴 GlobalErrorHandler: 捕获到Promise拒绝", event);
        this.handleError({
          type: "Unhandled Promise Rejection",
          message:
            event.reason?.message ||
            event.reason?.toString() ||
            "Unknown promise rejection",
          stack: event.reason?.stack,
          level: "ERROR",
        });
      });

      // 3. React错误边界捕获
      window.addEventListener("react-error", (event) => {
        console.log("🔴 GlobalErrorHandler: 捕获到React错误", event);
        this.handleError({
          type: "React Component Error",
          message: event.detail?.message || "React component error",
          componentStack: event.detail?.componentStack,
          stack: event.detail?.stack,
          level: "ERROR",
        });
      });

      // 4. 控制台错误拦截
      this.interceptConsoleErrors();

      // 5. HTTP错误拦截（来自拦截器）
      window.addEventListener("http-request-blocked", (event) => {
        this.handleError({
          type: "HTTP Request Blocked",
          message: `${event.detail.method} ${event.detail.url}`,
          data: {
            method: event.detail.method,
            url: event.detail.url,
            source: event.detail.source,
            timestamp: event.detail.timestamp,
          },
          level: "WARN",
        });
      });

      // 6. WebSocket错误拦截
      window.addEventListener("websocket-error", (event) => {
        this.handleError({
          type: "WebSocket Error",
          message: event.detail?.message || "WebSocket connection error",
          data: {
            code: event.detail?.code,
            reason: event.detail?.reason,
            readyState: event.detail?.readyState,
          },
          level: "ERROR",
        });
      });

      // 定期刷新错误缓冲区
      setInterval(() => {
        this.flushErrorBuffer();
      }, this.flushInterval);

      this.isInitialized = true;
      console.log("✅ GlobalErrorHandler: 初始化完成");
    } catch (error) {
      console.error("❌ GlobalErrorHandler: 初始化失败", error);
    }
  }

  interceptConsoleErrors() {
    try {
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args) => {
        this.handleError({
          type: "Console Error",
          message: args
            .map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            )
            .join(" "),
          level: "ERROR",
        });
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        // 只记录特定的警告
        const message = args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ");

        if (
          message.includes("findDOMNode") ||
          message.includes("ProChat") ||
          message.includes("enableHistoryCount") ||
          message.includes("HTTP request")
        ) {
          this.handleError({
            type: "Console Warning",
            message: message,
            level: "WARN",
          });
        }
        originalWarn.apply(console, args);
      };
    } catch (error) {
      console.error("❌ GlobalErrorHandler: 控制台拦截设置失败", error);
    }
  }

  handleError(errorInfo) {
    try {
      const errorEntry = {
        id: uuidv4(),
        level: errorInfo.level || "ERROR",
        message: errorInfo.message || "Unknown error",
        data: {
          type: errorInfo.type || "Unknown",
          stack: errorInfo.stack,
          componentStack: errorInfo.componentStack,
          filename: errorInfo.filename,
          lineno: errorInfo.lineno,
          colno: errorInfo.colno,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          ...errorInfo.data,
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // 添加到缓冲区
      this.errorBuffer.push(errorEntry);

      // 如果是严重错误，立即发送
      if (errorInfo.level === "ERROR") {
        this.sendErrorToBackend(errorEntry);
      }

      // 控制缓冲区大小
      if (this.errorBuffer.length > this.maxBufferSize) {
        this.errorBuffer = this.errorBuffer.slice(-this.maxBufferSize);
      }

      // 同时记录到浏览器控制台（调试用）
      console.group(`🔴 Global Error Handler: ${errorInfo.type}`);
      console.error("Error Message:", errorInfo.message);
      console.error("Error Data:", errorEntry.data);
      console.groupEnd();
    } catch (error) {
      console.error("❌ GlobalErrorHandler: 处理错误时发生异常", error);
    }
  }

  async sendErrorToBackend(errorEntry) {
    try {
      const response = await fetch(BACKEND_LOG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorEntry),
      });

      if (!response.ok) {
        console.warn("Failed to send error to backend:", response.statusText);
      }
    } catch (error) {
      console.warn("Error sending log to backend:", error);
      // 避免无限循环 - 不再处理发送日志时的错误
    }
  }

  async flushErrorBuffer() {
    if (this.errorBuffer.length === 0) return;

    try {
      const errors = [...this.errorBuffer];
      this.errorBuffer = [];

      const response = await fetch(BACKEND_LOG_URL + "/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ errors }),
      });

      if (!response.ok) {
        console.warn("Failed to flush error buffer:", response.statusText);
        // 如果发送失败，重新加入缓冲区
        this.errorBuffer.unshift(...errors);
      }
    } catch (error) {
      console.warn("Error flushing buffer:", error);
    }
  }

  // 公开API方法
  logError(message, data = {}, level = "ERROR") {
    this.handleError({
      type: "Manual Log",
      message,
      data,
      level,
    });
  }

  logWarning(message, data = {}) {
    this.logError(message, data, "WARN");
  }

  logInfo(message, data = {}) {
    this.logError(message, data, "INFO");
  }

  getErrorStats() {
    return {
      totalErrors: this.errorBuffer.length,
      bufferSize: this.maxBufferSize,
      isInitialized: this.isInitialized,
    };
  }

  clearBuffer() {
    this.errorBuffer = [];
    console.log("✅ Error buffer cleared");
  }
}

// 创建全局实例
console.log("🚀 GlobalErrorHandler: 创建全局实例...");
const globalErrorHandler = new GlobalErrorHandler();

// 暴露到window对象
window.globalErrorHandler = globalErrorHandler;
console.log("✅ GlobalErrorHandler: 已暴露到window.globalErrorHandler");

// 导出便捷方法
export const logError = (message, data, level) =>
  globalErrorHandler.logError(message, data, level);

export const logWarning = (message, data) =>
  globalErrorHandler.logWarning(message, data);

export const logInfo = (message, data) =>
  globalErrorHandler.logInfo(message, data);

export default globalErrorHandler;
