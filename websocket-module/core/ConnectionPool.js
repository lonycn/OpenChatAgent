/**
 * 🏊 连接池管理器 - 高效的WebSocket连接管理
 * 
 * 功能:
 * - 连接生命周期管理
 * - 自动清理无效连接
 * - 连接状态监控
 * - 内存优化存储
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class ConnectionPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConnections: 1000,
      cleanupInterval: 30000,
      connectionTimeout: 300000, // 5分钟
      heartbeatInterval: 30000,
      enableMetrics: true,
      ...options
    };
    
    // 连接存储
    this.connections = new Map(); // connectionId -> connectionInfo
    this.userConnections = new Map(); // userId -> Set of connectionIds
    this.sessionConnections = new Map(); // sessionId -> Set of connectionIds
    
    // 连接统计
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      closedConnections: 0,
      errorConnections: 0,
      messagesReceived: 0,
      messagesSent: 0,
      lastActivity: null
    };
    
    // 启动定期清理
    this.startPeriodicCleanup();
    
    console.log('✅ ConnectionPool initialized');
  }
  
  /**
   * 添加新连接
   */
  addConnection(ws, metadata = {}) {
    const connectionId = uuidv4();
    const now = new Date();
    
    const connectionInfo = {
      id: connectionId,
      ws: ws,
      userId: metadata.userId || null,
      sessionId: metadata.sessionId || null,
      userAgent: metadata.userAgent || null,
      ip: metadata.ip || null,
      connectedAt: now,
      lastActivity: now,
      lastPing: null,
      lastPong: null,
      messageCount: 0,
      isAlive: true,
      state: 'connected',
      metadata: metadata
    };
    
    // 检查连接数限制
    if (this.connections.size >= this.options.maxConnections) {
      ws.close(1013, 'Server overloaded');
      this.emit('connectionRejected', { reason: 'maxConnections', connectionId });
      return null;
    }
    
    // 存储连接
    this.connections.set(connectionId, connectionInfo);
    
    // 建立用户映射
    if (metadata.userId) {
      this.addUserConnection(metadata.userId, connectionId);
    }
    
    // 建立会话映射
    if (metadata.sessionId) {
      this.addSessionConnection(metadata.sessionId, connectionId);
    }
    
    // 设置WebSocket事件处理
    this.setupWebSocketEvents(ws, connectionInfo);
    
    // 更新统计
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
    this.metrics.lastActivity = now;
    
    this.emit('connectionAdded', connectionInfo);
    
    console.log(`🔗 Connection added: ${connectionId} (Total: ${this.connections.size})`);
    
    return connectionInfo;
  }
  
  /**
   * 设置WebSocket事件处理
   */
  setupWebSocketEvents(ws, connectionInfo) {
    // 消息事件
    ws.on('message', (data) => {
      connectionInfo.lastActivity = new Date();
      connectionInfo.messageCount++;
      this.metrics.messagesReceived++;
      this.emit('message', connectionInfo, data);
    });
    
    // 关闭事件
    ws.on('close', (code, reason) => {
      this.removeConnection(connectionInfo.id, { code, reason });
    });
    
    // 错误事件
    ws.on('error', (error) => {
      connectionInfo.state = 'error';
      this.metrics.errorConnections++;
      this.emit('connectionError', connectionInfo, error);
    });
    
    // Ping/Pong处理
    ws.on('ping', () => {
      connectionInfo.lastPing = new Date();
      ws.pong();
    });
    
    ws.on('pong', () => {
      connectionInfo.lastPong = new Date();
      connectionInfo.isAlive = true;
    });
  }
  
  /**
   * 移除连接
   */
  removeConnection(connectionId, closeInfo = {}) {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) {
      return false;
    }
    
    // 从用户映射中移除
    if (connectionInfo.userId) {
      this.removeUserConnection(connectionInfo.userId, connectionId);
    }
    
    // 从会话映射中移除
    if (connectionInfo.sessionId) {
      this.removeSessionConnection(connectionInfo.sessionId, connectionId);
    }
    
    // 移除连接
    this.connections.delete(connectionId);
    
    // 更新统计
    this.metrics.activeConnections--;
    this.metrics.closedConnections++;
    
    this.emit('connectionRemoved', {
      ...connectionInfo,
      closeInfo,
      closedAt: new Date()
    });
    
    console.log(`❌ Connection removed: ${connectionId} (Remaining: ${this.connections.size})`);
    
    return true;
  }
  
  /**
   * 获取连接信息
   */
  getConnection(connectionId) {
    return this.connections.get(connectionId) || null;
  }
  
  /**
   * 获取用户的所有连接
   */
  getUserConnections(userId) {
    const connectionIds = this.userConnections.get(userId) || new Set();
    return Array.from(connectionIds).map(id => this.connections.get(id)).filter(Boolean);
  }
  
  /**
   * 获取会话的所有连接
   */
  getSessionConnections(sessionId) {
    const connectionIds = this.sessionConnections.get(sessionId) || new Set();
    return Array.from(connectionIds).map(id => this.connections.get(id)).filter(Boolean);
  }
  
  /**
   * 发送消息到指定连接
   */
  sendToConnection(connectionId, message) {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo || connectionInfo.ws.readyState !== 1) {
      return false;
    }
    
    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      connectionInfo.ws.send(messageString);
      connectionInfo.lastActivity = new Date();
      this.metrics.messagesSent++;
      return true;
    } catch (error) {
      this.emit('sendError', connectionInfo, error, message);
      return false;
    }
  }
  
  /**
   * 广播消息到所有连接
   */
  broadcast(message, filter = null) {
    let sentCount = 0;
    
    for (const connectionInfo of this.connections.values()) {
      if (filter && !filter(connectionInfo)) {
        continue;
      }
      
      if (this.sendToConnection(connectionInfo.id, message)) {
        sentCount++;
      }
    }
    
    return sentCount;
  }
  
  /**
   * 添加用户连接映射
   */
  addUserConnection(userId, connectionId) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(connectionId);
  }
  
  /**
   * 移除用户连接映射
   */
  removeUserConnection(userId, connectionId) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }
  
  /**
   * 添加会话连接映射
   */
  addSessionConnection(sessionId, connectionId) {
    if (!this.sessionConnections.has(sessionId)) {
      this.sessionConnections.set(sessionId, new Set());
    }
    this.sessionConnections.get(sessionId).add(connectionId);
  }
  
  /**
   * 移除会话连接映射
   */
  removeSessionConnection(sessionId, connectionId) {
    const connections = this.sessionConnections.get(sessionId);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.sessionConnections.delete(sessionId);
      }
    }
  }
  
  /**
   * 启动定期清理
   */
  startPeriodicCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }
  
  /**
   * 清理无效连接
   */
  cleanup() {
    const now = new Date();
    const timeoutThreshold = now.getTime() - this.options.connectionTimeout;
    const deadConnections = [];
    
    for (const [connectionId, connectionInfo] of this.connections) {
      // 检查连接状态
      if (connectionInfo.ws.readyState === 3) { // CLOSED
        deadConnections.push(connectionId);
        continue;
      }
      
      // 检查超时
      if (connectionInfo.lastActivity.getTime() < timeoutThreshold) {
        connectionInfo.ws.close(1000, 'Connection timeout');
        deadConnections.push(connectionId);
        continue;
      }
    }
    
    // 移除无效连接
    deadConnections.forEach(connectionId => {
      this.removeConnection(connectionId, { reason: 'cleanup' });
    });
    
    if (deadConnections.length > 0) {
      console.log(`🧹 Cleaned up ${deadConnections.length} dead connections`);
    }
  }
  
  /**
   * 获取连接统计
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      activeSessions: this.sessionConnections.size
    };
  }
  
  /**
   * 关闭所有连接
   */
  closeAll(code = 1000, reason = 'Server shutdown') {
    const connectionIds = Array.from(this.connections.keys());
    
    connectionIds.forEach(connectionId => {
      const connectionInfo = this.connections.get(connectionId);
      if (connectionInfo && connectionInfo.ws.readyState === 1) {
        connectionInfo.ws.close(code, reason);
      }
    });
    
    console.log(`🔒 Closed ${connectionIds.length} connections`);
  }
  
  /**
   * 销毁连接池
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.closeAll(1001, 'Server shutdown');
    this.connections.clear();
    this.userConnections.clear();
    this.sessionConnections.clear();
    this.removeAllListeners();
    
    console.log('💥 ConnectionPool destroyed');
  }
}

module.exports = ConnectionPool;