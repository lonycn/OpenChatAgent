const express = require('express');
const router = express.Router();

// POST /api/feedback (Submit Feedback)
router.post('/', (req, res) => {
  const { sessionId, rating, comments } = req.body;

  if (sessionId === undefined || rating === undefined) {
    return res.status(400).json({ error: 'Missing required fields: sessionId, rating.' });
  }

  // Basic validation for rating (example: 1-5 integer, or true/false boolean)
  // This depends on the desired rating system. For now, we'll be flexible.
  if (typeof rating !== 'number' && typeof rating !== 'boolean') {
      console.warn('Feedback API: Received rating of invalid type:', rating);
      // Allow it for now, but in a real app, you'd enforce type.
  }
  if (typeof rating === 'number' && (rating < 1 || rating > 5) && Number.isInteger(rating)) {
      // Only if it's an integer and outside 1-5. Floats or other numbers might be valid in some systems.
      // console.warn('Feedback API: Received out-of-range integer rating:', rating);
  }


  // Log the feedback (actual storage would be a future enhancement)
  console.log('Feedback received:', {
    sessionId,
    rating,
    comments: comments || null, // Ensure comments is not undefined if missing
    receivedAt: new Date().toISOString()
  });

  res.status(200).json({ success: true, message: 'Feedback received. Thank you!' });
});

module.exports = router;
