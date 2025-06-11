/**
 * WebSocket Error Handler Utility
 * Provides comprehensive error handling and recovery strategies for WebSocket connections
 */

const wsConfig = require('../config/websocket');

/**
 * WebSocket Error Codes and their meanings
 */
const ERROR_CODES = {
  1000: { name: 'NORMAL_CLOSURE', description: 'Normal closure', severity: 'info' },
  1001: { name: 'GOING_AWAY', description: 'Going away', severity: 'info' },
  1002: { name: 'PROTOCOL_ERROR', description: 'Protocol error', severity: 'error' },
  1003: { name: 'UNSUPPORTED_DATA', description: 'Unsupported data', severity: 'error' },
  1004: { name: 'RESERVED', description: 'Reserved', severity: 'warn' },
  1005: { name: 'NO_STATUS_RCVD', description: 'No status received', severity: 'warn' },
  1006: { name: 'ABNORMAL_CLOSURE', description: 'Abnormal closure', severity: 'error' },
  1007: { name: 'INVALID_FRAME_PAYLOAD_DATA', description: 'Invalid frame payload data', severity: 'error' },
  1008: { name: 'POLICY_VIOLATION', description: 'Policy violation', severity: 'error' },
  1009: { name: 'MESSAGE_TOO_BIG', description: 'Message too big', severity: 'error' },
  1010: { name: 'MANDATORY_EXTENSION', description: 'Mandatory extension', severity: 'error' },
  1011: { name: 'INTERNAL_ERROR', description: 'Internal server error', severity: 'error' },
  1012: { name: 'SERVICE_RESTART', description: 'Service restart', severity: 'warn' },
  1013: { name: 'TRY_AGAIN_LATER', description: 'Try again later', severity: 'warn' },
  1014: { name: 'BAD_GATEWAY', description: 'Bad gateway', severity: 'error' },
  1015: { name: 'TLS_HANDSHAKE', description: 'TLS handshake failure', severity: 'error' }
};

/**
 * Common WebSocket error patterns and their solutions
 */
const ERROR_PATTERNS = {
  CONNECTION_REFUSED: {
    pattern: /ECONNREFUSED|Connection refused/i,
    description: 'Server is not running or not accepting connections',
    solutions: [
      'Check if the WebSocket server is running',
      'Verify the server port and URL',
      'Check firewall settings',
      'Implement retry logic with exponential backoff'
    ]
  },
  NETWORK_ERROR: {
    pattern: /ENETUNREACH|Network is unreachable|ETIMEDOUT/i,
    description: 'Network connectivity issues',
    solutions: [
      'Check internet connection',
      'Verify DNS resolution',
      'Check proxy settings',
      'Implement offline detection'
    ]
  },
  HANDSHAKE_ERROR: {
    pattern: /Unexpected server response|Invalid handshake/i,
    description: 'WebSocket handshake failed',
    solutions: [
      'Check WebSocket URL format',
      'Verify server WebSocket support',
      'Check for proxy interference',
      'Validate headers and protocols'
    ]
  },
  AUTHENTICATION_ERROR: {
    pattern: /Unauthorized|Authentication failed|Invalid token/i,
    description: 'Authentication or authorization failed',
    solutions: [
      'Check authentication credentials',
      'Refresh authentication tokens',
      'Verify user permissions',
      'Implement token refresh logic'
    ]
  },
  RATE_LIMIT_ERROR: {
    pattern: /Rate limit|Too many requests/i,
    description: 'Rate limiting triggered',
    solutions: [
      'Implement message throttling',
      'Add delays between requests',
      'Use exponential backoff',
      'Optimize message frequency'
    ]
  }
};

class WebSocketErrorHandler {
  constructor(logger = console) {
    this.logger = logger;
    this.errorStats = new Map();
    this.recoveryStrategies = new Map();
    
    this._initializeRecoveryStrategies();
  }
  
