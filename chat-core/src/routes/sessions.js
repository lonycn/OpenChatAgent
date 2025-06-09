const express = require('express');
const { v4: uuidv4 } = require('uuid');
// const sessionManager = require('chat-session').sessionManager; // Placeholder for actual SessionManager
// const connectionManager = require('../services/ConnectionManager'); // Placeholder for ConnectionManager

const router = express.Router();

// Mock SessionManager for now, as it's from another module and not yet integrated.
const mockSessionManager = {
  createSession: async (userId) => {
    console.log(`MockSessionManager: createSession called for userId: ${userId}`);
    return { sessionId: `mockSessionId_${uuidv4().substring(0,8)}`, userId, createdAt: new Date().toISOString(), currentAgent: 'ai', lastActiveAt: new Date().toISOString() };
  },
  getSession: async (sessionId) => {
    console.log(`MockSessionManager: getSession called for sessionId: ${sessionId}`);
    if (sessionId === "nonexistent_session_id") return null;
    return { sessionId, userId: `mockUser_${sessionId.substring(0,4)}`, createdAt: new Date().toISOString(), currentAgent: 'ai', lastActiveAt: new Date().toISOString() };
  },
  switchAgent: async (sessionId, newAgent) => {
    console.log(`MockSessionManager: switchAgent called for sessionId: ${sessionId}, newAgent: ${newAgent}`);
    return { success: true, newAgent };
  },
  getHistory: async (sessionId, limit) => {
    console.log(`MockSessionManager: getHistory called for sessionId: ${sessionId}, limit: ${limit}`);
    return [
      { id: uuidv4(), from: 'user', text: 'Hello (from mock history)', timestamp: new Date(Date.now() - 10000).toISOString(), type: 'text', sessionId },
      { id: uuidv4(), from: 'ai', text: 'AI: Hi there! (from mock history)', timestamp: new Date().toISOString(), type: 'text', sessionId }
    ];
  }
};


// POST /api/sessions (Create Session)
router.post('/', async (req, res) => {
  // In a real app, userId might come from auth middleware (e.g., req.user.id) or request body
  const userId = req.body.userId || `user_${uuidv4().substring(0,8)}`;
  try {
    // const session = await sessionManager.createSession(userId); // Real call
    const session = await mockSessionManager.createSession(userId); // Mock call
    res.status(201).json(session);
  } catch (error) {
    console.error('API Error: /sessions (POST) -', error.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions/:sessionId (Get Session Details)
router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    // const session = await sessionManager.getSession(sessionId); // Real call
    const session = await mockSessionManager.getSession(sessionId); // Mock call
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error(`API Error: /sessions/${sessionId} (GET) -`, error.message);
    res.status(500).json({ error: 'Failed to get session details' });
  }
});

// POST /api/sessions/:sessionId/switch-agent (Switch Agent)
router.post('/:sessionId/switch-agent', async (req, res) => {
  const { sessionId } = req.params;
  const { agent: newAgent } = req.body; // Expecting { "agent": "human" } or { "agent": "ai" }

  if (!newAgent || (newAgent !== 'ai' && newAgent !== 'human')) {
    return res.status(400).json({ error: 'Invalid agent specified. Must be "ai" or "human".' });
  }

  try {
    // const result = await sessionManager.switchAgent(sessionId, newAgent); // Real call
    const result = await mockSessionManager.switchAgent(sessionId, newAgent); // Mock call

    if (result.success) { // Assuming switchAgent indicates success
      console.log(`API: Agent switched to ${newAgent} for session ${sessionId}`);
      // (Future enhancement: Simulate notifying client via WebSocket using connectionManager)
      // const associatedConnectionId = findConnectionIdForSession(sessionId); // This mapping needs to be established
      // if (associatedConnectionId) {
      //   connectionManager.sendMessageToConnection(associatedConnectionId, { type: 'agent_switch', newAgent });
      // }
      res.json({ success: true, sessionId, newAgent });
    } else {
      // This path might not be reached if switchAgent throws on failure,
      // but included for robustness if it could return { success: false }
      res.status(400).json({ error: result.error || 'Failed to switch agent' });
    }
  } catch (error) {
    console.error(`API Error: /sessions/${sessionId}/switch-agent (POST) -`, error.message);
    // Check if error message indicates session not found, could return 404
    if (error.message && error.message.toLowerCase().includes('not found')) {
        return res.status(404).json({ error: 'Session not found, cannot switch agent.' });
    }
    res.status(500).json({ error: 'Failed to switch agent' });
  }
});

// GET /api/sessions/:sessionId/history (Get History)
router.get('/:sessionId/history', async (req, res) => {
  const { sessionId } = req.params;
  const limit = parseInt(req.query.limit, 10) || 20;

  if (limit <= 0) {
    return res.status(400).json({ error: 'Limit must be a positive integer.' });
  }

  try {
    // const history = await sessionManager.getHistory(sessionId, limit); // Real call
    const history = await mockSessionManager.getHistory(sessionId, limit); // Mock call
    res.json(history);
  } catch (error) {
    console.error(`API Error: /sessions/${sessionId}/history (GET) -`, error.message);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

module.exports = router;
