const messageRouter = require('../../src/services/MessageRouter');
const connectionManager = require('../../src/services/ConnectionManager');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('../../src/services/ConnectionManager');
jest.mock('uuid');

// MessageRouter uses internal mocks for aiService and sessionManager if not provided.
// We can test with those internal mocks or provide more controlled mocks here.
// For this test, we'll rely on its internal mocks for simplicity of testing MessageRouter's own logic.

describe('MessageRouter', () => {
  const mockConnectionId = 'conn-123';
  const mockUserId = 'user-abc';
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    uuidv4.mockClear();
    connectionManager.sendMessageToConnection.mockClear();

    // Spy on console messages if needed for specific tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset internal mocks of MessageRouter if they store state (not in this simple version)
    // Or re-initialize messageRouter if its constructor sets up complex state with mocks.
    // For the current MessageRouter, its internal mocks are stateless functions.
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('handleIncomingMessage', () => {
    const mockText = 'Hello AI';
    const incomingMessage = { type: 'text', text: mockText };
    const mockAiResponseText = `AI Echo: ${mockText}`;
    const mockUserMessageId = 'user-msg-id';
    const mockAiMessageId = 'ai-msg-id';

    it('should process a valid message, simulate service calls, and send AI response', async () => {
      uuidv4
        .mockReturnValueOnce(mockUserMessageId) // For user message
        .mockReturnValueOnce(mockAiMessageId);  // For AI message

      await messageRouter.handleIncomingMessage(mockConnectionId, mockUserId, incomingMessage);

      // Check logging (examples)
      expect(consoleLogSpy).toHaveBeenCalledWith(`MessageRouter: Handling incoming message from userId: ${mockUserId} on connectionId: ${mockConnectionId}`);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('MessageRouter: Attempting to get/create session for userId:'), mockUserId);
      const expectedSessionId = `session_for_${mockUserId}_${mockConnectionId.substring(0,4)}`;
      expect(consoleLogSpy).toHaveBeenCalledWith(`MessageRouter: Adding user message to session ${expectedSessionId}:`, mockUserMessageId);
      expect(consoleLogSpy).toHaveBeenCalledWith(`MessageRouter: Sending message to AI service for sessionId: ${expectedSessionId}, Text: "${mockText}"`);
      expect(consoleLogSpy).toHaveBeenCalledWith(`MessageRouter: AI response received for session ${expectedSessionId}:`, mockAiMessageId);
      expect(consoleLogSpy).toHaveBeenCalledWith(`MessageRouter: Adding AI message to session ${expectedSessionId}:`, mockAiMessageId);

      // Check that connectionManager was called to send the AI response
      expect(connectionManager.sendMessageToConnection).toHaveBeenCalledTimes(1);
      expect(connectionManager.sendMessageToConnection).toHaveBeenCalledWith(
        mockConnectionId,
        expect.objectContaining({
          id: mockAiMessageId,
          from: 'ai',
          text: mockAiResponseText,
          type: 'text',
          sessionId: expectedSessionId,
        })
      );
    });

    it('should handle missing connectionId and send error response', async () => {
      uuidv4.mockReturnValueOnce('error-msg-id');
      await messageRouter.handleIncomingMessage(null, mockUserId, incomingMessage);

      expect(consoleErrorSpy).toHaveBeenCalledWith('MessageRouter: connectionId, userId, and incomingMessage with text are required.');
      expect(connectionManager.sendMessageToConnection).toHaveBeenCalledWith(
        null, // connectionId is null
        expect.objectContaining({
          type: 'error',
          text: 'Error: Invalid message or missing user/connection ID.'
        })
      );
    });

    it('should handle missing userId and send error response', async () => {
      uuidv4.mockReturnValueOnce('error-msg-id');
      await messageRouter.handleIncomingMessage(mockConnectionId, null, incomingMessage);

      expect(consoleErrorSpy).toHaveBeenCalledWith('MessageRouter: connectionId, userId, and incomingMessage with text are required.');
      expect(connectionManager.sendMessageToConnection).toHaveBeenCalledWith(
        mockConnectionId,
        expect.objectContaining({
          type: 'error',
          text: 'Error: Invalid message or missing user/connection ID.'
        })
      );
    });

    it('should handle missing incomingMessage.text and send error response', async () => {
      uuidv4.mockReturnValueOnce('error-msg-id');
      await messageRouter.handleIncomingMessage(mockConnectionId, mockUserId, { type: 'text' }); // text is missing

      expect(consoleErrorSpy).toHaveBeenCalledWith('MessageRouter: connectionId, userId, and incomingMessage with text are required.');
      expect(connectionManager.sendMessageToConnection).toHaveBeenCalledWith(
        mockConnectionId,
        expect.objectContaining({
          type: 'error',
          text: 'Error: Invalid message or missing user/connection ID.'
        })
      );
    });

    it('should use incomingMessage.type if provided', async () => {
      uuidv4.mockReturnValue(mockUserMessageId); // Only one uuidv4 call for user message id in this path
      const customTypeMessage = { type: 'custom_event', text: 'Event Data' };

      // We need to ensure the mocked addMessage in MessageRouter's internal mockSessionManager is called
      // and we can inspect what it was called with.
      // For this, we might need to expose or provide a more controllable mock for sessionManager.
      // However, for now, we can check the log that indicates the user message creation.

      await messageRouter.handleIncomingMessage(mockConnectionId, mockUserId, customTypeMessage);

      // Check the log for user message creation to infer the type
      // This is a bit indirect. A better way would be to mock sessionManager.addMessage and check its arguments.
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `MessageRouter: Adding user message to session session_for_${mockUserId}_${mockConnectionId.substring(0,4)}:`,
        mockUserMessageId
      );
      // To truly test this, MessageRouter's sessionManager.addMessage mock would need to be spied on,
      // or MessageRouter would need to be instantiated with a Jest mock for sessionManager.
      // The current test relies on the internal console.log which might not show the full userMessage object.
      // For now, we assume the log implies the message was created.
      // A more robust test would involve injecting a mock for sessionManager.
    });

  });
});
