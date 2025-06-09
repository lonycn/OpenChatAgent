class ConnectionManager {
  constructor() {
    // Key: connectionId (ws.id), Value: { ws: WebSocket, sessionId: string | null, userId: string | null }
    this.connections = new Map();
    console.log('ConnectionManager initialized.');
  }

  addConnection(connectionId, ws) {
    if (!connectionId || !ws) {
      console.error('ConnectionManager: connectionId and WebSocket instance are required to add connection.');
      return false;
    }
    if (this.connections.has(connectionId)) {
      console.warn(`ConnectionManager: Connection with ID ${connectionId} already exists. Overwriting.`);
    }
    this.connections.set(connectionId, { ws, sessionId: null, userId: null });
    console.log(`ConnectionManager: Connection ${connectionId} added. Total: ${this.getClientCount()}`);
    return true;
  }

  setConnectionDetails(connectionId, { sessionId, userId }) {
    if (!connectionId) {
      console.error('ConnectionManager: connectionId is required to set details.');
      return false;
    }
    const connDetails = this.connections.get(connectionId);
    if (connDetails) {
      connDetails.sessionId = sessionId || connDetails.sessionId; // Allow partial update
      connDetails.userId = userId || connDetails.userId;
      this.connections.set(connectionId, connDetails); // Re-set to ensure map updates if object was copied
      console.log(`ConnectionManager: Details set for ${connectionId}: sessionId=${connDetails.sessionId}, userId=${connDetails.userId}`);
      return true;
    } else {
      console.error(`ConnectionManager: Connection ${connectionId} not found to set details.`);
      return false;
    }
  }

  getConnectionDetails(connectionId) {
    if (!connectionId) {
      return null;
    }
    return this.connections.get(connectionId); // Returns { ws, sessionId, userId } or undefined
  }

  removeConnection(connectionId) {
    if (!connectionId) {
      console.error('ConnectionManager: connectionId is required to remove connection.');
      return false;
    }
    if (this.connections.has(connectionId)) {
      this.connections.delete(connectionId);
      console.log(`ConnectionManager: Connection ${connectionId} removed. Total: ${this.getClientCount()}`);
      return true;
    }
    console.warn(`ConnectionManager: Connection with ID ${connectionId} not found for removal.`);
    return false;
  }

  getConnection(connectionId) {
    if (!connectionId) {
      // console.warn('ConnectionManager: connectionId is required to get connection.'); // Can be noisy
      return undefined;
    }
    return this.connections.get(connectionId)?.ws; // Safely access ws property
  }

  getAllConnections() {
    // Returns array of { ws, sessionId, userId } objects
    return Array.from(this.connections.values());
  }

  getAllWsConnections() {
    // Returns array of actual ws objects, for broadcast or direct manipulation if needed
    return Array.from(this.connections.values()).map(details => details.ws).filter(ws => ws);
  }


  getClientCount() {
    return this.connections.size;
  }

  sendMessageToConnection(connectionId, message) {
    const connDetails = this.connections.get(connectionId);
    if (connDetails && connDetails.ws && connDetails.ws.readyState === connDetails.ws.OPEN) { // WebSocket.OPEN is typically 1
      try {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        connDetails.ws.send(messageString);
        // console.log(`ConnectionManager: Message sent to ${connectionId}.`); // Can be noisy
        return true;
      } catch (error) {
        console.error(`ConnectionManager: Error sending message to ${connectionId}: ${error.message}`, message);
        // Optionally remove connection if send fails due to it being closed unexpectedly
        // if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
        //   this.removeConnection(connectionId);
        // }
        return false;
      }
    } else {
      console.warn(`ConnectionManager: Connection ${connectionId} not found or not open. Message not sent.`);
      return false;
    }
  }

  broadcastMessage(message, exceptConnectionId = null) {
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    let count = 0;
    this.connections.forEach((details, connId) => {
      if (connId !== exceptConnectionId) {
        if (details.ws && details.ws.readyState === details.ws.OPEN) {
          try {
            details.ws.send(messageString);
            count++;
          } catch (error) {
            console.error(`ConnectionManager: Error broadcasting to ${connId}: ${error.message}`);
          }
        }
      }
    });
    if (count > 0) {
        // console.log(`ConnectionManager: Message broadcasted to ${count} clients.`); // Can be noisy
    }
    return count;
  }
}

// Export a singleton instance
const connectionManager = new ConnectionManager();
module.exports = connectionManager;
