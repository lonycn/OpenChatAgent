const express = require('express');
const { v4: uuidv4 } = require('uuid');
// const messageRouter = require('../services/MessageRouter'); // Placeholder

const router = express.Router();

// Mock MessageRouter for now
const mockMessageRouter = {
  handleIncomingMessage: async (connectionId, userId, incomingMessage, source) => {
    console.log(`MockMessageRouter: handleIncomingMessage called via ${source || 'websocket'} for userId: ${userId}`, incomingMessage);
    // This mock simulates that handleIncomingMessage would eventually lead to an AI response.
    // For an HTTP request, the response is sent back via HTTP, not WebSocket.
    // So, this HTTP endpoint will directly craft the AI response.
    return {
      id: uuidv4(),
      from: 'ai',
      text: `AI HTTP Echo: ${incomingMessage.text}`,
      timestamp: new Date().toISOString(),
      type: 'text',
      sessionId: incomingMessage.sessionId // Assuming sessionId is passed in incomingMessage for HTTP
    };
  }
};

// POST /api/messages (Send Message via HTTP)
router.post('/', async (req, res) => {
  const { sessionId, userId, text, type = 'text' } = req.body;

  if (!sessionId || !userId || !text) {
    return res.status(400).json({ error: 'Missing required fields: sessionId, userId, text.' });
  }

  try {
    // In a real scenario, messageRouter.handleIncomingMessage might not directly return the AI response
    // for an HTTP request. It might internally use connectionManager.sendMessageToConnection for WebSocket clients.
    // For an HTTP source, it might just process and store messages, and this endpoint would then
    // separately call an AI service or construct a response.
    // For this simulation, we'll adapt:

    console.log(`API POST /api/messages: Received HTTP message from userId: ${userId} for session: ${sessionId}`);

    // Simulate the part of MessageRouter that would get an AI response.
    // The actual messageRouter.handleIncomingMessage is designed for WebSocket flow where it sends back via ConnectionManager.
    // So, we directly simulate the AI response generation here.
    const aiResponse = {
      id: uuidv4(),
      from: 'ai',
      text: `AI HTTP Echo: ${text}`, // Simplified echo for HTTP
      timestamp: new Date().toISOString(),
      type: 'text',
      sessionId: sessionId,
      userId: userId, // For context, though AI message might not always have userId directly
    };

    // Simulate adding user message and AI message to history (logging only for now)
    console.log(`API POST /api/messages: (Simulated) Adding user message for session ${sessionId}: { text: "${text}" }`);
    console.log(`API POST /api/messages: (Simulated) Adding AI response for session ${sessionId}: { text: "${aiResponse.text}" }`);

    res.status(200).json(aiResponse);

  } catch (error) {
    console.error('API Error: /messages (POST) -', error.message);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

module.exports = router;
