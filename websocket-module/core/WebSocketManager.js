/**
 * 🎛️ WebSocket管理器 - 核心控制中心
 * 
 * 功能:
 * - 统一的WebSocket服务管理
 * - 组件协调和生命周期管理
 * - 插件系统支持
 * - 配置管理和热更新
 */

const WebSocket = require('ws');
const EventBus = require('./EventBus');
const ConnectionPool = require('./ConnectionPool');
const MessageProcessor = require('./MessageProcessor');

class WebSocketManager {
  constructor(options = {}) {
    this.options = {
      server: null,
      port: null,
      host: '0.0.0.0',
      path: '/ws',
      maxConnections: 1000,
      heartbeat: {
        interval: 30000,
        timeout: 5000
      },
      message: {
        timeout: 30000,
        maxRetries: 3
      },
      plugins: [],
      middleware: [],
      ...options
    };
    
    // 核心组件
    this.eventBus = new EventBus({
      maxListeners: 200,
      errorIsolation: true,
      enableMetrics: true
    });
    
    this.connectionPool = new ConnectionPool({
      maxConnections: this.options.maxConnections,
      heartbeatInterval: this.options.heartbeat.interval,
      enableMetrics: true
    });
    
    this.messageProcessor = new MessageProcessor({
      messageTimeout: this.options.message.timeout,
      maxRetries: this.options.message.maxRetries,
      enableTracing: true,
      enableMetrics: true
    });
    
    // WebSocket服务器
    this.wss = null;
    this.isRunning = false;
    
    // 插件管理
    this.plugins = new Map();
    
    // 中间件
    this.middleware = [];
    
    // 统计信息
    this.metrics = {
      startTime: null,
      uptime: 0,
      totalConnections: 0,
      totalMessages: 0,
      errors: 0
    };
    
    // 初始化
    this.initialize();
    
    console.log('✅ WebSocketManager initialized');
  }
  
  /**
   * 初始化管理器
   */
  initialize() {
    // 设置组件间通信
    this.setupComponentCommunication();
    
    // 加载中间件
    this.loadMiddleware();
    
    // 加载插件
    this.loadPlugins();
    
    // 设置错误处理
    this.setupErrorHandling();
  }
  
  /**
   * 设置组件间通信
   */
  setupComponentCommunication() {
    // 连接池事件
    this.connectionPool.on('connectionAdded', (connectionInfo) => {
      this.eventBus.publish('connection:added', connectionInfo);
      this.metrics.totalConnections++;
    });
    
    this.connectionPool.on('connectionRemoved', (connectionInfo) => {
      this.eventBus.publish('connection:removed', connectionInfo);
    });
    
    this.connectionPool.on('message', async (connectionInfo, rawMessage) => {
      try {
        await this.messageProcessor.processMessage(connectionInfo, rawMessage);
        this.metrics.totalMessages++;
      } catch (error) {
        this.eventBus.publish('message:error', { connectionInfo, error, rawMessage });
        this.metrics.errors++;
      }
    });
    
    this.connectionPool.on('connectionError', (connectionInfo, error) => {
      this.eventBus.publish('connection:error', { connectionInfo, error });
      this.metrics.errors++;
    });
    
    // 消息处理器事件
    this.messageProcessor.on('messageProcessed', (data) => {
      this.eventBus.publish('message:processed', data);
    });
    
    this.messageProcessor.on('messageError', (data) => {
      this.eventBus.publish('message:error', data);
    });
    
    this.messageProcessor.on('messageSent', (data) => {
      this.eventBus.publish('message:sent', data);
    });
  }
  
  /**
   * 启动WebSocket服务器
   */
  async start() {
    if (this.isRunning) {
      throw new Error('WebSocket server is already running');
    }
    
    try {
      // 创建WebSocket服务器
      const serverOptions = {
        path: this.options.path,
        maxPayload: 16 * 1024 * 1024, // 16MB
        perMessageDeflate: {
          zlibDeflateOptions: {
            level: 3
          }
        }
      };
      
      if (this.options.server) {
        serverOptions.server = this.options.server;
      } else if (this.options.port) {
        serverOptions.port = this.options.port;
        serverOptions.host = this.options.host;
      } else {
        throw new Error('Either server instance or port must be provided');
      }
      
      this.wss = new WebSocket.Server(serverOptions);
      
      // 设置连接处理
      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });
      
      this.wss.on('error', (error) => {
        this.eventBus.publish('server:error', error);
        console.error('WebSocket Server Error:', error);
      });
      
      this.isRunning = true;
      this.metrics.startTime = new Date();
      
      // 启动心跳
      this.startHeartbeat();
      
