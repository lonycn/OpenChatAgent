const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Chat-core is running',
  });
});

// Import and use session routes
const sessionsRouter = require('../routes/sessions');
app.use('/api/sessions', sessionsRouter);

// Import and use messages routes
const messagesRouter = require('../routes/messages');
app.use('/api/messages', messagesRouter);

// Import and use feedback routes
const feedbackRouter = require('../routes/feedback');
app.use('/api/feedback', feedbackRouter);

// TODO: Add other routes (e.g., /chat, /webhook)

module.exports = app;
