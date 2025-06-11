const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const connectionManager = require("../services/ConnectionManager");
const messageRouter = require("../services/MessageRouter");
const { authenticateWebSocket } = require("../middleware/auth");
const { validateWebSocketMessage } = require("../middleware/validation");
const { handleWebSocketError } = require("../middleware/error");

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
            let sessionId = ws.sessionId;
            if (!sessionId) {
              const sessionData =
                await messageRouter.sessionManager.createSession(userId);
              sessionId = sessionData.sessionId || sessionData; // 兼容不同返回格式
              ws.sessionId = sessionId;
            }

            await messageRouter.handleIncomingMessage(
              ws.id,
              userId,
              sessionId,
              validatedMessage
            );
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
        connectionManager.removeConnection(ws.id);
        const reasonString = reason ? reason.toString() : "No reason given";

        // 🔇 减少断开连接的日志输出 - 仅记录异常断开
        const remainingClients = connectionManager.getClientCount();
        if (code !== 1001 && code !== 1000) {
          // 只记录非正常关闭的连接
          console.log(
            `WebSocket: Client ${ws.id} disconnected abnormally. Code: ${code}, Reason: ${reasonString}. Total clients: ${remainingClients}`
          );
        } else if (remainingClients <= 3 || remainingClients % 5 === 0) {
          console.log(
            `WebSocket: Client ${ws.id} disconnected normally. Total clients: ${remainingClients}`
          );
        }
      });

      ws.on("error", (error) => {
        console.error(`WebSocket: Error on connection ${ws.id}:`, error);
        handleWebSocketError(ws, error, { connectionId: ws.id });
      });
    });
  });

  console.log("WebSocket server initialized and attached to HTTP server.");
  return wss;
}

module.exports = { initializeWebSocket };
