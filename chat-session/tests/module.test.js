// Since this test runs via Jest, jest will handle the mocks defined for other tests if not careful.
// However, for a simple module import test, we want to test the actual module structure.
// We need to ensure that when we require('../src'), it's not getting a globally mocked version
// of SessionManager or redisClient from other test files' jest.mock calls.
// Jest's module system sandboxing per test file usually handles this,
// but let's be mindful if `utils/redis` is auto-mocked by jest.config or similar.

// Unmock utils/redis for this specific test file if it was globally mocked,
// to ensure we are testing the actual export from src/index.js which should export the real client.
// However, the shared redisClient instance IS mocked in SessionManager.test.js for utils/redis.
// This test should respect that mock if it's testing the module as a whole package consumer would.
// For now, assume default jest behavior: mocks are per test file unless explicitly unmocked.
// The `SessionManager.test.js` mocks `../../src/utils/redis`.
// This test file requires `../src` which requires `./utils/redis`.
// So, the `redisClient` we get here should be the one mocked by `SessionManager.test.js`'s setup
// if tests were running in a way that mocks bleed (not typical).
// But since they are separate files, this test should get the *actual* `utils/redis` unless
// we explicitly mock it here or Jest is configured for auto-mocking.
// Our `utils/redis.js` initializes and exports a real (or mockable via .env) client.
// The mock in SessionManager.test.js is specific to that file's context when it requires SessionManager.

// Let's get what src/index.js exports:
const chatSessionModule = require('../src');

describe('Chat Session Module', () => {
  it('should export SessionManager correctly', () => {
    expect(chatSessionModule.SessionManager).toBeDefined();
    expect(typeof chatSessionModule.SessionManager).toBe('function'); // Class constructor
  });

  it('should export redisClient correctly', () => {
    expect(chatSessionModule.redisClient).toBeDefined();
    expect(typeof chatSessionModule.redisClient).toBe('object'); // ioredis client instance
    // Check for a few indicative methods of an ioredis client
    expect(typeof chatSessionModule.redisClient.get).toBe('function');
    expect(typeof chatSessionModule.redisClient.set).toBe('function');
    expect(typeof chatSessionModule.redisClient.pipeline).toBe('function');
  });

  it('SessionManager can be instantiated (basic check)', () => {
    const { SessionManager, redisClient: clientFromModule } = chatSessionModule;
    // We can pass the clientFromModule or let SessionManager use its default import
    const sessionManager = new SessionManager(clientFromModule);
    expect(sessionManager).toBeInstanceOf(SessionManager);
    expect(sessionManager.redis).toBe(clientFromModule);

    // Test with default client import within SessionManager
    // This requires that the `utils/redis` is not messed up by other test's mocks.
    // The mock for `../../src/utils/redis` in `SessionManager.test.js` should not affect this file.
    const sessionManagerWithDefault = new SessionManager();
    expect(sessionManagerWithDefault).toBeInstanceOf(SessionManager);
    expect(sessionManagerWithDefault.redis).toBe(clientFromModule); // Because src/utils/redis exports a singleton
                                                                 // which is what our module under test also exports.
  });
});
