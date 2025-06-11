const fs = require("fs");
const path = require("path");

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || "info";
    this.logDir = options.logDir || process.env.LOG_DIR || "./logs";
    this.retentionDays = parseInt(
      options.retentionDays || process.env.LOG_RETENTION_DAYS || "30"
    );
    this.enableConsole =
      options.enableConsole !== false && process.env.LOG_CONSOLE !== "false";
    this.enableFile =
      options.enableFile !== false && process.env.LOG_FILE !== "false";

    // 日志级别映射
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    this.currentLevelValue = this.levels[this.logLevel] || 1;

    // 确保日志目录存在
    this.ensureLogDir();

    // 启动时清理过期日志
    this.cleanupOldLogs();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFileName() {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${dateStr}.log`);
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  shouldLog(level) {
    return this.levels[level] >= this.currentLevelValue;
  }

  writeToFile(formattedMessage) {
    if (!this.enableFile) return;

    try {
      const logFile = this.getLogFileName();
      fs.appendFileSync(logFile, formattedMessage + "\n");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  writeToConsole(level, formattedMessage) {
    if (!this.enableConsole) return;

    switch (level) {
      case "error":
        console.error(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "debug":
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    this.writeToConsole(level, formattedMessage);
    this.writeToFile(formattedMessage);
  }

  debug(message, meta = {}) {
    this.log("debug", message, meta);
  }

  info(message, meta = {}) {
    this.log("info", message, meta);
  }

  warn(message, meta = {}) {
    this.log("warn", message, meta);
  }

  error(message, meta = {}) {
    this.log("error", message, meta);
  }

  // WebSocket 专用日志方法
  websocket(action, clientId, data = {}) {
    this.info(`WebSocket ${action}`, {
      clientId,
      ...data,
    });
  }

  // HTTP 请求日志
  http(method, url, statusCode, duration, data = {}) {
    this.info(`HTTP ${method} ${url}`, {
      statusCode,
      duration: `${duration}ms`,
      ...data,
    });
  }

  // 错误日志增强
  errorWithStack(message, error, meta = {}) {
    this.error(message, {
      error: error.message,
      stack: error.stack,
      ...meta,
    });
  }

  // 清理过期日志
  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      files.forEach((file) => {
        if (file.endsWith(".log")) {
          const match = file.match(/^(\d{4}-\d{2}-\d{2})\.log$/);
          if (match) {
            const fileDate = new Date(match[1]);
            if (fileDate < cutoffDate) {
              const filePath = path.join(this.logDir, file);
              fs.unlinkSync(filePath);
              this.info(`Cleaned up old log file: ${file}`);
            }
          }
        }
      });
    } catch (error) {
      console.error("Failed to cleanup old logs:", error);
    }
  }

  // 获取最近的日志文件
  getRecentLogs(days = 7) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return files
        .filter((file) => file.endsWith(".log"))
        .map((file) => {
          const match = file.match(/^(\d{4}-\d{2}-\d{2})\.log$/);
          if (match) {
            const fileDate = new Date(match[1]);
            if (fileDate >= cutoffDate) {
              return {
                file,
                date: fileDate,
                path: path.join(this.logDir, file),
              };
            }
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.date - a.date);
    } catch (error) {
      this.error("Failed to get recent logs", { error: error.message });
      return [];
    }
  }
}

// 创建默认logger实例
const logger = new Logger();

module.exports = { Logger, logger };
