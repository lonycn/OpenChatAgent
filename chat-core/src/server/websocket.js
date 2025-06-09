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
      console.log(
        `WebSocket: Client ${ws.id} (${
          req.user?.type || "unknown"
        }) connected from ${
          ip || "unknown IP"
        }. Total clients: ${connectionManager.getClientCount()}`
      );

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
      ws.on("message", (messageBuffer) => {
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
          messageRouter
            .handleIncomingMessage(ws.id, userId, validatedMessage)
            .catch((e) => {
              handleWebSocketError(ws, e, {
                messageId: validatedMessage.id,
                userId,
                connectionId: ws.id,
              });
            });
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
        console.log(
          `WebSocket: Client ${
            ws.id
          } disconnected. Code: ${code}, Reason: ${reasonString}. Total clients: ${connectionManager.getClientCount()}`
        );
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
