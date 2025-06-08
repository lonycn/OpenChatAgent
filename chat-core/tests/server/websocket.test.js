const WebSocket = require('ws');
const { initializeWebSocket } = require('../../src/server/websocket');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const connectionManager = require('../../src/services/ConnectionManager');
const messageRouter = require('../../src/services/MessageRouter');

// Mock dependencies
jest.mock('ws');
jest.mock('uuid');
jest.mock('../../src/services/ConnectionManager');
jest.mock('../../src/services/MessageRouter');

describe('initializeWebSocket', () => {
  let mockHttpServer;
  let mockWssInstance; // To access the instance created by new WebSocket.Server

  beforeEach(() => {
    // Reset all mocks
    WebSocket.Server.mockClear();
    uuidv4.mockClear();
    connectionManager.addConnection.mockClear();
    connectionManager.removeConnection.mockClear();
    connectionManager.sendMessageToConnection.mockClear();
    connectionManager.getClientCount.mockReturnValue(0); // Default mock
    messageRouter.handleIncomingMessage.mockClear().mockResolvedValue(); // Default mock

    // Mock WebSocket.Server constructor and its instance methods
    mockWssInstance = {
      on: jest.fn(),
      clients: new Set(), // Simulate the clients Set
      close: jest.fn(cb => cb && cb()),
    };
    WebSocket.Server.mockImplementation(() => mockWssInstance);

    // Create a simple mock HTTP server
    mockHttpServer = new http.Server();
  });

  it('should require an HTTP server instance', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const wss = initializeWebSocket(null);
    expect(wss).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('WebSocket Server: HTTP server instance is required.');
    consoleErrorSpy.mockRestore();
  });

  it('should create a new WebSocket.Server instance attached to the httpServer', () => {
    initializeWebSocket(mockHttpServer);
    expect(WebSocket.Server).toHaveBeenCalledTimes(1);
    expect(WebSocket.Server).toHaveBeenCalledWith({ server: mockHttpServer });
  });

  it('should set up a "connection" event listener', () => {
    initializeWebSocket(mockHttpServer);
    expect(mockWssInstance.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  describe('WebSocket "connection" event', () => {
    let mockWsConnection;
    let connectionCallback;
    const mockClientId = 'mock-client-id';
    const mockIp = '127.0.0.1';

    beforeEach(() => {
      initializeWebSocket(mockHttpServer);
      // Get the actual connection callback passed to wss.on('connection', ...)
      connectionCallback = mockWssInstance.on.mock.calls.find(call => call[0] === 'connection')[1];

      uuidv4.mockReturnValue(mockClientId); // For ws.id

      mockWsConnection = {
        id: '', // Will be set by the connection callback
        on: jest.fn(),
        send: jest.fn(),
        // Simulate other ws properties if needed by your code
      };

      // Simulate a new connection
      // For 'req' object in 'connection' event: { headers: {}, socket: { remoteAddress: ''} }
      const mockReq = { headers: {}, socket: { remoteAddress: mockIp } };
      mockWssInstance.clients.add(mockWsConnection); // Simulate client being added
      connectionManager.getClientCount.mockReturnValue(mockWssInstance.clients.size);

      connectionCallback(mockWsConnection, mockReq); // Manually trigger the connection callback
    });

    afterEach(() => {
       mockWssInstance.clients.clear(); // Clean up clients
    });

    it('should assign a unique ID to the ws connection', () => {
      expect(uuidv4).toHaveBeenCalledTimes(1); // For ws.id
      expect(mockWsConnection.id).toBe(mockClientId);
    });

    it('should add connection to ConnectionManager', () => {
      expect(connectionManager.addConnection).toHaveBeenCalledWith(mockClientId, mockWsConnection);
    });

    it('should log client connection and send a welcome message', () => {
      expect(connectionManager.sendMessageToConnection).toHaveBeenCalledWith(
        mockClientId,
        expect.objectContaining({
          type: 'system',
          message: 'Welcome to Chat-core!',
          clientId: mockClientId,
        })
      );
    });

    it('should set up "message", "close", and "error" listeners for the client', () => {
      expect(mockWsConnection.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWsConnection.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWsConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    describe('client "message" event', () => {
      let messageCallback;
      const incomingMessageText = 'Hello Server!';
      const incomingMessageObject = { type: 'text', text: incomingMessageText };

      beforeEach(() => {
        messageCallback = mockWsConnection.on.mock.calls.find(call => call[0] === 'message')[1];
      });

      it('should parse JSON message and call messageRouter.handleIncomingMessage', async () => {
        uuidv4.mockReturnValueOnce('message-id-user').mockReturnValueOnce('message-id-ack'); // For message IDs if needed
        const messageBuffer = Buffer.from(JSON.stringify(incomingMessageObject));
        await messageCallback(messageBuffer); // Trigger message event

        expect(messageRouter.handleIncomingMessage).toHaveBeenCalledTimes(1);
        expect(messageRouter.handleIncomingMessage).toHaveBeenCalledWith(
          mockClientId,
          `user_for_${mockClientId}`, // placeholderUserId
          incomingMessageObject
        );
      });

      it('should handle non-JSON message and send error back to client', async () => {
        const nonJsonMessageBuffer = Buffer.from("this is not json");
        await messageCallback(nonJsonMessageBuffer);

        expect(messageRouter.handleIncomingMessage).not.toHaveBeenCalled(); // Should not be called for invalid JSON
        expect(connectionManager.sendMessageToConnection).toHaveBeenCalledWith(
          mockClientId,
          expect.objectContaining({
            type: 'error',
            message: 'Invalid message format received. Please send JSON.',
            originalMessage: "this is not json",
          })
        );
      });
       it('should handle error from messageRouter.handleIncomingMessage', async () => {
        const errorMessage = 'Router error';
        messageRouter.handleIncomingMessage.mockRejectedValue(new Error(errorMessage));
        const messageBuffer = Buffer.from(JSON.stringify(incomingMessageObject));
        await messageCallback(messageBuffer);

        expect(connectionManager.sendMessageToConnection).toHaveBeenCalledWith(
          mockClientId,
          expect.objectContaining({
            type: 'error',
            message: 'An error occurred while processing your message.',
            details: errorMessage,
          })
        );
      });
    });

    describe('client "close" event', () => {
      it('should remove connection from ConnectionManager and log', () => {
        const closeCallback = mockWsConnection.on.mock.calls.find(call => call[0] === 'close')[1];
        mockWssInstance.clients.delete(mockWsConnection); // Simulate client being removed from wss.clients
        connectionManager.getClientCount.mockReturnValue(mockWssInstance.clients.size);

        closeCallback(1000, 'Normal closure');
        expect(connectionManager.removeConnection).toHaveBeenCalledWith(mockClientId);
        // Check console log (optional, can be tricky or use spyOn(console, 'log'))
      });
    });

    describe('client "error" event', () => {
      it('should log the error', () => {
        const errorCallback = mockWsConnection.on.mock.calls.find(call => call[0] === 'error')[1];
        const mockError = new Error("Test WebSocket error");
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        errorCallback(mockError);
        expect(consoleErrorSpy).toHaveBeenCalledWith(`WebSocket: Error on connection ${mockClientId}:`, mockError);
        consoleErrorSpy.mockRestore();
      });
    });
  });
});