      this.eventBus.publish('server:started', {
        options: this.options,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🚀 WebSocket server started on ${this.getServerAddress()}`);
      
    } catch (error) {
      this.eventBus.publish('server:startError', error);
      throw error;
    }
  }
  
  /**
   * 处理新连接
   */
  async handleConnection(ws, req) {
    try {
      // 提取连接元数据
      const metadata = {
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        origin: req.headers.origin,
        url: req.url,
        timestamp: new Date().toISOString()
      };
      
      // 应用连接中间件
      for (const middleware of this.middleware) {
        if (middleware.type === 'connection') {
          const result = await middleware.handler(ws, req, metadata);
          if (result === false) {
            ws.close(1008, 'Connection rejected by middleware');
            return;
          }
          if (result && typeof result === 'object') {
            Object.assign(metadata, result);
          }
        }
      }
      
      // 添加到连接池
      const connectionInfo = this.connectionPool.addConnection(ws, metadata);
      
      if (!connectionInfo) {
        console.warn('Failed to add connection to pool');
        return;
      }
      
      console.log(`🔗 New connection: ${connectionInfo.id} from ${metadata.ip}`);
      
    } catch (error) {
      console.error('Error handling connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }
  
  /**
   * 注册消息处理器
   */
  registerHandler(messageType, handler, options = {}) {
    return this.messageProcessor.registerHandler(messageType, handler, options);
  }
  
  /**
   * 注册中间件
   */
  use(middleware) {
    if (typeof middleware === 'function') {
      this.middleware.push({
        type: 'message',
        handler: middleware
      });
    } else if (middleware && typeof middleware.handler === 'function') {
      this.middleware.push(middleware);
    } else {
      throw new Error('Invalid middleware format');
    }
    
    return this;
  }
  
  /**
   * 发送消息到指定连接
   */
  async sendMessage(connectionId, message) {
    const connectionInfo = this.connectionPool.getConnection(connectionId);
    if (!connectionInfo) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    
    return await this.messageProcessor.sendMessage(connectionInfo, message);
  }
  
  /**
   * 发送消息到用户的所有连接
   */
  async sendToUser(userId, message) {
    const connections = this.connectionPool.getUserConnections(userId);
    const results = [];
    
    for (const connectionInfo of connections) {
      try {
        await this.messageProcessor.sendMessage(connectionInfo, message);
        results.push({ connectionId: connectionInfo.id, success: true });
      } catch (error) {
        results.push({ connectionId: connectionInfo.id, success: false, error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * 广播消息
   */
  broadcast(message, filter = null) {
    return this.connectionPool.broadcast(message, filter);
  }
  
  /**
   * 监听事件
   */
  on(event, handler, options = {}) {
    return this.eventBus.register(event, handler, options);
  }
  
  /**
   * 发布事件
   */
  emit(event, ...args) {
    return this.eventBus.publish(event, ...args);
  }
  
  /**
   * 加载插件
   */
  loadPlugins() {
    for (const pluginName of this.options.plugins) {
      try {
        const Plugin = require(`../plugins/${pluginName}`);
        const plugin = new Plugin(this, this.eventBus);
        this.plugins.set(pluginName, plugin);
        console.log(`🔌 Plugin loaded: ${pluginName}`);
      } catch (error) {
        console.error(`Failed to load plugin ${pluginName}:`, error.message);
      }
    }
  }
  
  /**
   * 加载中间件
   */
  loadMiddleware() {
    for (const middlewareName of this.options.middleware) {
      try {
        const middleware = require(`../middleware/${middlewareName}`);
        this.use(middleware);
        console.log(`🔧 Middleware loaded: ${middlewareName}`);
      } catch (error) {
        console.error(`Failed to load middleware ${middlewareName}:`, error.message);
      }
    }
  }
  
  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    this.eventBus.on('handlerError', (errorInfo) => {
      console.error('Handler Error:', errorInfo);
      this.metrics.errors++;
    });
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.eventBus.publish('system:uncaughtException', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection:', reason);
      this.eventBus.publish('system:unhandledRejection', { reason, promise });
    });
  }
  
  /**
   * 启动心跳
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.connectionPool.broadcast({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, this.options.heartbeat.interval);
  }
  
  /**
   * 获取服务器地址
   */
  getServerAddress() {
    if (this.options.server) {
      const address = this.options.server.address();
      return `${address.address}:${address.port}${this.options.path}`;
    } else {
      return `${this.options.host}:${this.options.port}${this.options.path}`;
    }
  }
  
  /**
   * 获取统计信息
   */
  getMetrics() {
    const now = new Date();
    this.metrics.uptime = this.metrics.startTime ? now - this.metrics.startTime : 0;
    
    return {
      server: this.metrics,
      connections: this.connectionPool.getMetrics(),
      messages: this.messageProcessor.getMetrics(),
      events: this.eventBus.getMetrics(),
      plugins: Array.from(this.plugins.keys())
    };
  }
  
  /**
   * 获取健康状态
   */
  getHealth() {
    const metrics = this.getMetrics();
    
    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      uptime: metrics.server.uptime,
      connections: {
        active: metrics.connections.activeConnections,
        total: metrics.connections.totalConnections
      },
      messages: {
        processed: metrics.messages.messagesProcessed,
        succeeded: metrics.messages.messagesSucceeded,
        failed: metrics.messages.messagesFailed
      },
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 停止服务器
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }
    
    console.log('🛑 Stopping WebSocket server...');
    
    // 停止心跳
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // 关闭所有连接
    this.connectionPool.closeAll(1001, 'Server shutdown');
    
    // 关闭服务器
    if (this.wss) {
      this.wss.close();
    }
    
    // 清理组件
    this.connectionPool.destroy();
    this.messageProcessor.cleanup();
    this.eventBus.cleanup();
    
    this.isRunning = false;
    
    this.eventBus.publish('server:stopped', {
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ WebSocket server stopped');
  }
}

module.exports = WebSocketManager;