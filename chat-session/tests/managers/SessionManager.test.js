const SessionManager = require('../../src/managers/SessionManager');
const { v4: uuidv4 } = require('uuid');

// Mock ioredis client and uuid
jest.mock('ioredis', () => {
  const mockPipelineInstance = {
    hmset: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    hset: jest.fn().mockReturnThis(), // Added hset
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    rpush: jest.fn().mockReturnThis(),
    lrange: jest.fn().mockReturnThis(),
  };
  const mockRedisInstance = {
    hmset: jest.fn(),
    set: jest.fn(),
    hset: jest.fn(), // Added hset
    get: jest.fn(),
    hgetall: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    rpush: jest.fn(),
    lrange: jest.fn(),
    pipeline: jest.fn(() => mockPipelineInstance),
    on: jest.fn(),
    connected: true,
    status: 'ready',
    options: {},
  };
  return jest.fn(() => mockRedisInstance);
});

jest.mock('../../src/utils/redis', () => {
  // This mock is for when SessionManager is instantiated without a client,
  // falling back to require('../utils/redis').
  return {
    hmset: jest.fn(),
    set: jest.fn(),
    hset: jest.fn(), // Added hset
    get: jest.fn(),
    hgetall: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    rpush: jest.fn(),
    lrange: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      hmset: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      hset: jest.fn().mockReturnThis(), // Added hset
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      rpush: jest.fn().mockReturnThis(),
      lrange: jest.fn().mockReturnThis(),
    }),
    on: jest.fn(),
    connected: true,
    status: 'ready',
    options: {},
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('SessionManager', () => {
  let sessionManager;
  let mockRedis;
  let mockPipeline; // To access the pipeline methods for verifications

  beforeEach(() => {
    const Redis = require('ioredis');
    mockRedis = new Redis();
    mockPipeline = mockRedis.pipeline(); // Get the mock pipeline instance

    // Reset all direct methods of mockRedis
    mockRedis.hmset.mockReset();
    mockRedis.set.mockReset();
    mockRedis.hset.mockReset(); // Ensure hset is reset
    mockRedis.get.mockReset();
    mockRedis.hgetall.mockReset();
    mockRedis.exists.mockReset();
    mockRedis.expire.mockReset();
    mockRedis.ttl.mockReset();
    mockRedis.rpush.mockReset();
    mockRedis.lrange.mockReset();

    // Reset all methods of the mockPipeline instance
    mockPipeline.hmset.mockClear().mockReturnThis();
    mockPipeline.set.mockClear().mockReturnThis();
    mockPipeline.hset.mockClear().mockReturnThis(); // Ensure pipeline hset is reset
    mockPipeline.expire.mockClear().mockReturnThis();
    mockPipeline.exec.mockClear().mockResolvedValue([]);
    mockPipeline.rpush.mockClear().mockReturnThis();
    mockPipeline.lrange.mockClear().mockReturnThis();

    uuidv4.mockClear();
    sessionManager = new SessionManager(mockRedis);
  });

  describe('constructor', () => {
    it('should initialize correctly with a provided Redis client', () => {
      expect(sessionManager.redis).toBe(mockRedis);
    });

    it('should use the default imported client if no client is provided', () => {
      const smWithDefault = new SessionManager(); // No client passed
      const defaultRedisClientMock = require('../../src/utils/redis'); // Get the mock
      expect(smWithDefault.redis).toBe(defaultRedisClientMock);
      expect(typeof smWithDefault.redis.hmset).toBe('function'); // Verify it's the mock
    });

    it('should throw an error if the redis client is invalid (e.g., missing methods)', () => {
      const invalidClient = { on: jest.fn() }; // Missing most methods
      expect(() => new SessionManager(invalidClient)).toThrow('SessionManager requires a valid ioredis client instance.');
    });
  });

  describe('Key Generation (private methods)', () => {
    it('_getMetaKey should return correct format', () => {
      expect(sessionManager._getMetaKey('s123')).toBe('session:s123:meta');
    });
    it('_getAgentKey should return correct format', () => {
      expect(sessionManager._getAgentKey('s123')).toBe('session:s123:agent');
    });
    it('_getHistoryKey should return correct format', () => {
      expect(sessionManager._getHistoryKey('s123')).toBe('session:s123:history');
    });
  });

  describe('createSession', () => {
    const mockUserId = 'user123';
    const mockSessionId = 'mock-session-id';
    const mockDate = new Date(); // Consistent Date for tests
    let mockIsoDate;

    beforeEach(() => {
      // Ensure Date mock is fresh for each test if needed, or use a consistent mockDate
      mockIsoDate = mockDate.toISOString();
      uuidv4.mockReturnValue(mockSessionId);
      // Spy on global Date for consistent timestamps
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    });

    afterEach(() => {
      jest.restoreAllMocks(); // Restore Date mock
    });

    it('should create a session successfully', async () => {
      mockPipeline.exec.mockResolvedValue([ [null, 'OK'], [null, 'OK'], [null, 1], [null, 1], [null, 1] ]);

      const result = await sessionManager.createSession(mockUserId);

      expect(uuidv4).toHaveBeenCalledTimes(1);
      const expectedMeta = {
        userId: mockUserId,
        sessionId: mockSessionId,
        createdAt: mockIsoDate,
        lastActiveAt: mockIsoDate,
        currentAgent: 'ai',
      };
      const defaultTTL = 24 * 60 * 60;

      expect(mockPipeline.hmset).toHaveBeenCalledWith(`session:${mockSessionId}:meta`, expectedMeta);
      expect(mockPipeline.set).toHaveBeenCalledWith(`session:${mockSessionId}:agent`, 'ai');
      expect(mockPipeline.expire).toHaveBeenCalledWith(`session:${mockSessionId}:meta`, defaultTTL);
      expect(mockPipeline.expire).toHaveBeenCalledWith(`session:${mockSessionId}:agent`, defaultTTL);
      expect(mockPipeline.expire).toHaveBeenCalledWith(`session:${mockSessionId}:history`, defaultTTL);
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ sessionId: mockSessionId, ...expectedMeta });
    });

    it('should throw an error if userId is missing', async () => {
      await expect(sessionManager.createSession(null)).rejects.toThrow('userId is required to create a session.');
    });

    it('should handle Redis pipeline execution failure', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis pipeline failed'));
      await expect(sessionManager.createSession(mockUserId)).rejects.toThrow('Failed to create session: Redis pipeline failed');
    });

    it('should handle individual command failure within pipeline (simulated by exec throwing)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockPipeline.exec.mockImplementation(async () => {
         throw new Error('Simulated pipeline command failure (e.g. HMSET failed)');
      });
      await expect(sessionManager.createSession(mockUserId)).rejects.toThrow('Failed to create session: Simulated pipeline command failure (e.g. HMSET failed)');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getSessionAgent', () => {
    it('should return the agent string if found', async () => {
      mockRedis.get.mockResolvedValue('ai');
      const agent = await sessionManager.getSessionAgent('s123');
      expect(agent).toBe('ai');
      expect(mockRedis.get).toHaveBeenCalledWith('session:s123:agent');
    });

    it('should return null if agent is not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      const agent = await sessionManager.getSessionAgent('s123');
      expect(agent).toBeNull();
    });

    it('should throw an error if sessionId is missing', async () => {
      await expect(sessionManager.getSessionAgent(null)).rejects.toThrow('sessionId is required.');
    });

    it('should handle Redis GET failure', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis GET failed'));
      await expect(sessionManager.getSessionAgent('s123')).rejects.toThrow('Failed to get session agent: Redis GET failed');
    });
  });

  describe('switchAgent', () => {
    const mockSessionId = 's123';
    const newAgent = 'human';
    const mockDate = new Date();
    let mockIsoDate;


    beforeEach(() => {
      mockIsoDate = mockDate.toISOString();
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      mockPipeline.exec.mockResolvedValue([ [null, 'OK'], [null, 1], [null, 1] , [null, 1]]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should switch agent successfully', async () => {
      const result = await sessionManager.switchAgent(mockSessionId, newAgent);
      expect(mockPipeline.set).toHaveBeenCalledWith(`session:${mockSessionId}:agent`, newAgent);
      expect(mockPipeline.hset).toHaveBeenCalledWith(`session:${mockSessionId}:meta`, 'currentAgent', newAgent);
      expect(mockPipeline.hset).toHaveBeenCalledWith(`session:${mockSessionId}:meta`, 'agentSwitchedAt', mockIsoDate);
      expect(mockPipeline.hset).toHaveBeenCalledWith(`session:${mockSessionId}:meta`, 'lastActiveAt', mockIsoDate);
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, newAgent });
    });

    it('should throw if sessionId or newAgent is missing', async () => {
      await expect(sessionManager.switchAgent(null, newAgent)).rejects.toThrow('sessionId and newAgent are required.');
      await expect(sessionManager.switchAgent(mockSessionId, null)).rejects.toThrow('sessionId and newAgent are required.');
    });

    it('should handle Redis pipeline failure', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis pipeline failed'));
      await expect(sessionManager.switchAgent(mockSessionId, newAgent)).rejects.toThrow('Failed to switch agent: Redis pipeline failed');
    });
  });

  describe('getSession', () => {
    it('should return session metadata if found', async () => {
      const mockMeta = { userId: 'u1', currentAgent: 'ai' };
      mockRedis.hgetall.mockResolvedValue(mockMeta);
      const session = await sessionManager.getSession('s123');
      expect(session).toEqual(mockMeta);
      expect(mockRedis.hgetall).toHaveBeenCalledWith('session:s123:meta');
    });

    it('should return null if session meta is not found or empty', async () => {
      mockRedis.hgetall.mockResolvedValue(null);
      expect(await sessionManager.getSession('s123')).toBeNull();
      mockRedis.hgetall.mockResolvedValue({});
      expect(await sessionManager.getSession('s123')).toBeNull();
    });

    it('should throw if sessionId is missing', async () => {
      await expect(sessionManager.getSession(null)).rejects.toThrow('sessionId is required.');
    });

    it('should handle Redis HGETALL failure', async () => {
      mockRedis.hgetall.mockRejectedValue(new Error('Redis HGETALL failed'));
      await expect(sessionManager.getSession('s123')).rejects.toThrow('Failed to get session: Redis HGETALL failed');
    });
  });

  describe('isSessionActive', () => {
    it('should return true if session meta key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);
      expect(await sessionManager.isSessionActive('s123')).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('session:s123:meta');
    });

    it('should return false if session meta key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);
      expect(await sessionManager.isSessionActive('s123')).toBe(false);
    });

    it('should throw if sessionId is missing', async () => {
      await expect(sessionManager.isSessionActive(null)).rejects.toThrow('sessionId is required.');
    });

    it('should handle Redis EXISTS failure', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis EXISTS failed'));
      await expect(sessionManager.isSessionActive('s123')).rejects.toThrow('Failed to check session activity: Redis EXISTS failed');
    });
  });

  describe('extendSession', () => {
    const mockSessionId = 's123';
    const mockDate = new Date();
    let mockIsoDate;

    beforeEach(() => {
      mockIsoDate = mockDate.toISOString();
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      // Ensure hset is a Jest mock function for this describe block
      mockRedis.hset = jest.fn().mockResolvedValue(0);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should update lastActiveAt successfully', async () => {
      const result = await sessionManager.extendSession(mockSessionId);
      expect(mockRedis.hset).toHaveBeenCalledWith(`session:${mockSessionId}:meta`, 'lastActiveAt', mockIsoDate);
      expect(result).toEqual({ success: true });
    });

    it('should throw if sessionId is missing', async () => {
      await expect(sessionManager.extendSession(null)).rejects.toThrow('sessionId is required.');
    });

    it('should handle Redis HSET failure', async () => {
      mockRedis.hset.mockRejectedValue(new Error('Redis HSET failed'));
      await expect(sessionManager.extendSession(mockSessionId)).rejects.toThrow('Failed to extend session: Redis HSET failed');
    });
  });

  describe('addMessage', () => {
    const mockSessionId = 's123';
    const mockDate = new Date();
    const mockMessageId = 'msg-uuid-add';
    let mockIsoDate;
    let validMessage;


    beforeEach(() => {
      mockIsoDate = mockDate.toISOString();
      validMessage = {
        id: mockMessageId,
        from: 'user',
        text: 'Hello',
        timestamp: mockIsoDate,
        type: 'text'
      };
      // uuidv4.mockReturnValue(mockMessageId); // Not needed if ID is passed in message
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      jest.spyOn(sessionManager, 'isSessionActive').mockResolvedValue(true);
      jest.spyOn(sessionManager, 'extendSession').mockResolvedValue({ success: true });
      mockRedis.rpush.mockResolvedValue(1);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should add a message successfully', async () => {
      const result = await sessionManager.addMessage(mockSessionId, validMessage);
      expect(sessionManager.isSessionActive).toHaveBeenCalledWith(mockSessionId);
      expect(mockRedis.rpush).toHaveBeenCalledWith(`session:${mockSessionId}:history`, JSON.stringify(validMessage));
      expect(sessionManager.extendSession).toHaveBeenCalledWith(mockSessionId);
      expect(result).toEqual({ success: true, messageId: validMessage.id, message: validMessage });
    });

    it('should throw an error if sessionId is missing', async () => {
      await expect(sessionManager.addMessage(null, validMessage)).rejects.toThrow('sessionId is required to add a message.');
    });

    it('should throw an error for invalid message structure', async () => {
      const invalidMsg = { from: 'user', text: 'Hi' };
      await expect(sessionManager.addMessage(mockSessionId, invalidMsg)).rejects.toThrow('Invalid message object structure. Required fields: id, from, text, timestamp.');
    });

    it('should throw an error if session is not active', async () => {
      sessionManager.isSessionActive.mockResolvedValue(false);
      await expect(sessionManager.addMessage(mockSessionId, validMessage)).rejects.toThrow(`Session ${mockSessionId} does not exist or has expired.`);
    });

    it('should handle Redis RPUSH failure', async () => {
      mockRedis.rpush.mockRejectedValue(new Error('Redis RPUSH failed'));
      await expect(sessionManager.addMessage(mockSessionId, validMessage)).rejects.toThrow('Failed to add message: Redis RPUSH failed');
    });

    it('should handle extendSession failure', async () => {
      sessionManager.extendSession.mockRejectedValue(new Error('Extend session failed'));
      await expect(sessionManager.addMessage(mockSessionId, validMessage)).rejects.toThrow('Failed to add message: Extend session failed');
    });
  });

  describe('getHistory', () => {
    const mockSessionId = 's123';
    const msg1 = { id: 'm1', from: 'user', text: 'Hi', timestamp: new Date().toISOString() };
    const msg2 = { id: 'm2', from: 'ai', text: 'Hello', timestamp: new Date().toISOString() };

    it('should return parsed messages from history', async () => {
      const messageStrings = [JSON.stringify(msg1), JSON.stringify(msg2)];
      mockRedis.lrange.mockResolvedValue(messageStrings);
      const history = await sessionManager.getHistory(mockSessionId, 5);
      expect(mockRedis.lrange).toHaveBeenCalledWith(`session:${mockSessionId}:history`, -5, -1);
      expect(history).toEqual([msg1, msg2]);
    });

    it('should return empty array for empty history or if limit is non-positive', async () => {
      mockRedis.lrange.mockResolvedValue([]);
      expect(await sessionManager.getHistory(mockSessionId)).toEqual([]);

      mockRedis.lrange.mockClear(); // Clear previous calls
      expect(await sessionManager.getHistory(mockSessionId, 0)).toEqual([]);
      expect(mockRedis.lrange).not.toHaveBeenCalled();
      expect(await sessionManager.getHistory(mockSessionId, -5)).toEqual([]);
      expect(mockRedis.lrange).not.toHaveBeenCalled();
    });

    it('should handle unparseable JSON gracefully', async () => {
      const messageStrings = [JSON.stringify(msg1), "invalid-json", JSON.stringify(msg2)];
      mockRedis.lrange.mockResolvedValue(messageStrings);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const history = await sessionManager.getHistory(mockSessionId, 5);
      expect(history).toEqual([ msg1, { error: 'Failed to parse message data', raw: "invalid-json" }, msg2 ]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should throw if sessionId is missing', async () => {
      await expect(sessionManager.getHistory(null)).rejects.toThrow('sessionId is required to get history.');
    });

    it('should handle Redis LRANGE failure', async () => {
      mockRedis.lrange.mockRejectedValue(new Error('Redis LRANGE failed'));
      await expect(sessionManager.getHistory(mockSessionId)).rejects.toThrow('Failed to get history: Redis LRANGE failed');
    });
  });

  describe('setSessionTTL', () => {
    const mockSessionId = 's123';
    const ttl = 3600;

    beforeEach(() => {
      // Pipeline mock is already available as mockPipeline from the main beforeEach
      mockPipeline.exec.mockResolvedValue([ [null, 1], [null, 1], [null, 1] ]);
      jest.spyOn(sessionManager, 'isSessionActive').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should set TTL for all session keys successfully', async () => {
      const result = await sessionManager.setSessionTTL(mockSessionId, ttl);
      expect(sessionManager.isSessionActive).toHaveBeenCalledWith(mockSessionId);
      expect(mockPipeline.expire).toHaveBeenCalledWith(`session:${mockSessionId}:meta`, ttl);
      expect(mockPipeline.expire).toHaveBeenCalledWith(`session:${mockSessionId}:agent`, ttl);
      expect(mockPipeline.expire).toHaveBeenCalledWith(`session:${mockSessionId}:history`, ttl);
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it('should throw if sessionId is missing', async () => {
      await expect(sessionManager.setSessionTTL(null, ttl)).rejects.toThrow('sessionId is required.');
    });

    it('should throw if ttlInSeconds is invalid', async () => {
      await expect(sessionManager.setSessionTTL(mockSessionId, 0)).rejects.toThrow('ttlInSeconds must be a positive number.');
      await expect(sessionManager.setSessionTTL(mockSessionId, -100)).rejects.toThrow('ttlInSeconds must be a positive number.');
      await expect(sessionManager.setSessionTTL(mockSessionId, 'abc')).rejects.toThrow('ttlInSeconds must be a positive number.');
    });

    it('should throw if session is not active', async () => {
      sessionManager.isSessionActive.mockResolvedValue(false);
      await expect(sessionManager.setSessionTTL(mockSessionId, ttl)).rejects.toThrow(`Session ${mockSessionId} not found or has already expired.`);
    });

    it('should handle Redis pipeline failure', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis pipeline failed'));
      await expect(sessionManager.setSessionTTL(mockSessionId, ttl)).rejects.toThrow('Failed to set session TTL: Redis pipeline failed');
    });
  });

  describe('getSessionTTL', () => {
    const mockSessionId = 's123';

    it('should return TTL successfully', async () => {
      mockRedis.ttl.mockResolvedValue(1800);
      const ttlVal = await sessionManager.getSessionTTL(mockSessionId); // Renamed variable to avoid conflict
      expect(ttlVal).toBe(1800);
      expect(mockRedis.ttl).toHaveBeenCalledWith(`session:${mockSessionId}:meta`);
    });

    it('should return -1 if key exists but has no expiry', async () => {
      mockRedis.ttl.mockResolvedValue(-1);
      expect(await sessionManager.getSessionTTL(mockSessionId)).toBe(-1);
    });

    it('should return -2 if key does not exist', async () => {
      mockRedis.ttl.mockResolvedValue(-2);
      expect(await sessionManager.getSessionTTL(mockSessionId)).toBe(-2);
    });

    it('should throw if sessionId is missing', async () => {
      await expect(sessionManager.getSessionTTL(null)).rejects.toThrow('sessionId is required.');
    });

    it('should handle Redis TTL failure', async () => {
      mockRedis.ttl.mockRejectedValue(new Error('Redis TTL failed'));
      await expect(sessionManager.getSessionTTL(mockSessionId)).rejects.toThrow('Failed to get session TTL: Redis TTL failed');
    });
  });
});
