const { v4: uuidv4 } = require('uuid');
const connectionManager = require('./ConnectionManager');
const DashScopeClient = require('../../ai-service/src'); // Assuming sibling directory structure
const { SessionManager } = require('../../chat-session/src');

class MessageRouter {
  constructor(aiServiceInstance, sessionManagerInstance) {
    if (aiServiceInstance) {
      this.aiService = aiServiceInstance;
    } else {
      // Ensure API keys are loaded via dotenv in the entry point (e.g., server/index.js)
      const apiKey = process.env.ALICLOUD_API_KEY;
      const apiSecret = process.env.ALICLOUD_API_SECRET;
      if (!apiKey || !apiSecret) {
        console.warn('MessageRouter: ALICLOUD_API_KEY or ALICLOUD_API_SECRET not found in environment. AI service may not function.');
        // Create a dummy aiService that indicates error or limited functionality
        this.aiService = {
          sendMessage: async (sessionId, text) => {
            console.error('MockAI ( λόγω fehlender Schlüssel ): API-Schlüssel nicht konfiguriert.'); // German for "due to missing keys"
            return "AI Service not configured due to missing API keys.";
          }
        };
      } else {
        this.aiService = new DashScopeClient(apiKey, apiSecret);
      }
    }

    this.sessionManager = sessionManagerInstance || new SessionManager();
    console.log('MessageRouter initialized.');
  }

  async handleIncomingMessage(connectionId, userId, sessionId, incomingMessage) { // Updated signature
    const clientWs = connectionManager.getConnection(connectionId);
    if (!clientWs) {
        console.error(`MessageRouter: No active WebSocket connection found for ID ${connectionId}. Cannot proceed.`);
        return; // Cannot send error message if ws is gone
    }

    // userId and sessionId are now expected to be reliably provided by websocket.js after init
    if (!userId || !sessionId || !incomingMessage || !incomingMessage.text) {
      console.error('MessageRouter: connectionId, userId, sessionId, and incomingMessage with text are required.');
      const errorResponse = {
        id: uuidv4(),
        from: 'system',
        text: 'Error: Invalid message or missing user/session/connection information.',
        timestamp: new Date().toISOString(),
        type: 'error'
      };
      connectionManager.sendMessageToConnection(connectionId, errorResponse);
      return;
    }

    console.log(`MessageRouter: Handling incoming message from userId: ${userId} on conn: ${connectionId} for session: ${sessionId}`);

    try {
      // SessionId is now passed in and assumed to be valid and associated with userId by websocket.js
      const actualSessionId = sessionId;

      // 1. Create user message object and add to session history
      const userMessage = {
        id: uuidv4(),
        from: 'user',
        text: incomingMessage.text,
        timestamp: new Date().toISOString(),
        type: incomingMessage.type || 'text',
        sessionId: actualSessionId, // Use provided sessionId
        userId,
      };
      console.log(`MessageRouter: Adding user message to session ${actualSessionId}:`, userMessage.id);
      await this.sessionManager.addMessage(actualSessionId, userMessage);

      // 2. Get current agent
      let currentAgent;
      try {
        currentAgent = await this.sessionManager.getSessionAgent(actualSessionId);
        console.log(`MessageRouter: Current agent for session ${actualSessionId} is ${currentAgent}`);
      } catch (agentError) {
        console.error(`MessageRouter: Error getting agent for session ${actualSessionId}:`, agentError);
        connectionManager.sendMessageToConnection(connectionId, {
          id: uuidv4(), from: 'system', text: 'Error determining current agent for your session.',
          timestamp: new Date().toISOString(), type: 'error', sessionId: actualSessionId
        });
        return; // Stop processing if we can't determine the agent
      }

      // Default to 'ai' if currentAgent is null or undefined (e.g., new session where agent key wasn't explicitly set yet)
      if (currentAgent === 'ai' || currentAgent === null || currentAgent === undefined) {
        console.log(`MessageRouter: Routing to AI for session: ${actualSessionId}, Text: "${userMessage.text}"`);

        let aiServiceResponseText;
        try {
          aiServiceResponseText = await this.aiService.sendMessage(actualSessionId, userMessage.text);
        } catch (aiError) {
          console.error(`MessageRouter: Error calling AI service for session ${actualSessionId}:`, aiError);
          aiServiceResponseText = "Sorry, I encountered an error trying to reach the AI service.";
          // Send error to client, but still log this "AI attempt" as an AI message.
          // The client will see the AI's error message.
        }

        const aiMessage = {
          id: uuidv4(),
          from: 'ai',
          text: aiServiceResponseText,
          timestamp: new Date().toISOString(),
          type: 'text',
          sessionId: actualSessionId,
        };
        console.log(`MessageRouter: AI response processed for session ${actualSessionId}: ${aiMessage.id}`);

        await this.sessionManager.addMessage(actualSessionId, aiMessage);
        console.log(`MessageRouter: AI message added to session ${actualSessionId}: ${aiMessage.id}`);

        connectionManager.sendMessageToConnection(connectionId, aiMessage);

      } else if (currentAgent === 'human') {
        console.log(`MessageRouter: Message for session ${actualSessionId} to be handled by human agent: ${userMessage.text}`);
        // Placeholder for notifying human agents (e.g., publish to a queue)

        const humanAckMessage = {
          id: uuidv4(),
          from: 'system',
          text: 'Your message has been received and a human agent will respond shortly.',
          timestamp: new Date().toISOString(),
          type: 'system_ack', // Using a more specific type
          sessionId: actualSessionId
        };
        connectionManager.sendMessageToConnection(connectionId, humanAckMessage);

        // Optionally, store this system acknowledgement message to history
        // await this.sessionManager.addMessage(actualSessionId, humanAckMessage);
        // console.log(`MessageRouter: Human ACK message added to session ${actualSessionId}: ${humanAckMessage.id}`);

      } else {
        // Should not happen if agent values are strictly 'ai' or 'human'
        console.error(`MessageRouter: Unknown agent type '${currentAgent}' for session ${actualSessionId}.`);
        connectionManager.sendMessageToConnection(connectionId, {
          id: uuidv4(), from: 'system', text: 'Error: Unknown agent type assigned to your session.',
          timestamp: new Date().toISOString(), type: 'error', sessionId: actualSessionId
        });
      }
    } catch (error) {
      console.error(`MessageRouter: General error handling message for userId ${userId}, connectionId ${connectionId}, sessionId ${sessionId}: ${error.message}`, error.stack);
      const errorResponse = {
        id: uuidv4(),
        from: 'system',
        text: `Error processing your message: ${error.message}`,
        timestamp: new Date().toISOString(),
        type: 'error'
      };
      connectionManager.sendMessageToConnection(connectionId, errorResponse);
    }
  }
}

// Export a singleton instance
const messageRouter = new MessageRouter(null, new SessionManager());
module.exports = messageRouter;
