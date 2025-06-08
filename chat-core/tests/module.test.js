// Assuming this is for chat-core module tests
const chatCoreModule = require('../src'); // This will require chat-core/src/index.js

describe('Chat-Core Module Exports', () => {
  it('should export the Express app instance', () => {
    expect(chatCoreModule.app).toBeDefined();
    // Check for a few indicative properties/methods of an Express app
    expect(typeof chatCoreModule.app.get).toBe('function');
    expect(typeof chatCoreModule.app.post).toBe('function');
    expect(typeof chatCoreModule.app.use).toBe('function'); // Corrected typo
  });

  it('should export the ConnectionManager instance', () => {
    expect(chatCoreModule.connectionManager).toBeDefined();
    // Check for a few indicative methods of ConnectionManager
    expect(typeof chatCoreModule.connectionManager.addConnection).toBe('function');
    expect(typeof chatCoreModule.connectionManager.getClientCount).toBe('function');
    expect(typeof chatCoreModule.connectionManager.broadcastMessage).toBe('function');
  });

  it('should export the MessageRouter instance', () => {
    expect(chatCoreModule.messageRouter).toBeDefined();
    // Check for a few indicative methods of MessageRouter
    expect(typeof chatCoreModule.messageRouter.handleIncomingMessage).toBe('function');
  });
});