  /**
   * Initialize recovery strategies for different error types
   */
  _initializeRecoveryStrategies() {
    // Strategy for connection errors
    this.recoveryStrategies.set('connection', {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      shouldRetry: (error, attempt) => attempt < 5
    });
    
    // Strategy for authentication errors
    this.recoveryStrategies.set('authentication', {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      backoffFactor: 1.5,
      shouldRetry: (error, attempt) => attempt < 3 && !error.message.includes('invalid credentials')
    });
    
    // Strategy for rate limit errors
    this.recoveryStrategies.set('rateLimit', {
      maxRetries: 10,
      baseDelay: 5000,
      maxDelay: 60000,
      backoffFactor: 1.5,
      shouldRetry: (error, attempt) => attempt < 10
    });
  }
  
  /**
   * Handle WebSocket errors with appropriate logging and recovery
   */
  handleError(error, context = {}) {
    const errorInfo = this._analyzeError(error, context);
    this._logError(errorInfo);
    this._updateErrorStats(errorInfo);
    
    return {
      ...errorInfo,
      recoveryStrategy: this._getRecoveryStrategy(errorInfo),
      shouldReconnect: this._shouldReconnect(errorInfo),
      recommendations: this._getRecommendations(errorInfo)
    };
  }
  
  /**
   * Handle WebSocket close events
   */
  handleClose(code, reason, context = {}) {
    const closeInfo = this._analyzeCloseCode(code, reason, context);
    this._logClose(closeInfo);
    
    return {
      ...closeInfo,
      shouldReconnect: this._shouldReconnectOnClose(code),
      recoveryDelay: this._getRecoveryDelay(code)
    };
  }
  
  /**
   * Analyze error and categorize it
   */
  _analyzeError(error, context) {
    const errorMessage = error.message || error.toString();
    const errorType = this._categorizeError(errorMessage);
    const pattern = this._matchErrorPattern(errorMessage);
    
    return {
      originalError: error,
      message: errorMessage,
      type: errorType,
      pattern: pattern,
      context: context,
      timestamp: new Date().toISOString(),
      severity: this._getSeverity(errorType, pattern)
    };
  }
  
  /**
   * Analyze WebSocket close code
   */
  _analyzeCloseCode(code, reason, context) {
    const codeInfo = ERROR_CODES[code] || {
      name: 'UNKNOWN',
      description: `Unknown close code: ${code}`,
      severity: 'warn'
    };
    
    return {
      code,
      reason: reason || '',
      name: codeInfo.name,
      description: codeInfo.description,
      severity: codeInfo.severity,
      context,
      timestamp: new Date().toISOString(),
      isAbnormal: this._isAbnormalClose(code)
    };
  }
  
  /**
   * Categorize error based on message content
   */
  _categorizeError(message) {
    if (/ECONNREFUSED|Connection refused/i.test(message)) return 'connection';
    if (/ENETUNREACH|Network|ETIMEDOUT/i.test(message)) return 'network';
    if (/Unauthorized|Authentication|Invalid token/i.test(message)) return 'authentication';
    if (/Rate limit|Too many requests/i.test(message)) return 'rateLimit';
    if (/Handshake|Invalid response/i.test(message)) return 'handshake';
    if (/Protocol|Invalid frame/i.test(message)) return 'protocol';
    return 'unknown';
  }
  
  /**
   * Match error against known patterns
   */
  _matchErrorPattern(message) {
    for (const [name, pattern] of Object.entries(ERROR_PATTERNS)) {
      if (pattern.pattern.test(message)) {
        return { name, ...pattern };
      }
    }
    return null;
  }
  
  /**
   * Get error severity
   */
  _getSeverity(errorType, pattern) {
    if (pattern && pattern.severity) return pattern.severity;
    
    switch (errorType) {
      case 'connection':
      case 'network':
        return 'warn';
      case 'authentication':
      case 'protocol':
        return 'error';
      case 'rateLimit':
        return 'info';
      default:
        return 'warn';
    }
  }
  
