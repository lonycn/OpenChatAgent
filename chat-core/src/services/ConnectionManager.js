class ConnectionManager {
  constructor() {
    this.connections = new Map(); // Key: connectionId (ws.id), Value: ws object
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
    this.connections.set(connectionId, ws);
    console.log(`ConnectionManager: Connection ${connectionId} added. Total: ${this.getClientCount()}`);
    return true;
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
    return this.connections.get(connectionId);
  }

  getAllConnections() {
    return Array.from(this.connections.values());
  }

  getClientCount() {
    return this.connections.size;
  }

  sendMessageToConnection(connectionId, message) {
    const ws = this.getConnection(connectionId);
    if (ws && ws.readyState === ws.OPEN) { // Check if WebSocket.OPEN (usually 1)
      try {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        ws.send(messageString);
        console.log(`ConnectionManager: Message sent to ${connectionId}.`);
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
    this.connections.forEach((ws, connectionId) => {
      if (connectionId !== exceptConnectionId) {
        if (ws && ws.readyState === ws.OPEN) { // Check if WebSocket.OPEN
          try {
            ws.send(messageString);
            count++;
          } catch (error) {
            console.error(`ConnectionManager: Error broadcasting to ${connectionId}: ${error.message}`);
            // Optionally remove connection
          }
        }
      }
    });
    if (count > 0) {
        console.log(`ConnectionManager: Message broadcasted to ${count} clients.`);
    }
    return count;
  }
}

// Export a singleton instance
const connectionManager = new ConnectionManager();
module.exports = connectionManager;
