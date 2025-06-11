/**
 * 🔌 Robust WebSocket Service with Heartbeat and Auto-Reconnection
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping-pong mechanism to detect dead connections
 * - Message queuing during disconnection
 * - Connection state management
 * - Event-driven architecture
 * 
 * Based on best practices from:
 * - RFC 6455 WebSocket Protocol
 * - MDN WebSocket documentation
 * - Industry-standard reconnection patterns
 */

class RobustWebSocketService {
  constructor(options = {}) {
    // Default configuration that matches server-side config
    const defaultConfig = {
      url: import.meta.env.VITE_CHAT_CORE_WS_URL || "ws://localhost:3001",
      
      // Reconnection settings
      maxReconnectAttempts: 10,
      reconnectInterval: 1000, // Start with 1s
      maxReconnectInterval: 30000, // Max 30s
      reconnectDecay: 1.5, // Exponential backoff multiplier
      jitter: 0.1, // 10% jitter for reconnection
      
      // Heartbeat settings
      heartbeatInterval: 30000, // 30s ping interval
      pongTimeout: 10000, // 10s timeout for pong response
      enableHeartbeat: true,
      
      // Message settings
      enableMessageQueue: true,
      maxQueueSize: 100,
      
      // Connection settings
      enableReconnect: true,
      
      // Debug settings
      debug: false,
      logLevel: 'info' // debug, info, warn, error
    };
    
    // Configuration with sensible defaults
    this.config = { ...defaultConfig, ...options };
    
    // State management
    this.ws = null;
    this.connectionState = 'DISCONNECTED'; // CONNECTING, CONNECTED, DISCONNECTING, DISCONNECTED
    this.reconnectAttempts = 0;
    this.reconnectTimeoutId = null;
    this.heartbeatIntervalId = null;
    this.pongTimeoutId = null;
    this.lastPongReceived = null;
    
    // Message queue for offline support
    this.messageQueue = [];
    
    // Event handlers
    this.eventHandlers = {
      onOpen: [],
      onMessage: [],
      onClose: [],
      onError: [],
      onReconnecting: [],
      onReconnected: [],
      onMaxReconnectAttemptsReached: []
    };
    
    this.log('RobustWebSocketService initialized', this.config);
  }
  
