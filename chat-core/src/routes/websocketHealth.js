/**
 * WebSocket Health Check Routes
 * Provides HTTP endpoints for monitoring WebSocket service health and metrics
 */

const express = require('express');
const router = express.Router();

// This will be set by the main server when initializing
let monitor = null;
let errorHandler = null;

/**
 * Set monitor and error handler instances
 */
function setMonitoringInstances(monitorInstance, errorHandlerInstance) {
  monitor = monitorInstance;
  errorHandler = errorHandlerInstance;
}

/**
 * GET /health - Basic health check
 */
router.get('/health', (req, res) => {
  if (!monitor) {
    return res.status(503).json({
      status: 'unavailable',
      message: 'WebSocket monitoring not initialized'
    });
  }
  
  const health = monitor.getHealth();
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    status: health.status,
    timestamp: new Date().toISOString(),
    lastCheck: health.lastCheck ? new Date(health.lastCheck).toISOString() : null,
    issues: health.issues,
    service: 'websocket'
  });
});

/**
 * GET /metrics - Detailed metrics
 */
router.get('/metrics', (req, res) => {
  if (!monitor) {
    return res.status(503).json({
      error: 'WebSocket monitoring not initialized'
    });
  }
  
  const metrics = monitor.getMetrics();
  
  // Convert Map to Object for JSON serialization
  const errorsByType = {};
  metrics.errors.byType.forEach((count, type) => {
    errorsByType[type] = count;
  });
  
  res.json({
    timestamp: new Date().toISOString(),
    connections: {
      current: metrics.connections.current,
      peak: metrics.connections.peak,
      total: metrics.connections.total
    },
    messages: {
      sent: metrics.messages.sent,
      received: metrics.messages.received,
      failed: metrics.messages.failed,
      successRate: metrics.messages.sent > 0 ? 
        (metrics.messages.sent - metrics.messages.failed) / metrics.messages.sent : 1
    },
    errors: {
      total: metrics.errors.total,
      byType: errorsByType
    },
    performance: {
      memoryUsage: {
        bytes: metrics.performance.memoryUsage,
        mb: Math.round(metrics.performance.memoryUsage / 1024 / 1024)
      }
    },
    health: metrics.health
  });
});

/**
 * GET /metrics/summary - Performance summary
 */
router.get('/metrics/summary', (req, res) => {
  if (!monitor) {
    return res.status(503).json({
      error: 'WebSocket monitoring not initialized'
    });
  }
  
  const timeWindow = parseInt(req.query.window) || 60 * 60 * 1000; // Default 1 hour
  const summary = monitor.getPerformanceSummary(timeWindow);
  
  res.json({
    timestamp: new Date().toISOString(),
    timeWindow: `${timeWindow / 1000 / 60} minutes`,
    summary
  });
});

/**
 * GET /errors - Error statistics
 */
router.get('/errors', (req, res) => {
  if (!errorHandler) {
    return res.status(503).json({
      error: 'WebSocket error handler not initialized'
    });
  }
  
  const errorStats = errorHandler.getErrorStats();
  
  res.json({
    timestamp: new Date().toISOString(),
    errorStats,
    totalErrors: Object.values(errorStats).reduce((sum, stat) => sum + stat.count, 0)
  });
});

/**
 * POST /errors/reset - Reset error statistics
 */
router.post('/errors/reset', (req, res) => {
  if (!errorHandler) {
    return res.status(503).json({
      error: 'WebSocket error handler not initialized'
    });
  }
  
  errorHandler.resetErrorStats();
  
  res.json({
    message: 'Error statistics reset successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /metrics/reset - Reset metrics
 */
router.post('/metrics/reset', (req, res) => {
  if (!monitor) {
    return res.status(503).json({
      error: 'WebSocket monitoring not initialized'
    });
  }
  
  monitor.resetMetrics();
  
  res.json({
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /status - Comprehensive status report
 */
router.get('/status', (req, res) => {
  if (!monitor || !errorHandler) {
    return res.status(503).json({
      error: 'WebSocket monitoring not fully initialized'
    });
  }
  
  const health = monitor.getHealth();
  const metrics = monitor.getMetrics();
  const errorStats = errorHandler.getErrorStats();
  const summary = monitor.getPerformanceSummary();
  
  // Convert Map to Object for JSON serialization
  const errorsByType = {};
  metrics.errors.byType.forEach((count, type) => {
    errorsByType[type] = count;
  });
  
  res.json({
    timestamp: new Date().toISOString(),
    service: 'websocket',
    health: {
      status: health.status,
      lastCheck: health.lastCheck ? new Date(health.lastCheck).toISOString() : null,
      issues: health.issues
    },
    connections: {
      current: metrics.connections.current,
      peak: metrics.connections.peak,
      total: metrics.connections.total
    },
    performance: summary,
    errors: {
      total: metrics.errors.total,
      byType: errorsByType,
      recentStats: errorStats
    },
    uptime: process.uptime(),
    memory: {
      usage: process.memoryUsage(),
      formatted: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`
      }
    }
  });
});

/**
 * GET /config - WebSocket configuration
 */
router.get('/config', (req, res) => {
  const wsConfig = require('../config/websocket');
  
  // Remove sensitive information
  const safeConfig = {
    server: {
      port: wsConfig.server.port,
      maxConnections: wsConfig.server.maxConnections,
      connectionTimeout: wsConfig.server.connectionTimeout,
      idleTimeout: wsConfig.server.idleTimeout
    },
    heartbeat: wsConfig.heartbeat,
    reconnection: wsConfig.reconnection,
    logging: {
      level: wsConfig.logging.level,
      logConnections: wsConfig.logging.logConnections
    },
    performance: wsConfig.performance
  };
  
  res.json({
    timestamp: new Date().toISOString(),
    config: safeConfig
  });
});

module.exports = {
  router,
  setMonitoringInstances
};