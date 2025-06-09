const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { SessionManager } = require('../../../chat-session/src');
const connectionManager = require('../../services/ConnectionManager'); // Import ConnectionManager

const router = express.Router();
const sessionManager = new SessionManager();

// POST /api/sessions (Create Session)
router.post('/', async (req, res) => {
  const userIdFromBody = req.body.userId;
  if (!userIdFromBody) {
    // While SessionManager might handle null userId, API should define its contract
    // For this iteration, let's make userId from body mandatory for this endpoint.
    // Or allow SessionManager to create one if that's the desired behavior.
    // The SessionManager throws if userId is missing, so this check is good.
    return res.status(400).json({ error: 'userId is required in the request body.' });
  }
  try {
    const session = await sessionManager.createSession(userIdFromBody);
    res.status(201).json(session);
  } catch (error) {
    console.error('API Error: /sessions (POST) -', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions/:sessionId (Get Session Details)
router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId URL parameter is required.' });
  }
  try {
    const session = await sessionManager.getSession(sessionId);
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error(`API Error: /sessions/${sessionId} (GET) -`, error.message, error.stack);
    res.status(500).json({ error: 'Failed to get session details' });
  }
});

// POST /api/sessions/:sessionId/switch-agent (Switch Agent)
router.post('/:sessionId/switch-agent', async (req, res) => {
  const { sessionId } = req.params;
  const { agent: newAgent } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId URL parameter is required.' });
  }
  if (!newAgent || (newAgent !== 'ai' && newAgent !== 'human')) {
    return res.status(400).json({ error: 'Invalid agent specified in body. Must be "ai" or "human".' });
  }

  try {
    // First, check if session exists to provide a more specific 404 if not.
    // SessionManager.switchAgent might also throw its own "not found" error if an HSET is on a non-existent key,
    // but ioredis hset on a non-existent key creates it.
    // So, an explicit check here is better.
    const sessionExists = await sessionManager.isSessionActive(sessionId);
    if (!sessionExists) {
      return res.status(404).json({ error: 'Session not found. Cannot switch agent.' });
    }

    const result = await sessionManager.switchAgent(sessionId, newAgent);

    // The result from SessionManager.switchAgent is { success: true, newAgent }
    console.log(`API: Agent switched to ${result.newAgent} for session ${sessionId}`);

    // Notify connected WebSocket clients for this session
    const allConnections = connectionManager.getAllConnections(); // Gets array of { ws, sessionId, userId }
    let notifiedClients = 0;
    for (const connDetails of allConnections) {
      if (connDetails.sessionId === sessionId) {
        const systemMessage = {
          id: uuidv4(),
          type: 'system',
          from: 'system',
          text: `Switched to ${result.newAgent} agent.`,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          newAgent: result.newAgent // Include new agent in the message
        };
        // connectionId is the key in ConnectionManager's map, which is ws.id
        // connDetails.ws.id is not stored directly in connDetails, but connDetails IS the value from the map
        // We need to iterate the map or have connectionId in connDetails to use sendMessageToConnection.
        // Let's assume ConnectionManager stores connectionId in its details object for easier lookup,
        // or we iterate differently.
        // For now, let's use the ws object directly IF ConnectionManager's methods allow it,
        // OR iterate keys if ConnectionManager stores by ws.id.
        // The current ConnectionManager stores by ws.id (connectionId).
        // getAllConnections() returns values: { ws, sessionId, userId }. We need the key.
        // A better way: iterate `connectionManager.connections.forEach((details, connId) => ...)`

        // Re-iterating to get connectionId (key of the map)
        let connectionIdForWs;
        for (const [id, details] of connectionManager.connections.entries()) {
            if (details.ws === connDetails.ws && details.sessionId === sessionId) {
                connectionIdForWs = id;
                break;
            }
        }

        if (connectionIdForWs) {
            const sent = connectionManager.sendMessageToConnection(connectionIdForWs, systemMessage);
            if (sent) {
                notifiedClients++;
                // Optionally, add this system message to history
                try {
                    await sessionManager.addMessage(sessionId, systemMessage);
                    console.log(`API: Agent switch system message for session ${sessionId} also added to history.`);
                } catch (historyError) {
                    console.error(`API: Error adding agent switch system message to history for session ${sessionId}:`, historyError);
                }
            }
        }
      }
    }
    if (notifiedClients > 0) {
        console.log(`API: Notified ${notifiedClients} WebSocket client(s) about agent switch for session ${sessionId}.`);
    }

    res.json(result);

  } catch (error) {
    console.error(`API Error: /sessions/${sessionId}/switch-agent (POST) -`, error.message, error.stack);
    res.status(500).json({ error: `Failed to switch agent: ${error.message}` });
  }
});

// GET /api/sessions/:sessionId/history (Get History)
router.get('/:sessionId/history', async (req, res) => {
  const { sessionId } = req.params;
  const limitInput = req.query.limit;
  const limit = limitInput ? parseInt(limitInput, 10) : 20;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId URL parameter is required.' });
  }
  if (isNaN(limit) || limit <= 0) { // Check if limit is NaN after parseInt or non-positive
    return res.status(400).json({ error: 'Limit must be a positive integer.' });
  }

  try {
    // Check if session exists before trying to get history
    const sessionExists = await sessionManager.isSessionActive(sessionId);
    if (!sessionExists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const history = await sessionManager.getHistory(sessionId, limit);
    res.json(history);
  } catch (error) {
    console.error(`API Error: /sessions/${sessionId}/history (GET) -`, error.message, error.stack);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

module.exports = router;
