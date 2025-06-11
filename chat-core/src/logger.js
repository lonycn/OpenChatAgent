const fs = require("fs");
const path = require("path");

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || "info";
    this.logDir =
      options.logDir ||
      process.env.LOG_DIR ||
      path.join(process.cwd(), "../logs");
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

    // 记录logger初始化信息
    this.info("Logger initialized", {
      logLevel: this.logLevel,
      logDir: this.logDir,
      retentionDays: this.retentionDays,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
    });
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
        console.log(`✅ Created log directory: ${this.logDir}`);
      }

      // 测试写入权限
      const testFile = path.join(this.logDir, ".write-test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
    } catch (error) {
      console.error(
        `❌ Failed to create or access log directory: ${this.logDir}`,
        error
      );
      // 如果无法创建指定目录，尝试使用当前目录下的logs
      this.logDir = path.join(process.cwd(), "logs");
      try {
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
        console.log(`✅ Fallback: Using log directory: ${this.logDir}`);
      } catch (fallbackError) {
        console.error(
          `❌ Failed to create fallback log directory: ${this.logDir}`,
          fallbackError
        );
        this.enableFile = false;
        console.warn("⚠️ File logging disabled due to directory access issues");
      }
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
      // 尝试重新创建日志目录
      try {
        this.ensureLogDir();
        const logFile = this.getLogFileName();
        fs.appendFileSync(logFile, formattedMessage + "\n");
      } catch (retryError) {
        console.error("Retry failed, disabling file logging:", retryError);
        this.enableFile = false;
      }
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
    if (!this.enableFile || !fs.existsSync(this.logDir)) return;

    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let cleanedCount = 0;
      files.forEach((file) => {
        if (file.endsWith(".log")) {
          const match = file.match(/^(\d{4}-\d{2}-\d{2})\.log$/);
          if (match) {
            const fileDate = new Date(match[1]);
            if (fileDate < cutoffDate) {
              const filePath = path.join(this.logDir, file);
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        }
      });

      if (cleanedCount > 0) {
        this.info(`Cleaned up ${cleanedCount} old log files`);
      }
    } catch (error) {
      console.error("Failed to cleanup old logs:", error);
    }
  }

  // 获取最近的日志文件
  getRecentLogs(days = 7) {
    if (!this.enableFile || !fs.existsSync(this.logDir)) {
      return [];
    }

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
                size: fs.statSync(path.join(this.logDir, file)).size,
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

  // 获取日志目录信息
  getLogDirInfo() {
    if (!this.enableFile) {
      return {
        enabled: false,
        message: "File logging is disabled",
      };
    }

    try {
      const stats = fs.statSync(this.logDir);
      const files = fs
        .readdirSync(this.logDir)
        .filter((f) => f.endsWith(".log"));

      return {
        enabled: true,
        path: this.logDir,
        exists: true,
        writeable: true,
        fileCount: files.length,
        totalSize: files.reduce((size, file) => {
          try {
            return size + fs.statSync(path.join(this.logDir, file)).size;
          } catch {
            return size;
          }
        }, 0),
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      return {
        enabled: true,
        path: this.logDir,
        exists: false,
        error: error.message,
      };
    }
  }

  // 强制刷新日志（确保日志立即写入）
  flush() {
    // Node.js的fs.appendFileSync是同步的，所以不需要特别的flush操作
    // 但我们可以记录一个flush事件
    this.debug("Logger flush requested");
  }
}

// 创建默认logger实例
const logger = new Logger();

module.exports = { Logger, logger };
