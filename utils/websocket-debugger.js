const { logger } = require("./logger");

class WebSocketDebugger {
  constructor() {
    this.connections = new Map();
    this.messageHistory = [];
    this.httpRequests = [];
    this.startTime = Date.now();
  }

  // 记录WebSocket连接
  logConnection(connectionId, clientInfo = {}) {
    const connectionData = {
      id: connectionId,
      connectedAt: new Date(),
      clientInfo,
      messageCount: 0,
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connectionData);

    logger.websocket("CONNECT", connectionId, {
      clientIP: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      totalConnections: this.connections.size,
    });
  }

  // 记录WebSocket消息
  logMessage(connectionId, direction, message, messageType = "unknown") {
    const messageData = {
      connectionId,
      direction, // 'in' | 'out'
      message,
      messageType,
      timestamp: new Date(),
      size: JSON.stringify(message).length,
    };

    this.messageHistory.push(messageData);

    // 更新连接信息
    if (this.connections.has(connectionId)) {
      const conn = this.connections.get(connectionId);
      conn.messageCount++;
      conn.lastActivity = new Date();
    }

    logger.websocket(`MESSAGE_${direction.toUpperCase()}`, connectionId, {
      type: messageType,
      size: messageData.size,
      preview: this.getMessagePreview(message),
    });

    // 保持最近1000条消息
    if (this.messageHistory.length > 1000) {
      this.messageHistory = this.messageHistory.slice(-1000);
    }
  }

  // 记录WebSocket断开
  logDisconnection(connectionId, code, reason) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      const duration = Date.now() - conn.connectedAt.getTime();

      logger.websocket("DISCONNECT", connectionId, {
        code,
        reason,
        duration: `${duration}ms`,
        messageCount: conn.messageCount,
        totalConnections: this.connections.size - 1,
      });

      this.connections.delete(connectionId);
    }
  }

  // 记录HTTP请求（用于检测是否有不期望的HTTP请求）
  logHttpRequest(method, url, headers = {}, body = null) {
    const requestData = {
      method,
      url,
      headers,
      body,
      timestamp: new Date(),
      userAgent: headers["user-agent"],
      referer: headers.referer,
    };

    this.httpRequests.push(requestData);

    // 检测是否是ProChat相关的HTTP请求
    const isProChatRequest =
      url.includes("/api/openai/chat") ||
      url.includes("openai") ||
      headers["user-agent"]?.includes("ProChat");

    if (isProChatRequest) {
      logger.warn("🚨 Detected ProChat HTTP request", {
        method,
        url,
        userAgent: headers["user-agent"],
        referer: headers.referer,
      });
    }

    logger.http(method, url, null, 0, {
      isProChatRequest,
      hasBody: !!body,
    });

    // 保持最近500条HTTP请求记录
    if (this.httpRequests.length > 500) {
      this.httpRequests = this.httpRequests.slice(-500);
    }
  }

  // 获取消息预览
  getMessagePreview(message, maxLength = 100) {
    try {
      const str =
        typeof message === "string" ? message : JSON.stringify(message);
      return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
    } catch (error) {
      return "[Unable to preview message]";
    }
  }

  // 生成连接状态报告
  getConnectionReport() {
    const activeConnections = Array.from(this.connections.values());
    const totalMessages = this.messageHistory.length;
    const recentMessages = this.messageHistory.filter(
      (msg) => Date.now() - msg.timestamp.getTime() < 60000 // 最近1分钟
    );

    return {
      activeConnections: activeConnections.length,
      totalMessagesProcessed: totalMessages,
      recentMessagesCount: recentMessages.length,
      connections: activeConnections.map((conn) => ({
        id: conn.id,
        connectedFor: Date.now() - conn.connectedAt.getTime(),
        messageCount: conn.messageCount,
        lastActivity: conn.lastActivity,
      })),
      uptime: Date.now() - this.startTime,
    };
  }

  // 获取HTTP请求分析
  getHttpRequestAnalysis() {
    const recentRequests = this.httpRequests.filter(
      (req) => Date.now() - req.timestamp.getTime() < 300000 // 最近5分钟
    );

    const proChatRequests = recentRequests.filter(
      (req) =>
        req.url.includes("/api/openai/chat") || req.url.includes("openai")
    );

    return {
      totalRequests: this.httpRequests.length,
      recentRequests: recentRequests.length,
      proChatRequests: proChatRequests.length,
      suspiciousRequests: proChatRequests.map((req) => ({
        method: req.method,
        url: req.url,
        timestamp: req.timestamp,
        userAgent: req.userAgent,
      })),
    };
  }

  // 检测潜在问题
  detectIssues() {
    const issues = [];
    const httpAnalysis = this.getHttpRequestAnalysis();

    // 检测HTTP请求问题
    if (httpAnalysis.proChatRequests > 0) {
      issues.push({
        type: "HTTP_REQUESTS_DETECTED",
        severity: "HIGH",
        message: `检测到 ${httpAnalysis.proChatRequests} 个ProChat HTTP请求，可能导致pending状态`,
        data: httpAnalysis.suspiciousRequests,
      });
    }

    // 检测连接问题
    const connectionReport = this.getConnectionReport();
    if (
      connectionReport.activeConnections === 0 &&
      connectionReport.totalMessagesProcessed > 0
    ) {
      issues.push({
        type: "NO_ACTIVE_CONNECTIONS",
        severity: "MEDIUM",
        message: "没有活跃的WebSocket连接，但有消息历史",
        data: connectionReport,
      });
    }

    // 检测消息处理问题
    const recentMessages = this.messageHistory.filter(
      (msg) => Date.now() - msg.timestamp.getTime() < 60000
    );
    const inMessages = recentMessages.filter((msg) => msg.direction === "in");
    const outMessages = recentMessages.filter((msg) => msg.direction === "out");

    if (inMessages.length > 0 && outMessages.length === 0) {
      issues.push({
        type: "NO_OUTBOUND_MESSAGES",
        severity: "HIGH",
        message: "收到入站消息但没有出站消息，可能是处理逻辑问题",
        data: {
          inMessages: inMessages.length,
          outMessages: outMessages.length,
        },
      });
    }

    return issues;
  }

  // 生成完整的调试报告
  generateDebugReport() {
    const report = {
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      connections: this.getConnectionReport(),
      httpRequests: this.getHttpRequestAnalysis(),
      issues: this.detectIssues(),
      recentMessages: this.messageHistory.slice(-10).map((msg) => ({
        direction: msg.direction,
        type: msg.messageType,
        timestamp: msg.timestamp,
        preview: this.getMessagePreview(msg.message, 50),
      })),
    };

    logger.info("WebSocket Debug Report Generated", report);
    return report;
  }

  // 清理旧数据
  cleanup() {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24小时前

    this.messageHistory = this.messageHistory.filter(
      (msg) => msg.timestamp.getTime() > cutoffTime
    );

    this.httpRequests = this.httpRequests.filter(
      (req) => req.timestamp.getTime() > cutoffTime
    );

    logger.info("WebSocket debugger cleaned up old data");
  }
}

// 创建全局调试器实例
const wsDebugger = new WebSocketDebugger();

// 定期清理数据
setInterval(() => {
  wsDebugger.cleanup();
}, 60 * 60 * 1000); // 每小时清理一次

module.exports = { WebSocketDebugger, wsDebugger };
