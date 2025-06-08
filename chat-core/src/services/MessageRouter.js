const { v4: uuidv4 } = require('uuid');
const connectionManager = require('./ConnectionManager');
// const aiService = require('ai-service'); // Placeholder for actual ai-service module
// const { SessionManager } = require('chat-session'); // Placeholder for actual chat-session module

class MessageRouter {
  constructor(aiServiceInstance, sessionManagerInstance) {
    // For now, these can be null or mocked if not provided,
    // as we are simulating their interactions.
    this.aiService = aiServiceInstance || {
      sendMessage: async (sessionId, text) => {
        console.log(`MockAI: Received message for session ${sessionId}: "${text}"`);
        return `AI Echo: ${text}`; // Simulate AI processing
      }
    };
    this.sessionManager = sessionManagerInstance || {
      createSession: async (userId) => {
        const sessionId = `session_for_${userId}_${uuidv4().substring(0, 8)}`;
        console.log(`MockSessionManager: Created session ${sessionId} for user ${userId}`);
        return { sessionId, userId, createdAt: new Date().toISOString(), currentAgent: 'ai' };
      },
      addMessage: async (sessionId, message) => {
        console.log(`MockSessionManager: Message added to session ${sessionId}:`, message);
        return { success: true, messageId: message.id };
      },
      // Add other necessary mocked methods if handleIncomingMessage uses them
      // e.g., getSession, extendSession (though extendSession is often called by addMessage)
    };
    console.log('MessageRouter initialized.');
  }

  async handleIncomingMessage(connectionId, userId, incomingMessage) {
    if (!connectionId || !userId || !incomingMessage || !incomingMessage.text) {
      console.error('MessageRouter: connectionId, userId, and incomingMessage with text are required.');
      const errorResponse = {
        id: uuidv4(),
        from: 'system',
        text: 'Error: Invalid message or missing user/connection ID.',
        timestamp: new Date().toISOString(),
        type: 'error'
      };
      connectionManager.sendMessageToConnection(connectionId, errorResponse);
      return;
    }

    console.log(`MessageRouter: Handling incoming message from userId: ${userId} on connectionId: ${connectionId}`);

    // 1. Simulate interaction with chat-session: Get/Create session
    // In a real scenario, you might first try to get an existing session for the userId or connectionId
    console.log(`MessageRouter: Attempting to get/create session for userId: ${userId}`);
    // For simulation, let's assume we always get/create one.
    // A real implementation might involve looking up an active session for the userId/connectionId.
    // const session = await this.sessionManager.getActiveSessionForUser(userId) || await this.sessionManager.createSession(userId);
    const sessionId = `session_for_${userId}_${connectionId.substring(0,4)}`; // Simplified session ID for simulation

    // 2. Create user message object and add to session history (simulated)
    const userMessage = {
      id: uuidv4(),
      from: 'user',
      text: incomingMessage.text,
      timestamp: new Date().toISOString(),
      type: incomingMessage.type || 'text', // Use incoming type or default to text
      sessionId,
      userId,
      connectionId // Good to log which connection it came from
    };
    console.log(`MessageRouter: Adding user message to session ${sessionId}:`, userMessage.id);
    await this.sessionManager.addMessage(sessionId, userMessage); // Simulated

    // 3. Simulate interaction with ai-service
    console.log(`MessageRouter: Sending message to AI service for sessionId: ${sessionId}, Text: "${userMessage.text}"`);
    // In a real scenario, aiService.sendMessage might take the whole context or just the latest text + sessionId
    const aiText = await this.aiService.sendMessage(sessionId, userMessage.text); // Simulated

    const aiMessage = {
      id: uuidv4(),
      from: 'ai',
      text: aiText,
      timestamp: new Date().toISOString(),
      type: 'text',
      sessionId,
    };
    console.log(`MessageRouter: AI response received for session ${sessionId}:`, aiMessage.id);

    // 4. Simulate adding AI response to chat-session
    console.log(`MessageRouter: Adding AI message to session ${sessionId}:`, aiMessage.id);
    await this.sessionManager.addMessage(sessionId, aiMessage); // Simulated

    // 5. Send AI response back to the specific client
    connectionManager.sendMessageToConnection(connectionId, aiMessage);
  }
}

// Export a singleton instance
// For real usage, you'd inject actual aiService and sessionManager instances
const messageRouter = new MessageRouter(null, null); // Using mocked defaults for now
module.exports = messageRouter;
