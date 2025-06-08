const redisClient = require('../utils/redis'); // Assuming redis.js exports the initialized client
const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor(client) {
    if (!client) {
      // Fallback to the shared client if one isn't provided (e.g. for direct instantiation without DI)
      this.redis = redisClient;
    } else {
      this.redis = client;
    }

    if (!this.redis || typeof this.redis.hmset !== 'function') {
      // Basic check to ensure a valid Redis client is available
      console.error('SessionManager: Invalid or missing Redis client.');
      throw new Error('SessionManager requires a valid ioredis client instance.');
    }
  }

  _getMetaKey(sessionId) {
    return `session:${sessionId}:meta`;
  }

  _getAgentKey(sessionId) {
    return `session:${sessionId}:agent`;
  }

  _getHistoryKey(sessionId) {
    return `session:${sessionId}:history`;
  }

  async createSession(userId) {
    if (!userId) {
      throw new Error('userId is required to create a session.');
    }

    const sessionId = uuidv4();
    const now = new Date().toISOString();

    const sessionMeta = {
      userId: userId,
      sessionId: sessionId, // Storing sessionId in meta for completeness, though key also has it
      createdAt: now,
      lastActiveAt: now,
      currentAgent: 'ai', // Default agent
      // languageCode: 'zh_CN', // Example of other potential fields from design
      // platform: 'web',      // Example
    };

    const metaKey = this._getMetaKey(sessionId);
    const agentKey = this._getAgentKey(sessionId);

    try {
      // Using a pipeline for atomicity of these two operations if possible, or multi if not critical path
      const pipeline = this.redis.pipeline();
      const defaultTTL = 24 * 60 * 60; // 24 hours in seconds

      pipeline.hmset(metaKey, sessionMeta);
      pipeline.set(agentKey, sessionMeta.currentAgent);
      // History key is not explicitly created with a value here,
      // but EXPIRE will still work on a non-existent key (it will do nothing).
      // Alternatively, we could RPUSH an initial placeholder if desired, but not strictly necessary for EXPIRE.
      pipeline.expire(metaKey, defaultTTL);
      pipeline.expire(agentKey, defaultTTL);
      pipeline.expire(this._getHistoryKey(sessionId), defaultTTL);

      const results = await pipeline.exec();

      // Check pipeline results for errors
      results.forEach(([err, result]) => {
        if (err) {
          // Log individual command error, though overall error will be caught below
          console.error(`SessionManager: Redis command error in pipeline: ${err.message}`);
          // The pipeline itself will throw an error if any command fails, which is caught by the outer try/catch
        }
      });

      console.log(`Session created: ${sessionId} for user ${userId}`);
      return { sessionId, ...sessionMeta }; // Return the full session meta including the generated sessionId

    } catch (error) {
      console.error(`SessionManager: Error creating session for userId ${userId} - ${error.message}`, error);
      // Rethrow or return a more specific error object
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async getSessionAgent(sessionId) {
    if (!sessionId) {
      throw new Error('sessionId is required.');
    }
    const agentKey = this._getAgentKey(sessionId);
    try {
      const agent = await this.redis.get(agentKey);
      return agent; // Returns string or null if key doesn't exist
    } catch (error) {
      console.error(`SessionManager: Error getting agent for session ${sessionId} - ${error.message}`, error);
      throw new Error(`Failed to get session agent: ${error.message}`);
    }
  }

  async switchAgent(sessionId, newAgent) {
    if (!sessionId || !newAgent) {
      throw new Error('sessionId and newAgent are required.');
    }
    const agentKey = this._getAgentKey(sessionId);
    const metaKey = this._getMetaKey(sessionId);
    const now = new Date().toISOString();

    try {
      const pipeline = this.redis.pipeline();
      pipeline.set(agentKey, newAgent);
      pipeline.hset(metaKey, 'currentAgent', newAgent);
      pipeline.hset(metaKey, 'agentSwitchedAt', now); // Add agentSwitchedAt timestamp
      pipeline.hset(metaKey, 'lastActiveAt', now); // Also update lastActiveAt

      await pipeline.exec();
      console.log(`Agent switched to ${newAgent} for session ${sessionId}`);
      return { success: true, newAgent };
    } catch (error) {
      console.error(`SessionManager: Error switching agent for session ${sessionId} to ${newAgent} - ${error.message}`, error);
      throw new Error(`Failed to switch agent: ${error.message}`);
    }
  }

  async getSession(sessionId) {
    if (!sessionId) {
      throw new Error('sessionId is required.');
    }
    const metaKey = this._getMetaKey(sessionId);
    try {
      const sessionMeta = await this.redis.hgetall(metaKey);
      if (!sessionMeta || Object.keys(sessionMeta).length === 0) {
        return null; // Session meta not found or empty
      }
      // Optionally, retrieve from agentKey as well if strict separation is maintained
      // const agent = await this.getSessionAgent(sessionId);
      // sessionMeta.currentAgent = agent || sessionMeta.currentAgent; // Prefer live agent key if used
      return sessionMeta;
    } catch (error) {
      console.error(`SessionManager: Error getting session ${sessionId} - ${error.message}`, error);
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  async isSessionActive(sessionId) {
    if (!sessionId) {
      throw new Error('sessionId is required.');
    }
    const metaKey = this._getMetaKey(sessionId);
    try {
      const exists = await this.redis.exists(metaKey);
      return exists === 1;
    } catch (error) {
      console.error(`SessionManager: Error checking if session ${sessionId} is active - ${error.message}`, error);
      throw new Error(`Failed to check session activity: ${error.message}`);
    }
  }

  async extendSession(sessionId) {
    if (!sessionId) {
      throw new Error('sessionId is required.');
    }
    const metaKey = this._getMetaKey(sessionId);
    const now = new Date().toISOString();
    try {
      const result = await this.redis.hset(metaKey, 'lastActiveAt', now);
      // hset returns 1 if field is new, 0 if field was updated. Or error.
      // For extendSession, we just care if it errored or not.
      // We could check if the key exists first if we want to be stricter.
      if (result === undefined || result === null) {
        // This condition might vary based on ioredis version or if key doesn't exist.
        // A more robust check might be to see if the session exists first.
        // However, hset on a non-existent key creates it, then sets the field.
        // If the key does not exist, hset will create it and set lastActiveAt.
        // This might be acceptable, or we might want to ensure session exists first.
        // For now, we assume hset is okay. If it didn't error, it's a success.
      }
      console.log(`Session extended: ${sessionId}, lastActiveAt updated to ${now}`);
      return { success: true };
    } catch (error) {
      console.error(`SessionManager: Error extending session ${sessionId} - ${error.message}`, error);
      throw new Error(`Failed to extend session: ${error.message}`);
    }
  }

  async addMessage(sessionId, message) {
    if (!sessionId) {
      throw new Error('sessionId is required to add a message.');
    }
    if (!message || typeof message !== 'object' ||
        !message.from || !message.text || !message.timestamp || !message.id) {
      throw new Error('Invalid message object structure. Required fields: id, from, text, timestamp.');
    }

    const historyKey = this._getHistoryKey(sessionId);
    const messageJson = JSON.stringify(message);

    try {
      // Check if session exists before adding message - could be part of extendSession or done here
      if (!(await this.isSessionActive(sessionId))) {
        throw new Error(`Session ${sessionId} does not exist or has expired.`);
      }

      await this.redis.rpush(historyKey, messageJson);
      await this.extendSession(sessionId); // Update lastActiveAt

      console.log(`Message added to session ${sessionId}: ${message.id}`);
      return { success: true, messageId: message.id, message }; // Return full message as well
    } catch (error) {
      console.error(`SessionManager: Error adding message to session ${sessionId} - ${error.message}`, error);
      throw new Error(`Failed to add message: ${error.message}`);
    }
  }

  async getHistory(sessionId, limit = 20) {
    if (!sessionId) {
      throw new Error('sessionId is required to get history.');
    }
    if (limit <= 0) {
      return []; // Or throw error for invalid limit
    }

    const historyKey = this._getHistoryKey(sessionId);
    // LRANGE key start stop. To get last 'limit' items, use -limit to -1.
    // Example: LRANGE mylist -2 -1 will return the last two elements.
    const start = -limit;
    const stop = -1;

    try {
      const messageStrings = await this.redis.lrange(historyKey, start, stop);
      if (!messageStrings || messageStrings.length === 0) {
        return [];
      }

      const messages = messageStrings.map(msgJson => {
        try {
          return JSON.parse(msgJson);
        } catch (parseError) {
          console.error(`SessionManager: Error parsing message JSON from session ${sessionId} history - ${parseError.message}`, msgJson);
          return { error: 'Failed to parse message data', raw: msgJson }; // Return error object for unparseable message
        }
      });
      return messages;
    } catch (error) {
      console.error(`SessionManager: Error getting history for session ${sessionId} - ${error.message}`, error);
      throw new Error(`Failed to get history: ${error.message}`);
    }
  }

  async setSessionTTL(sessionId, ttlInSeconds) {
    if (!sessionId) {
      throw new Error('sessionId is required.');
    }
    if (typeof ttlInSeconds !== 'number' || ttlInSeconds <= 0) {
      throw new Error('ttlInSeconds must be a positive number.');
    }

    const metaKey = this._getMetaKey(sessionId);
    const agentKey = this._getAgentKey(sessionId);
    const historyKey = this._getHistoryKey(sessionId);

    try {
      // First check if the session exists, as EXPIRE on non-existent keys has no effect
      // and we might want to signal this as an issue or a "no-op".
      if (!(await this.isSessionActive(sessionId))) {
        // Or return a specific status like { success: false, error: 'Session not found' }
        throw new Error(`Session ${sessionId} not found or has already expired.`);
      }

      const pipeline = this.redis.pipeline();
      pipeline.expire(metaKey, ttlInSeconds);
      pipeline.expire(agentKey, ttlInSeconds);
      pipeline.expire(historyKey, ttlInSeconds);

      await pipeline.exec();
      console.log(`TTL updated for session ${sessionId} to ${ttlInSeconds} seconds.`);
      return { success: true };
    } catch (error) {
      console.error(`SessionManager: Error setting TTL for session ${sessionId} - ${error.message}`, error);
      throw new Error(`Failed to set session TTL: ${error.message}`);
    }
  }

  async getSessionTTL(sessionId) {
    if (!sessionId) {
      throw new Error('sessionId is required.');
    }
    const metaKey = this._getMetaKey(sessionId);
    try {
      const ttl = await this.redis.ttl(metaKey);
      // ttl returns:
      // - The remaining time to live in seconds.
      // - -1 if the key exists but has no associated expire.
      // - -2 if the key does not exist.
      return ttl;
    } catch (error) {
      console.error(`SessionManager: Error getting TTL for session ${sessionId} - ${error.message}`, error);
      throw new Error(`Failed to get session TTL: ${error.message}`);
    }
  }
}

module.exports = SessionManager;
