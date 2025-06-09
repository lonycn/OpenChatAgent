// Import the singleton instance for testing
const connectionManager = require('../../src/services/ConnectionManager');

// WebSocket constants (if not available in Node without 'ws' module, define manually for test)
const WebSocketOPEN = 1;
// const WebSocketCLOSED = 3; // Example, actual values depend on 'ws' module or WebSocket spec

describe('ConnectionManager', () => {
  let mockWs1, mockWs2;

  beforeEach(() => {
    // Clear connections before each test
    connectionManager.connections.clear();

    mockWs1 = {
      id: 'conn1',
      send: jest.fn(),
      readyState: WebSocketOPEN, // Simulate open connection
    };
    mockWs2 = {
      id: 'conn2',
      send: jest.fn(),
      readyState: WebSocketOPEN,
    };
  });

  afterEach(() => {
    // Restore any global mocks if necessary, though none are set up here globally
  });

  describe('addConnection', () => {
    it('should add a connection to the store', () => {
      connectionManager.addConnection(mockWs1.id, mockWs1);
      expect(connectionManager.getClientCount()).toBe(1);
      expect(connectionManager.getConnection(mockWs1.id)).toBe(mockWs1);
    });

    it('should overwrite if connectionId already exists', () => {
      const newMockWs1 = { ...mockWs1, data: 'newData' };
      connectionManager.addConnection(mockWs1.id, mockWs1);
      connectionManager.addConnection(mockWs1.id, newMockWs1); // Add again with same ID
      expect(connectionManager.getClientCount()).toBe(1);
      expect(connectionManager.getConnection(mockWs1.id)).toBe(newMockWs1);
    });

    it('should not add connection if connectionId or ws is missing', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(connectionManager.addConnection(null, mockWs1)).toBe(false);
      expect(connectionManager.addConnection(mockWs1.id, null)).toBe(false);
      expect(connectionManager.getClientCount()).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('removeConnection', () => {
    it('should remove an existing connection', () => {
      connectionManager.addConnection(mockWs1.id, mockWs1);
      expect(connectionManager.removeConnection(mockWs1.id)).toBe(true);
      expect(connectionManager.getClientCount()).toBe(0);
      expect(connectionManager.getConnection(mockWs1.id)).toBeUndefined();
    });

    it('should return false if connectionId not found for removal', () => {
      expect(connectionManager.removeConnection('nonexistent-id')).toBe(false);
    });

    it('should not remove if connectionId is missing', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      connectionManager.addConnection(mockWs1.id, mockWs1);
      expect(connectionManager.removeConnection(null)).toBe(false);
      expect(connectionManager.getClientCount()).toBe(1); // Should still be there
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getConnection', () => {
    it('should return the ws object for an existing connectionId', () => {
      connectionManager.addConnection(mockWs1.id, mockWs1);
      expect(connectionManager.getConnection(mockWs1.id)).toBe(mockWs1);
    });

    it('should return undefined for a non-existent connectionId', () => {
      expect(connectionManager.getConnection('nonexistent-id')).toBeUndefined();
    });

    it('should return undefined if connectionId is null', () => {
      expect(connectionManager.getConnection(null)).toBeUndefined();
    });
  });

  describe('getAllConnections', () => {
    it('should return an array of all ws objects', () => {
      connectionManager.addConnection(mockWs1.id, mockWs1);
      connectionManager.addConnection(mockWs2.id, mockWs2);
      const allConns = connectionManager.getAllConnections();
      expect(Array.isArray(allConns)).toBe(true);
      expect(allConns.length).toBe(2);
      expect(allConns).toContain(mockWs1);
      expect(allConns).toContain(mockWs2);
    });

    it('should return an empty array if no connections', () => {
      expect(connectionManager.getAllConnections()).toEqual([]);
    });
  });

  describe('getClientCount', () => {
    it('should return the correct number of active connections', () => {
      expect(connectionManager.getClientCount()).toBe(0);
      connectionManager.addConnection(mockWs1.id, mockWs1);
      expect(connectionManager.getClientCount()).toBe(1);
      connectionManager.addConnection(mockWs2.id, mockWs2);
      expect(connectionManager.getClientCount()).toBe(2);
      connectionManager.removeConnection(mockWs1.id);
      expect(connectionManager.getClientCount()).toBe(1);
    });
  });

  describe('sendMessageToConnection', () => {
    beforeEach(() => {
      connectionManager.addConnection(mockWs1.id, mockWs1);
    });

    it('should send a stringified JSON message to an existing open connection', () => {
      const message = { type: 'test', data: 'hello' };
      const result = connectionManager.sendMessageToConnection(mockWs1.id, message);
      expect(result).toBe(true);
      expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should send a plain string message if message is already string', () => {
      const message = 'This is a plain string';
      const result = connectionManager.sendMessageToConnection(mockWs1.id, message);
      expect(result).toBe(true);
      expect(mockWs1.send).toHaveBeenCalledWith(message);
    });

    it('should return false if connectionId does not exist', () => {
      const message = { type: 'test' };
      expect(connectionManager.sendMessageToConnection('nonexistent-id', message)).toBe(false);
      expect(mockWs1.send).not.toHaveBeenCalled(); // Ensure it wasn't sent to the wrong client
    });

    it('should return false if connection is not open', () => {
      mockWs1.readyState = 3; // Simulate WebSocket.CLOSED
      const message = { type: 'test' };
      expect(connectionManager.sendMessageToConnection(mockWs1.id, message)).toBe(false);
      expect(mockWs1.send).not.toHaveBeenCalled();
    });

    it('should return false and log error if ws.send throws', () => {
      const message = { type: 'test' };
      mockWs1.send.mockImplementationOnce(() => { throw new Error('Send failed'); });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(connectionManager.sendMessageToConnection(mockWs1.id, message)).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `ConnectionManager: Error sending message to ${mockWs1.id}: Send failed`,
        message
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('broadcastMessage', () => {
    beforeEach(() => {
      connectionManager.addConnection(mockWs1.id, mockWs1);
      connectionManager.addConnection(mockWs2.id, mockWs2);
    });

    it('should send a message to all connected clients', () => {
      const message = { type: 'broadcast', content: 'important update' };
      const count = connectionManager.broadcastMessage(message);

      expect(count).toBe(2);
      expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should send a plain string message to all clients', () => {
      const message = 'Plain broadcast';
      const count = connectionManager.broadcastMessage(message);

      expect(count).toBe(2);
      expect(mockWs1.send).toHaveBeenCalledWith(message);
      expect(mockWs2.send).toHaveBeenCalledWith(message);
    });

    it('should exclude exceptConnectionId from broadcast', () => {
      const message = { type: 'broadcast', content: 'update for others' };
      const count = connectionManager.broadcastMessage(message, mockWs1.id);

      expect(count).toBe(1);
      expect(mockWs1.send).not.toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should not send to clients not in OPEN state', () => {
      mockWs2.readyState = 3; // Simulate WebSocket.CLOSED
      const message = { type: 'broadcast' };
      const count = connectionManager.broadcastMessage(message);

      expect(count).toBe(1); // Only sent to ws1
      expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockWs2.send).not.toHaveBeenCalled();
    });

    it('should handle errors during individual sends in broadcast', () => {
      mockWs1.send.mockImplementationOnce(() => { throw new Error('Send failed for ws1'); });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const message = { type: 'broadcast', content: 'critical' };

      const count = connectionManager.broadcastMessage(message);

      expect(count).toBe(1); // ws2 should still receive
      expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `ConnectionManager: Error broadcasting to ${mockWs1.id}: Send failed for ws1`
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