  /**
   * Determine if connection should be retried
   */
  _shouldReconnect(errorInfo) {
    const strategy = this.recoveryStrategies.get(errorInfo.type);
    if (!strategy) return true; // Default to retry
    
    const attempts = this._getErrorCount(errorInfo.type);
    return strategy.shouldRetry(errorInfo.originalError, attempts);
  }
  
  /**
   * Determine if connection should be retried based on close code
   */
  _shouldReconnectOnClose(code) {
    // Don't reconnect on normal closures or policy violations
    const noReconnectCodes = [1000, 1001, 1008, 1011];
    return !noReconnectCodes.includes(code);
  }
  
  /**
   * Check if close code indicates abnormal closure
   */
  _isAbnormalClose(code) {
    const abnormalCodes = [1006, 1002, 1007, 1009, 1011, 1014, 1015];
    return abnormalCodes.includes(code);
  }
  
  /**
   * Get recovery strategy for error type
   */
  _getRecoveryStrategy(errorInfo) {
    return this.recoveryStrategies.get(errorInfo.type) || this.recoveryStrategies.get('connection');
  }
  
  /**
   * Get recovery delay based on close code
   */
  _getRecoveryDelay(code) {
    switch (code) {
      case 1006: // Abnormal closure - quick retry
        return 1000;
      case 1012: // Service restart - medium delay
        return 5000;
      case 1013: // Try again later - longer delay
        return 10000;
      default:
        return 2000;
    }
  }
  
  /**
   * Get recommendations for error resolution
   */
  _getRecommendations(errorInfo) {
    if (errorInfo.pattern) {
      return errorInfo.pattern.solutions;
    }
    
    switch (errorInfo.type) {
      case 'connection':
        return ['Check server status', 'Verify network connectivity', 'Implement retry logic'];
      case 'authentication':
        return ['Refresh authentication tokens', 'Check user permissions'];
      case 'rateLimit':
        return ['Implement message throttling', 'Add delays between requests'];
      default:
        return ['Check error logs', 'Verify configuration', 'Contact support if issue persists'];
    }
  }
  
  /**
   * Update error statistics
   */
  _updateErrorStats(errorInfo) {
    const key = errorInfo.type;
    const current = this.errorStats.get(key) || { count: 0, lastOccurrence: null };
    
    this.errorStats.set(key, {
      count: current.count + 1,
      lastOccurrence: errorInfo.timestamp
    });
  }
  
  /**
   * Get error count for specific type
   */
  _getErrorCount(errorType) {
    const stats = this.errorStats.get(errorType);
    return stats ? stats.count : 0;
  }
  
  /**
   * Log error with appropriate level
   */
  _logError(errorInfo) {
    const logLevel = errorInfo.severity;
    const message = `WebSocket Error [${errorInfo.type.toUpperCase()}]: ${errorInfo.message}`;
    
    if (wsConfig.logging.level === 'debug' || errorInfo.severity === 'error') {
      this.logger[logLevel] && this.logger[logLevel](message, {
        type: errorInfo.type,
        pattern: errorInfo.pattern?.name,
        context: errorInfo.context,
        timestamp: errorInfo.timestamp
      });
    }
  }
  
  /**
   * Log close event
   */
  _logClose(closeInfo) {
    const message = `WebSocket Closed [${closeInfo.name}]: ${closeInfo.description} (Code: ${closeInfo.code})`;
    
    if (closeInfo.isAbnormal || wsConfig.logging.logConnections) {
      this.logger[closeInfo.severity] && this.logger[closeInfo.severity](message, {
        code: closeInfo.code,
        reason: closeInfo.reason,
        context: closeInfo.context,
        timestamp: closeInfo.timestamp
      });
    }
  }
  
  /**
   * Get error statistics
   */
  getErrorStats() {
    return Object.fromEntries(this.errorStats);
  }
  
  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorStats.clear();
  }
}

module.exports = {
  WebSocketErrorHandler,
  ERROR_CODES,
  ERROR_PATTERNS
};