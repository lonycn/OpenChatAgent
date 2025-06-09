const request = require('supertest');
const app = require('../../src/server/app'); // Import the Express app
const { v4: uuidv4 } = require('uuid');

// The routes themselves use a mockSessionManager internally.
// So, these tests are for the routing layer and its immediate response handling.

jest.mock('uuid'); // Mock uuid to control its output if needed by routes directly (not just mockSessionManager)

describe('Session API Endpoints', () => {
  beforeEach(() => {
    uuidv4.mockClear();
  });

  describe('POST /api/sessions', () => {
    it('should create a new session and return it', async () => {
      const mockGeneratedUserId = 'user_generated_id';
      const mockSessionIdPart = 'session_part';
      // Mock uuidv4 if the route directly uses it for default userId
      uuidv4.mockReturnValueOnce(mockGeneratedUserId.split('_')[1]) // for userId generation
            .mockReturnValueOnce(mockSessionIdPart); // for mockSessionManager's sessionId

      const res = await request(app)
        .post('/api/sessions')
        .send({ userId: 'testUser1' });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body.userId).toBe('testUser1');
      expect(res.body.currentAgent).toBe('ai');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('lastActiveAt');
    });

    it('should create a session with a generated userId if none provided', async () => {
        const mockGeneratedUserIdPart = 'generated_user_part';
        const mockSessionIdPart = 'session_part_2';
        uuidv4.mockReturnValueOnce(mockGeneratedUserIdPart)
              .mockReturnValueOnce(mockSessionIdPart);

        const res = await request(app).post('/api/sessions').send({});
        expect(res.statusCode).toEqual(201);
        expect(res.body.userId).toBe(`user_${mockGeneratedUserIdPart}`);
        expect(res.body.sessionId).toContain(`mockSessionId_${mockSessionIdPart}`);
    });
  });

  describe('GET /api/sessions/:sessionId', () => {
    it('should return session details for an existing session', async () => {
      const sessionId = 'valid_session_123';
      // The mockSessionManager in routes/sessions.js will return a mock session
      const res = await request(app).get(`/api/sessions/${sessionId}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.sessionId).toBe(sessionId);
      expect(res.body.userId).toBe(`mockUser_${sessionId.substring(0,4)}`);
      expect(res.body.currentAgent).toBe('ai');
    });

    it('should return 404 for a non-existent session', async () => {
      const res = await request(app).get('/api/sessions/nonexistent_session_id');
      expect(res.statusCode).toEqual(404);
      expect(res.body).toEqual({ error: 'Session not found' });
    });
  });

  describe('POST /api/sessions/:sessionId/switch-agent', () => {
    const sessionId = 'session_for_switch';

    it('should successfully switch agent to human', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/switch-agent`)
        .send({ agent: 'human' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ success: true, sessionId, newAgent: 'human' });
    });

    it('should successfully switch agent to ai', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/switch-agent`)
        .send({ agent: 'ai' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ success: true, sessionId, newAgent: 'ai' });
    });

    it('should return 400 for invalid agent type', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/switch-agent`)
        .send({ agent: 'robot' }); // Invalid agent

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Invalid agent specified. Must be "ai" or "human".' });
    });

    it('should return 400 if agent is not provided', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/switch-agent`)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Invalid agent specified. Must be "ai" or "human".' });
    });

    // This test depends on how the mockSessionManager.switchAgent (or real one) handles errors
    // The route has a catch-all 500, but also a specific check for "not found" in error message.
    // The mockSessionManager.switchAgent currently always returns success.
    // To test 404 for session not found, the mock would need to throw an error containing "not found".
    // For now, we assume session exists for successful switches.
  });

  describe('GET /api/sessions/:sessionId/history', () => {
    const sessionId = 'session_for_history';

    it('should return mock message history for a session', async () => {
      const res = await request(app).get(`/api/sessions/${sessionId}/history?limit=5`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2); // Mock returns 2 messages
      expect(res.body[0]).toHaveProperty('from', 'user');
      expect(res.body[1]).toHaveProperty('from', 'ai');
    });

    it('should default limit to 20 if not specified (mock implies this)', async () => {
      // The mock getHistory in sessions.js doesn't strictly use the limit for # of items returned,
      // but it logs it. This test primarily checks the route passes it.
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(()=>{});
      await request(app).get(`/api/sessions/${sessionId}/history`);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`limit: 20`));
      consoleLogSpy.mockRestore();
    });

    it('should return 400 if limit is not a positive integer', async () => {
      const res = await request(app).get(`/api/sessions/${sessionId}/history?limit=0`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Limit must be a positive integer.' });

      const res2 = await request(app).get(`/api/sessions/${sessionId}/history?limit=-1`);
      expect(res2.statusCode).toEqual(400);
      expect(res2.body).toEqual({ error: 'Limit must be a positive integer.' });
    });
  });
});
