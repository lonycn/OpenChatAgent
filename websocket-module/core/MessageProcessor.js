/**
 * 📨 消息处理器 - 统一的消息路由和处理
 * 
 * 功能:
 * - 标准化消息格式
 * - 消息路由和分发
 * - 异步处理支持
 * - 错误恢复机制
 * - 消息追踪和超时处理
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class MessageProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      messageTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableTracing: true,
      enableMetrics: true,
      ...options
    };
    
    // 消息处理器映射
    this.handlers = new Map();
    
    // 消息追踪
    this.pendingMessages = new Map(); // messageId -> { promise, timeout, retries }
    this.messageHistory = new Map(); // messageId -> messageInfo
    
    // 统计信息
    this.metrics = {
      messagesProcessed: 0,
      messagesSucceeded: 0,
      messagesFailed: 0,
      messagesTimeout: 0,
      averageProcessingTime: 0,
      lastActivity: null
    };
    
    console.log('✅ MessageProcessor initialized');
  }
  
  /**
   * 注册消息处理器
   */
  registerHandler(messageType, handler, options = {}) {
    const handlerInfo = {
      handler,
      timeout: options.timeout || this.options.messageTimeout,
      retries: options.retries || this.options.maxRetries,
      priority: options.priority || 0,
      middleware: options.middleware || [],
      validator: options.validator || null
    };
    
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }
    
    this.handlers.get(messageType).push(handlerInfo);
    
    // 按优先级排序
    this.handlers.get(messageType).sort((a, b) => b.priority - a.priority);
    
    console.log(`📝 Registered handler for message type: ${messageType}`);
    
    return this;
  }
  
  /**
   * 处理传入消息
   */
  async processMessage(connectionInfo, rawMessage) {
    const startTime = Date.now();
    let message;
    
    try {
      // 解析消息
      message = this.parseMessage(rawMessage);
      
      // 验证消息格式
      this.validateMessage(message);
      
      // 添加处理元数据
      message.connectionId = connectionInfo.id;
      message.userId = connectionInfo.userId;
      message.sessionId = connectionInfo.sessionId;
      message.receivedAt = new Date().toISOString();
      
      // 记录消息历史
      if (this.options.enableTracing) {
        this.recordMessage(message, connectionInfo);
      }
      
      // 处理消息
      const result = await this.handleMessage(message, connectionInfo);
      
      // 更新统计
      this.updateMetrics(startTime, true);
      
      this.emit('messageProcessed', {
        message,
        result,
        connectionInfo,
        processingTime: Date.now() - startTime
      });
      
      return result;
      
    } catch (error) {
      this.updateMetrics(startTime, false);
      
      this.emit('messageError', {
        message,
        error,
        connectionInfo,
        processingTime: Date.now() - startTime
      });
      
      // 发送错误响应
      await this.sendErrorResponse(connectionInfo, message, error);
      
      throw error;
    }
  }
  
  /**
   * 解析消息
   */
  parseMessage(rawMessage) {
    try {
      if (typeof rawMessage === 'string') {
        return JSON.parse(rawMessage);
      }
      return rawMessage;
    } catch (error) {
      throw new Error(`Invalid message format: ${error.message}`);
    }
  }
  
  /**
   * 验证消息格式
   */
  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      throw new Error('Message must be an object');
    }
    
    if (!message.type) {
      throw new Error('Message type is required');
    }
    
    if (!message.id) {
      message.id = uuidv4();
    }
    
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    
    return true;
  }
  
  /**
   * 处理消息
   */
  async handleMessage(message, connectionInfo) {
    const handlers = this.handlers.get(message.type);
    
    if (!handlers || handlers.length === 0) {
      throw new Error(`No handler found for message type: ${message.type}`);
    }
    
    // 使用第一个匹配的处理器（按优先级排序）
    const handlerInfo = handlers[0];
    
    // 应用中间件
    for (const middleware of handlerInfo.middleware) {
      await middleware(message, connectionInfo);
    }
    
    // 验证消息（如果有验证器）
    if (handlerInfo.validator) {
      const validationResult = handlerInfo.validator(message);
      if (!validationResult.valid) {
        throw new Error(`Message validation failed: ${validationResult.error}`);
      }
    }
    
    // 执行处理器
    const result = await this.executeHandler(handlerInfo, message, connectionInfo);
    
    return result;
  }
  
  /**
   * 执行处理器
   */
  async executeHandler(handlerInfo, message, connectionInfo) {
    const { handler, timeout, retries } = handlerInfo;
    
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 创建超时Promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Handler timeout after ${timeout}ms`));
          }, timeout);
        });
        
        // 执行处理器
        const handlerPromise = handler(message, connectionInfo);
        
        // 等待结果或超时
        const result = await Promise.race([handlerPromise, timeoutPromise]);
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        if (attempt < retries) {
          console.warn(`Handler failed, retrying (${attempt + 1}/${retries}):`, error.message);
          await this.delay(this.options.retryDelay * Math.pow(2, attempt)); // 指数退避
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * 发送消息
   */
  async sendMessage(connectionInfo, message, options = {}) {
    try {
      // 标准化消息格式
      const standardMessage = this.standardizeMessage(message);
      
      // 记录发送的消息
      if (this.options.enableTracing) {
        this.recordMessage(standardMessage, connectionInfo, 'sent');
      }
      
      // 发送消息
      const success = connectionInfo.ws && connectionInfo.ws.readyState === 1;
      if (success) {
        connectionInfo.ws.send(JSON.stringify(standardMessage));
        
        this.emit('messageSent', {
          message: standardMessage,
          connectionInfo
        });
        
        return true;
      } else {
        throw new Error('Connection not available');
      }
      
    } catch (error) {
      this.emit('sendError', {
        message,
        connectionInfo,
        error
      });
      
      throw error;
    }
  }
  
  /**
   * 标准化消息格式
   */
  standardizeMessage(message) {
    return {
      id: message.id || uuidv4(),
      type: message.type || 'response',
      from: message.from || 'system',
      to: message.to || 'user',
      content: message.content || message.text || message.data || {},
      timestamp: message.timestamp || new Date().toISOString(),
      metadata: message.metadata || {}
    };
  }
  
  /**
   * 发送错误响应
   */
  async sendErrorResponse(connectionInfo, originalMessage, error) {
    const errorMessage = {
      id: uuidv4(),
      type: 'error',
      from: 'system',
      to: 'user',
      content: {
        error: error.message,
        code: error.code || 'PROCESSING_ERROR',
        originalMessageId: originalMessage?.id
      },
      timestamp: new Date().toISOString()
    };
    
    try {
      await this.sendMessage(connectionInfo, errorMessage);
    } catch (sendError) {
      console.error('Failed to send error response:', sendError);
    }
  }
  
  /**
   * 记录消息
   */
  recordMessage(message, connectionInfo, direction = 'received') {
    const messageRecord = {
      id: message.id,
      type: message.type,
      direction,
      connectionId: connectionInfo.id,
      userId: connectionInfo.userId,
      sessionId: connectionInfo.sessionId,
      timestamp: new Date().toISOString(),
      size: JSON.stringify(message).length
    };
    
    this.messageHistory.set(message.id, messageRecord);
    
    // 限制历史记录大小
    if (this.messageHistory.size > 10000) {
      const oldestKey = this.messageHistory.keys().next().value;
      this.messageHistory.delete(oldestKey);
    }
  }
  
  /**
   * 更新统计信息
   */
  updateMetrics(startTime, success) {
    const processingTime = Date.now() - startTime;
    
    this.metrics.messagesProcessed++;
    
    if (success) {
      this.metrics.messagesSucceeded++;
    } else {
      this.metrics.messagesFailed++;
    }
    
    // 更新平均处理时间
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.messagesProcessed - 1) + processingTime) / 
      this.metrics.messagesProcessed;
    
    this.metrics.lastActivity = new Date();
  }
  
  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 获取消息历史
   */
  getMessageHistory(filter = {}) {
    const messages = Array.from(this.messageHistory.values());
    
    if (filter.connectionId) {
      return messages.filter(msg => msg.connectionId === filter.connectionId);
    }
    
    if (filter.userId) {
      return messages.filter(msg => msg.userId === filter.userId);
    }
    
    if (filter.sessionId) {
      return messages.filter(msg => msg.sessionId === filter.sessionId);
    }
    
    return messages;
  }
  
  /**
   * 获取统计信息
   */
  getMetrics() {
    return {
      ...this.metrics,
      registeredHandlers: this.handlers.size,
      pendingMessages: this.pendingMessages.size,
      messageHistorySize: this.messageHistory.size
    };
  }
  
  /**
   * 清理资源
   */
  cleanup() {
    // 清理待处理消息
    for (const [messageId, pendingInfo] of this.pendingMessages) {
      if (pendingInfo.timeout) {
        clearTimeout(pendingInfo.timeout);
      }
    }
    
    this.pendingMessages.clear();
    this.messageHistory.clear();
    this.removeAllListeners();
    
    console.log('🧹 MessageProcessor cleaned up');
  }
}

module.exports = MessageProcessor;