const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const connectionManager = require("../services/EnhancedConnectionManager");
const messageRouter = require("../services/MessageRouter");
const { authenticateWebSocket } = require("../middleware/auth");
const { validateWebSocketMessage } = require("../middleware/validation");
const { handleWebSocketError } = require("../middleware/error");
const { WebSocketErrorHandler } = require("../utils/websocketErrorHandler");
const WebSocketMonitor = require("../services/WebSocketMonitor");
const wsConfig = require("../config/websocket");

// Initialize error handler and monitor
const errorHandler = new WebSocketErrorHandler();
let monitor = null;

function initializeWebSocket(httpServer) {
  if (!httpServer) {
    console.error("WebSocket Server: HTTP server instance is required.");
    return null;
  }

  const wss = new WebSocket.Server({
    server: httpServer,
    verifyClient: (info) => {
      // 可以在这里添加额外的连接验证逻辑
      return true;
    },
  });

  wss.on("connection", (ws, req) => {
    ws.id = uuidv4();

    // 认证 WebSocket 连接
    authenticateWebSocket(ws, req, (authError) => {
      if (authError) {
        console.error(`WebSocket Auth Error for ${ws.id}:`, authError);
        return ws.close(1008, "Authentication failed");
      }

      // 认证成功，保存用户信息到 ws 对象
      ws.user = req.user;
      connectionManager.addConnection(ws.id, ws, req.user);

      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      // 🔇 减少日志输出 - 仅在客户端数量变化时记录
      const clientCount = connectionManager.getClientCount();
      if (clientCount <= 3 || clientCount % 5 === 0) {
        // 只在前3个连接或每5个连接时记录
        console.log(
          `WebSocket: Client ${ws.id} (${
            req.user?.type || "unknown"
          }) connected from ${
            ip || "unknown IP"
          }. Total clients: ${clientCount}`
        );
      }

      // 发送欢迎消息
      connectionManager.sendMessageToConnection(ws.id, {
        type: "system",
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        message: "Welcome to Chat-core!",
        clientId: ws.id,
        user: {
          id: req.user?.id,
          type: req.user?.type,
        },
      });

      // 设置消息处理器（移到认证回调内部）
      ws.on("message", async (messageBuffer) => {
        let parsedMessage;
        try {
          const messageString = messageBuffer.toString();
          parsedMessage = JSON.parse(messageString);

          // Handle heartbeat ping/pong
          if (parsedMessage.type === 'ping') {
            // Update connection activity and ping timestamp
            connectionManager.updateActivity(ws.id);
            connectionManager.updatePing(ws.id);
            
            // Respond with pong
            const pongMessage = {
              type: 'pong',
              timestamp: Date.now(),
              originalTimestamp: parsedMessage.timestamp
            };
            
            connectionManager.sendMessageToConnection(ws.id, pongMessage);
            console.log(`💓 Ping received from ${ws.id}, pong sent`);
            return;
          }
          
          if (parsedMessage.type === 'pong') {
            // Update pong timestamp
            connectionManager.updatePong(ws.id);
            console.log(`💓 Pong received from ${ws.id}`);
            return;
          }

          // Update connection activity for all valid messages
          connectionManager.updateActivity(ws.id);
          
          // 验证消息格式
          const validatedMessage = validateWebSocketMessage(parsedMessage);

          console.log(
            `WebSocket: Received valid message from ${ws.id}:`,
            validatedMessage
          );

          // 使用已保存的用户信息路由消息
          const userId = ws.user?.id || `guest_${ws.id}`;

          // 处理不同类型的消息
          if (validatedMessage.type === "init") {
            // 初始化会话消息
            const sessionData =
              await messageRouter.sessionManager.createSession(userId);
            const sessionId = sessionData.sessionId || sessionData; // 兼容不同返回格式
            ws.sessionId = sessionId; // 保存sessionId到WebSocket连接

            // 发送会话初始化确认
            connectionManager.sendMessageToConnection(ws.id, {
              type: "system",
              status: "initialized",
              id: uuidv4(),
              timestamp: new Date().toISOString(),
              message: `Session initialized successfully.`,
              sessionId: sessionId,
              userId: userId,
              currentAgent: "ai",
              clientId: ws.id,
            });

            // 如果初始化消息包含初始文本，处理它
            if (validatedMessage.payload?.initialMessage?.text) {
              const initialMessage = {
                text: validatedMessage.payload.initialMessage.text,
                type: "text",
                id:
                  validatedMessage.payload.initialMessage.originalId ||
                  uuidv4(),
              };

              await messageRouter.handleIncomingMessage(
                ws.id,
                userId,
                sessionId,
                initialMessage
              );
            }
          } else if (validatedMessage.type === "text") {
            // 常规文本消息
            console.log(`WebSocket: Received text message from connection ${ws.id}:`, JSON.stringify(validatedMessage));
            let sessionId = ws.sessionId;
            if (!sessionId) {
              console.log(`WebSocket: Creating new session for user ${userId}`);
              const sessionData =
                await messageRouter.sessionManager.createSession(userId);
              sessionId = sessionData.sessionId || sessionData; // 兼容不同返回格式
              ws.sessionId = sessionId;
              console.log(`WebSocket: New session created: ${sessionId}`);
            }

            console.log(`WebSocket: Routing message to MessageRouter for session ${sessionId}`);
            await messageRouter.handleIncomingMessage(
              ws.id,
              userId,
              sessionId,
              validatedMessage
            );
            console.log(`WebSocket: Message processing completed for session ${sessionId}`);
          } else {
            console.warn(
              `WebSocket: Unknown message type: ${validatedMessage.type}`
            );
          }
        } catch (e) {
          handleWebSocketError(ws, e, {
            rawMessage: messageBuffer.toString(),
            connectionId: ws.id,
          });
        }
      });

      ws.on("close", (code, reason) => {
        // Use enhanced error handler for close events
        const closeInfo = errorHandler.handleClose(code, reason, {
          connectionId: ws.id,
          userId: ws.userId,
          sessionId: ws.sessionId
        });
        
        // Use enhanced connection manager to remove connection
        connectionManager.removeConnection(ws.id);
        
        // Emit close event with detailed information
        connectionManager.emit('connectionClosed', {
          connectionId: ws.id,
          closeInfo
        });
      });

    ws.on("error", (error) => {
      // Use enhanced error handler for error events
      const errorInfo = errorHandler.handleError(error, {
        connectionId: ws.id,
        userId: ws.userId,
        sessionId: ws.sessionId,
        url: ws.url
      });
      
      // Legacy error handling for compatibility
      handleWebSocketError(error, ws);
      
      // Emit error event with detailed information
      connectionManager.emit('connectionError', {
        connectionId: ws.id,
        errorInfo
      });
    });
  });
  });

  // Initialize monitoring
  monitor = new WebSocketMonitor(connectionManager, {
    metricsInterval: wsConfig.heartbeat.interval,
    healthCheckInterval: wsConfig.heartbeat.interval,
    enableAlerts: wsConfig.logging.level === 'debug'
  });
  
  console.log("WebSocket server initialized and attached to HTTP server.");
  console.log("WebSocket: Monitoring and error handling enabled");

  return { wss, monitor, errorHandler };
}

module.exports = { initializeWebSocket };