  /**
   * Add event listener
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      // Check if handler already exists to prevent duplicates
      if (!this.eventHandlers[event].includes(handler)) {
        this.eventHandlers[event].push(handler);
      }
    }
  }
  
  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }
  
  /**
   * Emit event to all listeners
   */
  emit(event, ...args) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          this.log('Error in event handler:', error);
        }
      });
    }
  }
  
  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.connectionState === 'CONNECTING' || this.connectionState === 'CONNECTED') {
      this.log('Already connecting or connected');
      return;
    }
    
    this.connectionState = 'CONNECTING';
    this.log(`Attempting to connect (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
    
    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.log('Failed to create WebSocket:', error);
      this.handleConnectionError(error);
    }
  }
  
  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.ws.onopen = (event) => {
      this.log('✅ WebSocket connected successfully');
      this.connectionState = 'CONNECTED';
      this.reconnectAttempts = 0;
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Process queued messages
      this.processMessageQueue();
      
      // Emit events
      if (this.reconnectAttempts > 0) {
        this.emit('onReconnected', event);
      }
      this.emit('onOpen', event);
    };
    
    this.ws.onmessage = (event) => {
      try {
        // Reset pong timeout on any message (indicates connection is alive)
        this.resetPongTimeout();
        
        const message = JSON.parse(event.data);
        
        // Handle heartbeat pong
        if (message.type === 'pong') {
          this.lastPongReceived = Date.now();
          this.log('💓 Pong received');
          return;
        }
        
        this.emit('onMessage', message, event);
      } catch (error) {
        this.log('Error parsing message:', error, 'Raw data:', event.data);
      }
    };
    
    this.ws.onclose = (event) => {
      this.log(`🔌 WebSocket closed. Code: ${event.code}, Reason: "${event.reason}"`);
      this.connectionState = 'DISCONNECTED';
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      this.emit('onClose', event);
      
      // Attempt reconnection for abnormal closures
      if (event.code !== 1000 && event.code !== 1001) {
        this.scheduleReconnect();
      }
    };
    
    this.ws.onerror = (event) => {
      this.log('❌ WebSocket error:', event);
      this.emit('onError', event);
      this.handleConnectionError(event);
    };
  }
  
  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.connectionState === 'CONNECTED' && this.ws.readyState === WebSocket.OPEN) {
        this.sendPing();
      }
    }, this.config.heartbeatInterval);
    
    this.log('💓 Heartbeat started');
  }
  
  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
  }
  
  /**
   * Send ping message
   */
  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const pingMessage = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      this.ws.send(JSON.stringify(pingMessage));
      this.log('💓 Ping sent');
      
      // Set timeout for pong response
      this.pongTimeoutId = setTimeout(() => {
        this.log('⚠️ Pong timeout - connection may be dead');
        this.ws.close(1006, 'Pong timeout');
      }, this.config.pongTimeout);
    }
  }
  
  /**
   * Reset pong timeout
   */
  resetPongTimeout() {
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
  }
  
  /**
   * Send message with automatic queuing
   */
  send(message) {
    const messageObj = typeof message === 'string' ? { text: message } : message;
    
    if (this.connectionState === 'CONNECTED' && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(messageObj));
        this.log('📤 Message sent:', messageObj);
        return true;
      } catch (error) {
        this.log('Error sending message:', error);
        if (this.config.enableMessageQueue) {
          this.queueMessage(messageObj);
        }
        return false;
      }
    } else {
      if (this.config.enableMessageQueue) {
        this.queueMessage(messageObj);
        this.log('📥 Message queued (not connected):', messageObj);
      } else {
        this.log('❌ Cannot send message - not connected:', messageObj);
      }
      return false;
    }
  }
  
  /**
   * Queue message for later sending
   */
  queueMessage(message) {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.messageQueue.shift(); // Remove oldest message
    }
    this.messageQueue.push({
      message,
      timestamp: Date.now()
    });
  }
  
  /**
   * Process queued messages
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    this.log(`📤 Processing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(({ message }) => {
      this.send(message);
    });
  }
  
  /**
   * Handle connection errors and schedule reconnection
   */
  handleConnectionError(error) {
    this.connectionState = 'DISCONNECTED';
    this.stopHeartbeat();
    
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.log('❌ Max reconnection attempts reached');
      this.emit('onMaxReconnectAttemptsReached', error);
    }
  }
  
  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    
    // Calculate base delay with exponential backoff
    const baseDelay = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.reconnectDecay, this.reconnectAttempts),
      this.config.maxReconnectInterval
    );
    
    // Add jitter to prevent thundering herd
    const jitter = baseDelay * this.config.jitter * (Math.random() * 2 - 1); // ±10% jitter
    const delay = Math.max(100, baseDelay + jitter); // Minimum 100ms delay
    
    this.log(`🔄 Scheduling reconnection in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
    
    this.emit('onReconnecting', {
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.config.maxReconnectAttempts,
      delay
    });
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  
  /**
   * Manually disconnect
   */
  disconnect() {
    this.log('🔌 Manually disconnecting...');
    this.connectionState = 'DISCONNECTING';
    
    // Clear reconnection timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
    }
    
    // Reset state
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }
  
  /**
   * Get current connection state
   */
  getState() {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastPongReceived: this.lastPongReceived,
      readyState: this.ws ? this.ws.readyState : null
    };
  }

  /**
   * Get connection state (alias for getState)
   */
  getConnectionState() {
    return this.getState();
  }
  
  /**
   * Reset connection (force reconnect)
   */
  reset() {
    this.log('🔄 Resetting connection...');
    this.disconnect();
    setTimeout(() => {
      this.reconnectAttempts = 0;
      this.connect();
    }, 1000);
  }
  
  /**
   * Debug logging
   */
  log(...args) {
    if (this.config.debug) {
      console.log('[RobustWebSocket]', new Date().toISOString(), ...args);
    }
  }
}

// Export singleton instance and class
let wsService = null;

export function createWebSocketService(options = {}) {
  if (wsService) {
    wsService.disconnect();
  }
  
  wsService = new RobustWebSocketService({
    debug: true, // Enable debug logging
    ...options
  });
  
  return wsService;
}

export function getWebSocketService() {
  if (!wsService) {
    wsService = createWebSocketService();
  }
  return wsService;
}

export { RobustWebSocketService };

// Legacy compatibility exports
export const connect = (eventHandlers = {}) => {
  const service = getWebSocketService();
  
  // Register event handlers
  if (eventHandlers.onOpen) service.on('onOpen', eventHandlers.onOpen);
  if (eventHandlers.onMessage) service.on('onMessage', eventHandlers.onMessage);
  if (eventHandlers.onClose) service.on('onClose', eventHandlers.onClose);
  if (eventHandlers.onError) service.on('onError', eventHandlers.onError);
  
  service.connect();
  return service;
};

export const sendMessage = (message) => {
  return getWebSocketService().send(message);
};

export const disconnect = () => {
  return getWebSocketService().disconnect();
};