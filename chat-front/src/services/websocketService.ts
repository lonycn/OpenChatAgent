import { WebSocketMessage, WebSocketConfig, ConnectionStatus } from '../types';

type EventCallback = (...args: any[]) => void;

/**
 * WebSocket 服务类
 * 提供完整的 WebSocket 连接管理、重连、心跳检测等功能
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private isManualClose = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      maxReconnectAttempts: 5,
      reconnectInterval: 2000,
      heartbeatInterval: 30000,
      enableReconnect: true,
      debug: false,
      ...config,
    };
  }

  /**
   * 连接 WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('WebSocket 已连接');
      return;
    }

    this.log('正在连接 WebSocket...');
    this.emit('onConnectionStateChange', 'connecting');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventListeners();
    } catch (error) {
      this.log('WebSocket 连接失败:', error);
      this.emit('onConnectionStateChange', 'disconnected');
      this.handleReconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.emit('onConnectionStateChange', 'disconnected');
    this.log('WebSocket 已断开');
  }

  /**
   * 发送消息
   */
  send(message: WebSocketMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.log('发送消息:', message);
        return true;
      } catch (error) {
        this.log('发送消息失败:', error);
        this.messageQueue.push(message);
        return false;
      }
    } else {
      this.log('WebSocket 未连接，消息已加入队列');
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * 重置连接
   */
  reset(): void {
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.clearTimers();
    this.disconnect();
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          this.log('事件回调执行失败:', error);
        }
      });
    }
  }

  /**
   * 设置 WebSocket 事件监听器
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('WebSocket 连接已建立');
      this.reconnectAttempts = 0;
      this.emit('onConnectionStateChange', 'connected');
      this.emit('onOpen');
      this.startHeartbeat();
      this.processMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.log('收到消息:', data);
        
        // 处理心跳响应
        if (data.type === 'pong') {
          this.log('收到心跳响应');
          return;
        }
        
        this.emit('onMessage', data);
      } catch (error) {
        this.log('解析消息失败:', error);
      }
    };

    this.ws.onclose = (event) => {
      this.log('WebSocket 连接关闭:', event.code, event.reason);
      this.clearTimers();
      this.emit('onConnectionStateChange', 'disconnected');
      this.emit('onClose', event);
      
      if (!this.isManualClose && this.config.enableReconnect) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.log('WebSocket 错误:', error);
      this.emit('onError', error);
    };
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('重连次数已达上限，停止重连');
      return;
    }

    this.reconnectAttempts++;
    this.log(`准备第 ${this.reconnectAttempts} 次重连...`);
    this.emit('onConnectionStateChange', 'reconnecting');
    this.emit('onReconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.log(`开始第 ${this.reconnectAttempts} 次重连`);
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: new Date().toISOString() });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 处理消息队列
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * 清理定时器
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 日志输出
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocketService]', ...args);
    }
  }
}

/**
 * 创建 WebSocket 服务实例
 */
export function createWebSocketService(config: WebSocketConfig): WebSocketService {
  return new WebSocketService(config);
} 