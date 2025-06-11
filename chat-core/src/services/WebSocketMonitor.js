/**
 * WebSocket Monitor Service
 * Provides real-time monitoring, health checks, and performance metrics for WebSocket connections
 */

const EventEmitter = require('events');
const wsConfig = require('../config/websocket');

class WebSocketMonitor extends EventEmitter {
  constructor(connectionManager, options = {}) {
    super();
    
    this.connectionManager = connectionManager;
    this.options = {
      metricsInterval: options.metricsInterval || 60000, // 1 minute
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      alertThresholds: {
        connectionCount: options.maxConnections || 1000,
        errorRate: options.maxErrorRate || 0.1, // 10%
        avgResponseTime: options.maxResponseTime || 5000, // 5 seconds
        memoryUsage: options.maxMemoryUsage || 500 * 1024 * 1024, // 500MB
        ...options.alertThresholds
      },
      retentionPeriod: options.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      enableAlerts: options.enableAlerts !== false
    };
    
    // Metrics storage
    this.metrics = {
      connections: {
        current: 0,
        peak: 0,
        total: 0,
        history: []
      },
      messages: {
        sent: 0,
        received: 0,
        failed: 0,
        history: []
      },
      errors: {
        total: 0,
        byType: new Map(),
        history: []
      },
      performance: {
        avgResponseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        history: []
      },
      health: {
        status: 'healthy',
        lastCheck: null,
        issues: []
      }
    };
    
    // Active monitoring timers
    this.timers = {
      metrics: null,
      healthCheck: null,
      cleanup: null
    };
    
    // Start monitoring
    this.start();
    
    // Listen to connection manager events
    this._setupEventListeners();
  }
  
  /**
   * Start monitoring services
   */
  start() {
    console.log('🔍 Starting WebSocket monitoring...');
    
    // Start metrics collection
    this.timers.metrics = setInterval(() => {
      this._collectMetrics();
    }, this.options.metricsInterval);
    
    // Start health checks
    this.timers.healthCheck = setInterval(() => {
      this._performHealthCheck();
    }, this.options.healthCheckInterval);
    
    // Start cleanup of old data
    this.timers.cleanup = setInterval(() => {
      this._cleanupOldData();
    }, this.options.retentionPeriod / 24); // Cleanup every hour
    
    console.log('✅ WebSocket monitoring started');
  }
  
  /**
   * Stop monitoring services
   */
  stop() {
    console.log('🛑 Stopping WebSocket monitoring...');
    
    Object.values(this.timers).forEach(timer => {
      if (timer) clearInterval(timer);
    });
    
    this.timers = { metrics: null, healthCheck: null, cleanup: null };
    console.log('✅ WebSocket monitoring stopped');
  }
  
  /**
   * Setup event listeners for connection manager
   */
  _setupEventListeners() {
    if (!this.connectionManager) return;
    
    // Connection events
    this.connectionManager.on('connectionAdded', (data) => {
      this._recordConnectionEvent('added', data);
    });
    
    this.connectionManager.on('connectionRemoved', (data) => {
      this._recordConnectionEvent('removed', data);
    });
    
    this.connectionManager.on('connectionError', (data) => {
      this._recordErrorEvent(data);
    });
    
    this.connectionManager.on('messageSent', (data) => {
      this._recordMessageEvent('sent', data);
    });
    
    this.connectionManager.on('messageReceived', (data) => {
      this._recordMessageEvent('received', data);
    });
    
    this.connectionManager.on('messageFailed', (data) => {
      this._recordMessageEvent('failed', data);
    });
  }
  
  /**
   * Collect current metrics
   */
  _collectMetrics() {
    const timestamp = Date.now();
    
    // Connection metrics
    const currentConnections = this.connectionManager ? this.connectionManager.getConnectionCount() : 0;
    this.metrics.connections.current = currentConnections;
    this.metrics.connections.peak = Math.max(this.metrics.connections.peak, currentConnections);
    
    // Performance metrics
    const memUsage = process.memoryUsage();
    this.metrics.performance.memoryUsage = memUsage.heapUsed;
    
    // Store historical data
    const snapshot = {
      timestamp,
      connections: currentConnections,
      memoryUsage: memUsage.heapUsed,
      errors: this.metrics.errors.total,
      messagesSent: this.metrics.messages.sent,
      messagesReceived: this.metrics.messages.received
    };
    
    this.metrics.connections.history.push(snapshot);
    this.metrics.performance.history.push(snapshot);
    
    // Emit metrics event
    this.emit('metricsCollected', snapshot);
  }
  
  /**
   * Perform health check
   */
  _performHealthCheck() {
    const issues = [];
    const timestamp = Date.now();
    
    // Check connection count
    if (this.metrics.connections.current > this.options.alertThresholds.connectionCount) {
      issues.push({
        type: 'high_connection_count',
        severity: 'warning',
        message: `High connection count: ${this.metrics.connections.current}`,
        threshold: this.options.alertThresholds.connectionCount
      });
    }
    
    // Check memory usage
    if (this.metrics.performance.memoryUsage > this.options.alertThresholds.memoryUsage) {
      issues.push({
        type: 'high_memory_usage',
        severity: 'warning',
        message: `High memory usage: ${Math.round(this.metrics.performance.memoryUsage / 1024 / 1024)}MB`,
        threshold: Math.round(this.options.alertThresholds.memoryUsage / 1024 / 1024)
      });
    }
    
    // Check error rate
    const recentErrors = this._getRecentErrors(5 * 60 * 1000); // Last 5 minutes
    const recentMessages = this._getRecentMessages(5 * 60 * 1000);
    const errorRate = recentMessages > 0 ? recentErrors / recentMessages : 0;
    
    if (errorRate > this.options.alertThresholds.errorRate) {
      issues.push({
        type: 'high_error_rate',
        severity: 'error',
        message: `High error rate: ${Math.round(errorRate * 100)}%`,
        threshold: Math.round(this.options.alertThresholds.errorRate * 100)
      });
    }
    
    // Update health status
    const hasErrors = issues.some(issue => issue.severity === 'error');
    const hasWarnings = issues.some(issue => issue.severity === 'warning');
    
    this.metrics.health = {
      status: hasErrors ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy',
      lastCheck: timestamp,
      issues
    };
    
    // Emit health check event
    this.emit('healthCheck', this.metrics.health);
    
    // Send alerts if enabled
    if (this.options.enableAlerts && issues.length > 0) {
      this._sendAlerts(issues);
    }
  }
  
