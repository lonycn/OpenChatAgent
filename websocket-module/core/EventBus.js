/**
 * 🚌 事件总线 - WebSocket模块核心通信组件
 * 
 * 功能:
 * - 解耦组件间通信
 * - 支持异步事件处理
 * - 提供事件优先级和过滤
 * - 错误隔离和恢复
 */

const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxListeners: 100,
      errorIsolation: true,
      enableMetrics: true,
      ...options
    };
    
    // 设置最大监听器数量
    this.setMaxListeners(this.options.maxListeners);
    
    // 事件统计
    this.metrics = {
      eventsEmitted: 0,
      eventsHandled: 0,
      errors: 0,
      lastActivity: null
    };
    
    // 事件处理器映射
    this.handlers = new Map();
    
    // 错误处理
    if (this.options.errorIsolation) {
      this.setupErrorIsolation();
    }
    
    console.log('✅ EventBus initialized');
  }
  
  /**
   * 注册事件处理器
   */
  register(event, handler, options = {}) {
    const handlerInfo = {
      handler,
      priority: options.priority || 0,
      once: options.once || false,
      filter: options.filter || null,
      timeout: options.timeout || null
    };
    
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    
    this.handlers.get(event).push(handlerInfo);
    
    // 按优先级排序
    this.handlers.get(event).sort((a, b) => b.priority - a.priority);
    
    // 注册到EventEmitter
    if (handlerInfo.once) {
      this.once(event, this.createWrappedHandler(event, handlerInfo));
    } else {
      this.on(event, this.createWrappedHandler(event, handlerInfo));
    }
    
    return this;
  }
  
  /**
   * 创建包装的处理器
   */
  createWrappedHandler(event, handlerInfo) {
    return async (...args) => {
      try {
        // 应用过滤器
        if (handlerInfo.filter && !handlerInfo.filter(...args)) {
          return;
        }
        
        // 超时处理
        if (handlerInfo.timeout) {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Handler timeout for event: ${event}`)), handlerInfo.timeout);
          });
          
          await Promise.race([
            handlerInfo.handler(...args),
            timeoutPromise
          ]);
        } else {
          await handlerInfo.handler(...args);
        }
        
        this.metrics.eventsHandled++;
        
      } catch (error) {
        this.metrics.errors++;
        this.handleError(error, event, args);
      }
    };
  }
  
  /**
   * 发布事件
   */
  publish(event, ...args) {
    this.metrics.eventsEmitted++;
    this.metrics.lastActivity = new Date();
    
    // 添加事件元数据
    const eventData = {
      event,
      timestamp: new Date().toISOString(),
      args
    };
    
    this.emit(event, ...args, eventData);
    
    return this;
  }
  
  /**
   * 异步发布事件
   */
  async publishAsync(event, ...args) {
    return new Promise((resolve, reject) => {
      try {
        this.publish(event, ...args);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 取消注册事件处理器
   */
  unregister(event, handler) {
    if (this.handlers.has(event)) {
      const handlers = this.handlers.get(event);
      const index = handlers.findIndex(h => h.handler === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.removeListener(event, handler);
      }
    }
    return this;
  }
  
  /**
   * 设置错误隔离
   */
  setupErrorIsolation() {
    this.on('error', (error) => {
      console.error('EventBus Error:', error);
      this.metrics.errors++;
    });
  }
  
  /**
   * 处理错误
   */
  handleError(error, event, args) {
    if (this.options.errorIsolation) {
      // 发布错误事件，但不影响其他处理器
      setImmediate(() => {
        this.emit('handlerError', {
          error,
          event,
          args,
          timestamp: new Date().toISOString()
        });
      });
    } else {
      throw error;
    }
  }
  
  /**
   * 获取事件统计
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeEvents: this.handlers.size,
      totalListeners: this.listenerCount()
    };
  }
  
  /**
   * 清理资源
   */
  cleanup() {
    this.removeAllListeners();
    this.handlers.clear();
    console.log('🧹 EventBus cleaned up');
  }
}

module.exports = EventBus;