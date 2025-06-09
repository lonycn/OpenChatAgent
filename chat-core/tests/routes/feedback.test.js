const request = require('supertest');
const app = require('../../src/server/app'); // Import the Express app

describe('Feedback API Endpoints', () => {
  describe('POST /api/feedback', () => {
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should successfully submit feedback with all fields', async () => {
      const feedbackPayload = {
        sessionId: 's789',
        rating: 5,
        comments: 'Excellent service!',
      };

      const res = await request(app)
        .post('/api/feedback')
        .send(feedbackPayload);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ success: true, message: 'Feedback received. Thank you!' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Feedback received:', {
        sessionId: feedbackPayload.sessionId,
        rating: feedbackPayload.rating,
        comments: feedbackPayload.comments,
        receivedAt: expect.any(String), // Check that timestamp is logged
      });
    });

    it('should successfully submit feedback with required fields only (comments optional)', async () => {
      const feedbackPayload = {
        sessionId: 's012',
        rating: true, // Example of boolean rating
      };

      const res = await request(app)
        .post('/api/feedback')
        .send(feedbackPayload);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ success: true, message: 'Feedback received. Thank you!' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Feedback received:', {
        sessionId: feedbackPayload.sessionId,
        rating: feedbackPayload.rating,
        comments: null, // Defaulted to null if not provided
        receivedAt: expect.any(String),
      });
    });

    it('should return 400 if sessionId is missing', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ rating: 3 });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Missing required fields: sessionId, rating.' });
    });

    it('should return 400 if rating is missing', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ sessionId: 's345' });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Missing required fields: sessionId, rating.' });
    });

    // The route currently doesn't strictly validate rating type beyond existence.
    // If it did, more tests for invalid rating types would be added here.
    it('should accept various valid rating types (as per current loose validation)', async () => {
        const payloads = [
            { sessionId: 'sRate1', rating: 1 },
            { sessionId: 'sRate2', rating: false },
            { sessionId: 'sRate3', rating: "good" }, // String, currently accepted
        ];

        for (const payload of payloads) {
            const res = await request(app).post('/api/feedback').send(payload);
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        }
    });
  });
});
