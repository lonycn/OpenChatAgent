const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const connectionManager = require('../services/ConnectionManager');
const messageRouter = require('../services/MessageRouter');
const { SessionManager } = require('../../../chat-session/src'); // For session operations

const sessionManager = new SessionManager(); // Instantiate SessionManager

function initializeWebSocket(httpServer) {
  if (!httpServer) {
    console.error('WebSocket Server: HTTP server instance is required.');
    return null;
  }

  const wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', (ws, req) => {
    ws.id = uuidv4();
    connectionManager.addConnection(ws.id, ws); // Add connection to manager

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`WebSocket: Client ${ws.id} connected from ${ip || 'unknown IP'}. Total clients: ${connectionManager.getClientCount()}`);

    // Send welcome message using ConnectionManager
    connectionManager.sendMessageToConnection(ws.id, {
      type: 'system',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      message: 'Welcome to Chat-core!',
      clientId: ws.id
    });

    ws.on('message', async (messageBuffer) => { // Made async
      let parsedMessage;
      try {
        const messageString = messageBuffer.toString();
        parsedMessage = JSON.parse(messageString);
        console.log(`WebSocket: Received message from ${ws.id}:`, parsedMessage);

        const connDetails = connectionManager.getConnectionDetails(ws.id);

        if (parsedMessage.type === 'init' || !connDetails?.sessionId) {
          // Handle initialization message
          const { userId: msgUserId, sessionId: msgSessionId } = parsedMessage.payload || {};

          if (!msgUserId) {
            connectionManager.sendMessageToConnection(ws.id, { type: 'error', message: 'Initialization error: userId is required in init message payload.' });
            return;
          }

          let sessionToUse;
          let finalSessionId;
          let finalUserId = msgUserId; // Trust userId from init message for now

          if (msgSessionId) {
            console.log(`WebSocket: Client ${ws.id} provided existing sessionId ${msgSessionId}`);
            sessionToUse = await sessionManager.getSession(msgSessionId);
            if (sessionToUse && sessionToUse.userId !== finalUserId) {
                console.warn(`WebSocket: SessionId ${msgSessionId} belongs to another user (${sessionToUse.userId}). Creating new session for ${finalUserId}.`);
                sessionToUse = null; // Force new session
            } else if (sessionToUse) {
                console.log(`WebSocket: Reusing existing session ${msgSessionId} for user ${finalUserId}`);
            }
          }

          if (!sessionToUse) {
            console.log(`WebSocket: No valid existing session found for user ${finalUserId} (or new user). Creating new session.`);
            // TODO: Future: Implement sessionManager.findActiveSessionByUserId(finalUserId)
            sessionToUse = await sessionManager.createSession(finalUserId);
          }

          finalSessionId = sessionToUse.sessionId;
          connectionManager.setConnectionDetails(ws.id, { sessionId: finalSessionId, userId: finalUserId });

          connectionManager.sendMessageToConnection(ws.id, {
            type: 'system',
            status: 'initialized',
            sessionId: finalSessionId,
            userId: finalUserId,
            message: `Session initialized. Session ID: ${finalSessionId}, User ID: ${finalUserId}`
          });
          console.log(`WebSocket: Client ${ws.id} initialized with sessionId: ${finalSessionId}, userId: ${finalUserId}`);

        } else {
          // Regular message handling
          const { sessionId, userId } = connDetails;
          if (!sessionId || !userId) {
             console.error(`WebSocket: Received message from uninitialized client ${ws.id}. Ignoring.`);
             connectionManager.sendMessageToConnection(ws.id, { type: 'error', message: 'Connection not fully initialized. Please send init message first.' });
             return;
          }
          // Pass sessionId and userId to messageRouter
          messageRouter.handleIncomingMessage(ws.id, userId, sessionId, parsedMessage)
            .catch(e => {
              console.error(`WebSocket: Error processing message via MessageRouter for client ${ws.id}:`, e);
              connectionManager.sendMessageToConnection(ws.id, {
                type: 'error',
                id: uuidv4(),
                timestamp: new Date().toISOString(),
                message: 'An error occurred while processing your message.',
                details: e.message
              });
            });
        }

      } catch (e) { // Catches JSON parsing errors or other synchronous errors
        console.error(`WebSocket: Failed to parse message from ${ws.id} or synchronous error in handler:`, e);
        connectionManager.sendMessageToConnection(ws.id, {
          type: 'error',
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          message: 'Invalid message format or server error during processing.',
          originalMessage: messageBuffer.toString()
        });
        return;
      }
    });

    ws.on('close', (code, reason) => {
      connectionManager.removeConnection(ws.id); // Remove connection from manager
      const reasonString = reason ? reason.toString() : 'No reason given';
      console.log(`WebSocket: Client ${ws.id} disconnected. Code: ${code}, Reason: ${reasonString}. Total clients: ${connectionManager.getClientCount()}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket: Error on connection ${ws.id}:`, error);
      // The 'close' event will usually follow an error that terminates the connection.
    });
  });

  console.log('WebSocket server initialized and attached to HTTP server.');
  return wss;
}

module.exports = { initializeWebSocket };
