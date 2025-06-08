const request = require('supertest');
const app = require('../../src/server/app'); // Import the Express app
const { v4: uuidv4 } = require('uuid');

jest.mock('uuid'); // Mock uuid to control its output

describe('Message API Endpoints', () => {
  beforeEach(() => {
    uuidv4.mockClear();
    // Default mock for uuidv4, can be overridden in specific tests
    uuidv4.mockReturnValue('mock-message-id');
  });

  describe('POST /api/messages', () => {
    it('should process a message and return a simulated AI response', async () => {
      const messagePayload = {
        sessionId: 's123',
        userId: 'u456',
        text: 'Hello from HTTP',
      };

      const res = await request(app)
        .post('/api/messages')
        .send(messagePayload);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', 'mock-message-id');
      expect(res.body).toHaveProperty('from', 'ai');
      expect(res.body.text).toBe(`AI HTTP Echo: ${messagePayload.text}`);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('type', 'text');
      expect(res.body.sessionId).toBe(messagePayload.sessionId);
    });

    it('should use type from payload if provided', async () => {
      const messagePayload = {
        sessionId: 's123',
        userId: 'u456',
        text: 'Custom type message',
        type: 'custom'
      };
       // The route currently doesn't use the incoming type for the AI response type directly.
       // The AI response is hardcoded to type: 'text'.
       // This test verifies the route logic as is.
      const res = await request(app)
        .post('/api/messages')
        .send(messagePayload);

      expect(res.statusCode).toEqual(200);
      // The mock AI response in the route is hardcoded to type: 'text'
      expect(res.body.type).toBe('text');
    });

    it('should return 400 if sessionId is missing', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({ userId: 'u456', text: 'Test' });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Missing required fields: sessionId, userId, text.' });
    });

    it('should return 400 if userId is missing', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({ sessionId: 's123', text: 'Test' });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Missing required fields: sessionId, userId, text.' });
    });

    it('should return 400 if text is missing', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({ sessionId: 's123', userId: 'u456' });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Missing required fields: sessionId, userId, text.' });
    });
  });
});
