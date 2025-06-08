const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const connectionManager = require('../services/ConnectionManager');
const messageRouter = require('../services/MessageRouter'); // Import MessageRouter

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

    ws.on('message', (messageBuffer) => {
      let parsedMessage;
      try {
        const messageString = messageBuffer.toString();
        parsedMessage = JSON.parse(messageString);
        console.log(`WebSocket: Received message from ${ws.id}:`, parsedMessage);

        // Route the message using MessageRouter
        // For now, userId is a placeholder. In a real app, it would be derived from auth/session.
        const placeholderUserId = `user_for_${ws.id}`;
        messageRouter.handleIncomingMessage(ws.id, placeholderUserId, parsedMessage)
          .catch(e => {
            // Catch errors from handleIncomingMessage to prevent unhandled promise rejections on the WebSocket server
            console.error(`WebSocket: Error processing message via MessageRouter for client ${ws.id}:`, e);
            connectionManager.sendMessageToConnection(ws.id, {
              type: 'error',
              id: uuidv4(),
              timestamp: new Date().toISOString(),
              message: 'An error occurred while processing your message.',
              details: e.message // Optionally send error details, be cautious with sensitive info
            });
          });

        // Original echo/ack logic is now handled by MessageRouter's simulated flow

        // Example: Broadcast to others (for testing broadcast) - can be moved into MessageRouter if needed
        // const broadcastPayload = { type: 'broadcast', from: ws.id, originalMessage: parsedMessage };
        // connectionManager.broadcastMessage(broadcastPayload, ws.id);

      } catch (e) {
        console.error(`WebSocket: Failed to parse message from ${ws.id} or process:`, e);
        connectionManager.sendMessageToConnection(ws.id, {
          type: 'error',
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          message: 'Invalid message format received. Please send JSON.',
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
