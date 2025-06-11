const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const wsConfig = require('../config/websocket');

/**
 * 🔌 Enhanced WebSocket Connection Manager
 * 
 * Features:
 * - Connection health monitoring
 * - Automatic cleanup of dead connections
 * - Connection statistics and metrics
 * - Heartbeat tracking
 * - Memory-efficient connection storage
 */

class EnhancedConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // connectionId -> connection info
    this.userConnections = new Map(); // userId -> Set of connectionIds
    this.heartbeatInterval = wsConfig.heartbeat.interval;
    this.connectionTimeout = wsConfig.server.idleTimeout;
    this.heartbeatTimeout = wsConfig.heartbeat.timeout;
    this.maxMissedPings = wsConfig.heartbeat.maxMissed;
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
    
    console.log('✅ Enhanced Connection Manager initialized');
  }

  /**
   * Add a new WebSocket connection
   */
  addConnection(connectionId, ws, user = null) {
    const connectionInfo = {
      id: connectionId,
      ws: ws,
      user: user,
      connectedAt: new Date(),
      lastActivity: new Date(),
      lastPing: null,
      lastPong: null,
      messageCount: 0,
      isAlive: true,
      sessionId: null
    };

    this.connections.set(connectionId, connectionInfo);

    // Track user connections
    if (user && user.id) {
      if (!this.userConnections.has(user.id)) {
        this.userConnections.set(user.id, new Set());
      }
      this.userConnections.get(user.id).add(connectionId);
    }

    console.log(`📡 Connection added: ${connectionId} (User: ${user?.id || 'guest'})`);
    this.logConnectionStats();

    return connectionInfo;
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(connectionId) {
    const connectionInfo = this.connections.get(connectionId);
    
    if (connectionInfo) {
      // Remove from user connections
      if (connectionInfo.user && connectionInfo.user.id) {
        const userConnections = this.userConnections.get(connectionInfo.user.id);
        if (userConnections) {
          userConnections.delete(connectionId);
          if (userConnections.size === 0) {
            this.userConnections.delete(connectionInfo.user.id);
          }
        }
      }

      this.connections.delete(connectionId);
      console.log(`📡 Connection removed: ${connectionId}`);
      this.logConnectionStats();
      
      return connectionInfo;
    }
    
    return null;
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  /**
   * Update connection activity
   */
  updateActivity(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
      connection.messageCount++;
      connection.isAlive = true;
    }
  }

  /**
   * Update ping timestamp
   */
  updatePing(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastPing = new Date();
    }
  }

  /**
   * Update pong timestamp
   */
  updatePong(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastPong = new Date();
      connection.isAlive = true;
    }
  }

  /**
   * Mark connection as potentially dead
   */
  markAsDead(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = false;
    }
  }

  /**
   * Send message to specific connection
   */
  sendMessageToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    
    if (connection && connection.ws && connection.ws.readyState === 1) { // WebSocket.OPEN
      try {
        const messageString = JSON.stringify(message);
        connection.ws.send(messageString);
        this.updateActivity(connectionId);
        return true;
      } catch (error) {
        console.error(`❌ Failed to send message to ${connectionId}:`, error);
        this.markAsDead(connectionId);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Send message to all connections of a user
   */
  sendMessageToUser(userId, message) {
    const userConnections = this.userConnections.get(userId);
    let sentCount = 0;
    
    if (userConnections) {
      userConnections.forEach(connectionId => {
        if (this.sendMessageToConnection(connectionId, message)) {
          sentCount++;
        }
      });
    }
    
    return sentCount;
  }

  /**
   * Broadcast message to all connections
   */
  broadcastMessage(message, excludeConnectionId = null) {
    let sentCount = 0;
    
    this.connections.forEach((connection, connectionId) => {
      if (connectionId !== excludeConnectionId) {
        if (this.sendMessageToConnection(connectionId, message)) {
          sentCount++;
        }
      }
    });
    
    return sentCount;
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId) {
    const connectionIds = this.userConnections.get(userId);
    const connections = [];
    
    if (connectionIds) {
      connectionIds.forEach(connectionId => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          connections.push(connection);
        }
      });
    }
    
    return connections;
  }

  /**
   * Get total number of active connections
   */
  getClientCount() {
    return this.connections.size;
  }

  /**
   * Get total number of active connections (alias for getClientCount)
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const now = new Date();
    const stats = {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      aliveConnections: 0,
      deadConnections: 0,
      avgConnectionTime: 0,
      totalMessages: 0
    };

    let totalConnectionTime = 0;
    
    this.connections.forEach(connection => {
      if (connection.isAlive) {
        stats.aliveConnections++;
      } else {
        stats.deadConnections++;
      }
      
      totalConnectionTime += now - connection.connectedAt;
      stats.totalMessages += connection.messageCount;
    });

    if (stats.totalConnections > 0) {
      stats.avgConnectionTime = Math.round(totalConnectionTime / stats.totalConnections / 1000); // seconds
    }

    return stats;
  }

  /**
   * Check connection health and cleanup dead connections
   */
  performHealthCheck() {
    const now = new Date();
    const deadConnections = [];
    
    this.connections.forEach((connection, connectionId) => {
      const timeSinceActivity = now - connection.lastActivity;
      
      // Check if connection is inactive for too long
      if (timeSinceActivity > this.connectionTimeout) {
        console.log(`⚠️ Connection ${connectionId} inactive for ${Math.round(timeSinceActivity / 1000)}s, marking as dead`);
        deadConnections.push(connectionId);
        return;
      }
      
      // Check WebSocket state
      if (connection.ws.readyState !== 1) { // Not OPEN
        console.log(`⚠️ Connection ${connectionId} WebSocket not open (state: ${connection.ws.readyState})`);
        deadConnections.push(connectionId);
        return;
      }
      
      // Send ping if no recent activity
      if (timeSinceActivity > this.heartbeatInterval / 2) {
        this.sendPing(connectionId);
      }
    });
    
    // Remove dead connections
    deadConnections.forEach(connectionId => {
      this.removeConnection(connectionId);
    });
    
    if (deadConnections.length > 0) {
      console.log(`🧹 Cleaned up ${deadConnections.length} dead connections`);
    }
    
    return deadConnections.length;
  }

  /**
   * Send ping to connection
   */
  sendPing(connectionId) {
    const pingMessage = {
      type: 'ping',
      timestamp: Date.now(),
      server: true
    };
    
    if (this.sendMessageToConnection(connectionId, pingMessage)) {
      this.updatePing(connectionId);
      console.log(`💓 Server ping sent to ${connectionId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Start periodic cleanup task
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.heartbeatInterval);
    
    console.log(`🔄 Periodic cleanup started (interval: ${this.heartbeatInterval / 1000}s)`);
  }

  /**
   * Log connection statistics
   */
  logConnectionStats() {
    const stats = this.getStats();
    
    // Only log every 5 connections or when significant changes occur
    if (stats.totalConnections <= 5 || stats.totalConnections % 5 === 0) {
      console.log(`📊 Connection Stats:`, {
        total: stats.totalConnections,
        users: stats.uniqueUsers,
        alive: stats.aliveConnections,
        avgTime: `${stats.avgConnectionTime}s`,
        totalMsgs: stats.totalMessages
      });
    }
  }

  /**
   * Set session ID for connection
   */
  setSessionId(connectionId, sessionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.sessionId = sessionId;
      console.log(`🔗 Session ${sessionId} linked to connection ${connectionId}`);
    }
  }

  /**
   * Get connections by session ID
   */
  getConnectionsBySession(sessionId) {
    const connections = [];
    
    this.connections.forEach(connection => {
      if (connection.sessionId === sessionId) {
        connections.push(connection);
      }
    });
    
    return connections;
  }

  /**
   * Graceful shutdown - close all connections
   */
  shutdown() {
    console.log('🔌 Shutting down Enhanced Connection Manager...');
    
    this.connections.forEach((connection, connectionId) => {
      if (connection.ws && connection.ws.readyState === 1) {
        connection.ws.close(1001, 'Server shutdown');
      }
    });
    
    this.connections.clear();
    this.userConnections.clear();
    
    console.log('✅ Enhanced Connection Manager shutdown complete');
  }
}

// Export singleton instance
const enhancedConnectionManager = new EnhancedConnectionManager();

module.exports = enhancedConnectionManager;