  /**
   * Record connection events
   */
  _recordConnectionEvent(type, data) {
    const timestamp = Date.now();
    
    if (type === 'added') {
      this.metrics.connections.total++;
    }
    
    this.emit('connectionEvent', { type, data, timestamp });
  }
  
  /**
   * Record error events
   */
  _recordErrorEvent(data) {
    const timestamp = Date.now();
    const errorType = data.errorInfo?.type || 'unknown';
    
    this.metrics.errors.total++;
    
    // Track errors by type
    const currentCount = this.metrics.errors.byType.get(errorType) || 0;
    this.metrics.errors.byType.set(errorType, currentCount + 1);
    
    // Store in history
    this.metrics.errors.history.push({
      timestamp,
      type: errorType,
      message: data.errorInfo?.message,
      connectionId: data.connectionId
    });
    
    this.emit('errorEvent', { data, timestamp });
  }
  
  /**
   * Record message events
   */
  _recordMessageEvent(type, data) {
    const timestamp = Date.now();
    
    switch (type) {
      case 'sent':
        this.metrics.messages.sent++;
        break;
      case 'received':
        this.metrics.messages.received++;
        break;
      case 'failed':
        this.metrics.messages.failed++;
        break;
    }
    
    // Store in history
    this.metrics.messages.history.push({
      timestamp,
      type,
      connectionId: data.connectionId,
      messageType: data.messageType
    });
    
    this.emit('messageEvent', { type, data, timestamp });
  }
  
  /**
   * Get recent errors count
   */
  _getRecentErrors(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return this.metrics.errors.history.filter(error => error.timestamp > cutoff).length;
  }
  
  /**
   * Get recent messages count
   */
  _getRecentMessages(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return this.metrics.messages.history.filter(msg => msg.timestamp > cutoff).length;
  }
  
  /**
   * Send alerts for issues
   */
  _sendAlerts(issues) {
    issues.forEach(issue => {
      console.warn(`🚨 WebSocket Alert [${issue.severity.toUpperCase()}]: ${issue.message}`);
      
      this.emit('alert', {
        ...issue,
        timestamp: Date.now(),
        service: 'websocket'
      });
    });
  }
  
  /**
   * Cleanup old data
   */
  _cleanupOldData() {
    const cutoff = Date.now() - this.options.retentionPeriod;
    
    // Clean connection history
    this.metrics.connections.history = this.metrics.connections.history.filter(
      item => item.timestamp > cutoff
    );
    
    // Clean performance history
    this.metrics.performance.history = this.metrics.performance.history.filter(
      item => item.timestamp > cutoff
    );
    
    // Clean error history
    this.metrics.errors.history = this.metrics.errors.history.filter(
      item => item.timestamp > cutoff
    );
    
    // Clean message history
    this.metrics.messages.history = this.metrics.messages.history.filter(
      item => item.timestamp > cutoff
    );
    
    console.log('🧹 Cleaned up old monitoring data');
  }
  
  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get health status
   */
  getHealth() {
    return this.metrics.health;
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary(timeWindow = 60 * 60 * 1000) { // Default 1 hour
    const cutoff = Date.now() - timeWindow;
    const recentData = this.metrics.performance.history.filter(item => item.timestamp > cutoff);
    
    if (recentData.length === 0) {
      return { message: 'No recent performance data available' };
    }
    
    const avgConnections = recentData.reduce((sum, item) => sum + item.connections, 0) / recentData.length;
    const avgMemory = recentData.reduce((sum, item) => sum + item.memoryUsage, 0) / recentData.length;
    const peakConnections = Math.max(...recentData.map(item => item.connections));
    const peakMemory = Math.max(...recentData.map(item => item.memoryUsage));
    
    return {
      timeWindow: timeWindow / 1000 / 60, // in minutes
      connections: {
        average: Math.round(avgConnections),
        peak: peakConnections,
        current: this.metrics.connections.current
      },
      memory: {
        average: Math.round(avgMemory / 1024 / 1024), // MB
        peak: Math.round(peakMemory / 1024 / 1024), // MB
        current: Math.round(this.metrics.performance.memoryUsage / 1024 / 1024) // MB
      },
      errors: {
        total: this._getRecentErrors(timeWindow),
        rate: this._getRecentErrors(timeWindow) / this._getRecentMessages(timeWindow) || 0
      }
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      connections: { current: 0, peak: 0, total: 0, history: [] },
      messages: { sent: 0, received: 0, failed: 0, history: [] },
      errors: { total: 0, byType: new Map(), history: [] },
      performance: { avgResponseTime: 0, memoryUsage: 0, cpuUsage: 0, history: [] },
      health: { status: 'healthy', lastCheck: null, issues: [] }
    };
    
    console.log('📊 WebSocket metrics reset');
  }
}

module.exports = WebSocketMonitor;