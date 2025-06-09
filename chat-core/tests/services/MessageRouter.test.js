// const messageRouter = require('../../src/services/MessageRouter'); // Import the instance
// We need to test the class, so we might need to re-require or use jest.isolateModules
const ConnectionManager = require('../../src/services/ConnectionManager'); // Real one for type checks, but will be mocked
const { v4: uuidv4 } = require('uuid');

// Mock external dependencies
jest.mock('../../src/services/ConnectionManager');
jest.mock('uuid');

// Mock the imported modules from other packages
const mockSessionManagerInstance = {
  getSession: jest.fn(),
  createSession: jest.fn(),
  addMessage: jest.fn(),
  getSessionAgent: jest.fn(),
};
jest.mock('../../chat-session/src', () => ({
  SessionManager: jest.fn(() => mockSessionManagerInstance),
}));

const mockDashScopeClientInstance = {
  sendMessage: jest.fn(),
};
jest.mock('../../ai-service/src', () => jest.fn(() => mockDashScopeClientInstance));


describe('MessageRouter', () => {
  let MessageRouterClass; // To get a fresh class definition
  let messageRouterInstance; // Instance to test
  let mockConnectionManager; // Instance of mocked ConnectionManager

  const mockConnectionId = 'conn-123';
  const mockUserId = 'user-abc';
  const mockSessionId = 'session-xyz';

  beforeEach(() => {
    // Reset all mocks before each test
    uuidv4.mockClear();
    mockSessionManagerInstance.getSession.mockReset();
    mockSessionManagerInstance.createSession.mockReset();
    mockSessionManagerInstance.addMessage.mockReset();
    mockSessionManagerInstance.getSessionAgent.mockReset();
    mockDashScopeClientInstance.sendMessage.mockReset();

    // Get the mock of ConnectionManager that is auto-created by jest.mock
    // The actual instance is imported by MessageRouter, so we use the mocked module's methods.
    mockConnectionManager = require('../../src/services/ConnectionManager');
    mockConnectionManager.sendMessageToConnection.mockClear();
    mockConnectionManager.getConnection.mockReturnValue({ ws: {}, id: mockConnectionId }); // Ensure getConnection returns something

    // Dynamically import MessageRouter to get a fresh instance with fresh mocks
    // This is important because MessageRouter creates its service instances in constructor or uses singletons
    jest.isolateModules(() => {
      MessageRouterClass = require('../../src/services/MessageRouter').constructor; // Assuming default export is the class
      // Or if it's a singleton: messageRouterInstance = require('../../src/services/MessageRouter');
      // The current MessageRouter exports a singleton instance.
      // For better testability of constructor-injected mocks, class should be exported.
      // Let's assume we adjust MessageRouter to export the class for proper DI testing,
      // or we test the singleton's behavior knowing it uses these top-level mocks.
      // For now, testing the singleton that's exported:
      messageRouterInstance = require('../../src/services/MessageRouter');
    });
  });

  describe('handleIncomingMessage', () => {
    const incomingText = 'Hello AI';
    const incomingMessage = { type: 'text', text: incomingText };
    const mockUserMessageId = 'user-msg-id';
    const mockAiMessageId = 'ai-msg-id';

    it('should process message for AI agent, call services, and send AI response', async () => {
      uuidv4.mockReturnValueOnce(mockUserMessageId).mockReturnValueOnce(mockAiMessageId);
      mockSessionManagerInstance.getSessionAgent.mockResolvedValue('ai');
      mockDashScopeClientInstance.sendMessage.mockResolvedValue(`AI says: ${incomingText}`);

      await messageRouterInstance.handleIncomingMessage(mockConnectionId, mockUserId, mockSessionId, incomingMessage);

      expect(mockSessionManagerInstance.addMessage).toHaveBeenCalledTimes(2); // User and AI message
      expect(mockSessionManagerInstance.addMessage).toHaveBeenCalledWith(mockSessionId, expect.objectContaining({
        id: mockUserMessageId, from: 'user', text: incomingText, sessionId: mockSessionId, userId: mockUserId
      }));
      expect(mockSessionManagerInstance.getSessionAgent).toHaveBeenCalledWith(mockSessionId);
      expect(mockDashScopeClientInstance.sendMessage).toHaveBeenCalledWith(mockSessionId, incomingText);
      expect(mockSessionManagerInstance.addMessage).toHaveBeenCalledWith(mockSessionId, expect.objectContaining({
        id: mockAiMessageId, from: 'ai', text: `AI says: ${incomingText}`, sessionId: mockSessionId
      }));
      expect(mockConnectionManager.sendMessageToConnection).toHaveBeenCalledWith(mockConnectionId, expect.objectContaining({
        id: mockAiMessageId, from: 'ai', text: `AI says: ${incomingText}`
      }));
    });

    it('should handle message for human agent and send system ACK', async () => {
      uuidv4.mockReturnValueOnce(mockUserMessageId).mockReturnValueOnce('system-ack-id');
      mockSessionManagerInstance.getSessionAgent.mockResolvedValue('human');

      await messageRouterInstance.handleIncomingMessage(mockConnectionId, mockUserId, mockSessionId, incomingMessage);

      expect(mockSessionManagerInstance.addMessage).toHaveBeenCalledTimes(1); // Only user message
      expect(mockSessionManagerInstance.addMessage).toHaveBeenCalledWith(mockSessionId, expect.objectContaining({
        id: mockUserMessageId, from: 'user', text: incomingText
      }));
      expect(mockSessionManagerInstance.getSessionAgent).toHaveBeenCalledWith(mockSessionId);
      expect(mockDashScopeClientInstance.sendMessage).not.toHaveBeenCalled();
      expect(mockConnectionManager.sendMessageToConnection).toHaveBeenCalledWith(mockConnectionId, expect.objectContaining({
        id: 'system-ack-id', from: 'system', type: 'system_info', text: expect.stringContaining('Current agent is human')
      }));
    });

    it('should send error to client if essential parameters are missing', async () => {
      uuidv4.mockReturnValueOnce('error-msg-id');
      await messageRouterInstance.handleIncomingMessage(mockConnectionId, null, mockSessionId, incomingMessage); // userId is null

      expect(mockConnectionManager.sendMessageToConnection).toHaveBeenCalledWith(mockConnectionId,
        expect.objectContaining({ type: 'error', text: expect.stringContaining('Invalid message or missing user/session/connection information') })
      );
    });

    it('should send error to client if getSessionAgent fails', async () => {
      uuidv4.mockReturnValueOnce(mockUserMessageId).mockReturnValueOnce('error-msg-id');
      mockSessionManagerInstance.getSessionAgent.mockRejectedValue(new Error('Redis unavailable'));

      await messageRouterInstance.handleIncomingMessage(mockConnectionId, mockUserId, mockSessionId, incomingMessage);

      expect(mockSessionManagerInstance.addMessage).toHaveBeenCalledTimes(1); // User message still added
      expect(mockConnectionManager.sendMessageToConnection).toHaveBeenCalledWith(mockConnectionId,
        expect.objectContaining({ type: 'error', text: 'Error determining current agent for your session.' })
      );
    });

    it('should send error to client if aiService.sendMessage fails', async () => {
      uuidv4.mockReturnValueOnce(mockUserMessageId) // user message
              .mockReturnValueOnce('ai-error-system-msg-id') // system message about AI error
              .mockReturnValueOnce(mockAiMessageId); // AI message (containing error text)
      mockSessionManagerInstance.getSessionAgent.mockResolvedValue('ai');
      mockDashScopeClientInstance.sendMessage.mockRejectedValue(new Error('AI service down'));

      await messageRouterInstance.handleIncomingMessage(mockConnectionId, mockUserId, mockSessionId, incomingMessage);

      // System message sent immediately upon AI error
      expect(mockConnectionManager.sendMessageToConnection).toHaveBeenCalledWith(mockConnectionId,
        expect.objectContaining({
            id: 'ai-error-system-msg-id',
            from: 'system',
            text: 'Sorry, I encountered an error trying to reach the AI service.',
            type: 'error'
        })
      );
      // Then, the AI message (with error content) is also sent
      expect(mockConnectionManager.sendMessageToConnection).toHaveBeenCalledWith(mockConnectionId,
        expect.objectContaining({
            id: mockAiMessageId,
            from: 'ai',
            text: 'Sorry, I encountered an error trying to reach the AI service.'
        })
      );
      expect(mockSessionManagerInstance.addMessage).toHaveBeenCalledTimes(2); // User and AI (error) message
    });
  });
});
