/**
 * WebSocket 管理服务
 * 用于 chat-admin 与后端的实时通信
 */

export interface WebSocketMessage {
  type: string
  data: any
  timestamp?: string
}

export interface WebSocketConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  debug?: boolean
}

type EventCallback = (data: any) => void

export class AdminWebSocketService {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private eventListeners: Map<string, EventCallback[]> = new Map()
  private isManualClose = false
  private isConnected = false

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      debug: false,
      ...config
    }
  }

  /**
   * 连接 WebSocket
   */
  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('WebSocket 已连接')
      return
    }

    this.log('正在连接 WebSocket...')
    this.emit('onConnectionStateChange', 'connecting')

    try {
      // 构建连接URL，包含认证token
      const url = token 
        ? `${this.config.url}?token=${encodeURIComponent(token)}`
        : this.config.url

      this.ws = new WebSocket(url)
      this.setupEventListeners()
    } catch (error) {
      this.log('WebSocket 连接失败:', error)
      this.emit('onConnectionStateChange', 'disconnected')
      this.handleReconnect()
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true
    this.clearTimers()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.isConnected = false
    this.emit('onConnectionStateChange', 'disconnected')
    this.log('WebSocket 已断开')
  }

  /**
   * 发送消息
   */
  send(message: WebSocketMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: new Date().toISOString()
        }
        this.ws.send(JSON.stringify(messageWithTimestamp))
        this.log('发送消息:', messageWithTimestamp)
        return true
      } catch (error) {
        this.log('发送消息失败:', error)
        return false
      }
    } else {
      this.log('WebSocket 未连接，无法发送消息')
      return false
    }
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback?: EventCallback): void {
    if (!this.eventListeners.has(event)) return

    if (callback) {
      const callbacks = this.eventListeners.get(event)!
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    } else {
      this.eventListeners.delete(event)
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): string {
    if (!this.ws) return 'disconnected'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CLOSING:
        return 'disconnecting'
      case WebSocket.CLOSED:
        return 'disconnected'
      default:
        return 'unknown'
    }
  }

  /**
   * 是否已连接
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  private setupEventListeners(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.log('✅ WebSocket 连接已建立')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.emit('onConnectionStateChange', 'connected')
      this.emit('onOpen')
      this.startHeartbeat()

      // 发送认证消息（如果需要）
      this.sendAuthMessage()
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.log('收到消息:', message)
        this.emit('onMessage', message)
        
        // 处理特定类型的消息
        if (message.type) {
          this.emit(`onMessage:${message.type}`, message)
        }
      } catch (error) {
        this.log('解析消息失败:', error)
      }
    }

    this.ws.onclose = (event) => {
      this.log('🔌 WebSocket 连接已关闭', event.code, event.reason)
      this.isConnected = false
      this.clearTimers()
      this.emit('onConnectionStateChange', 'disconnected')
      this.emit('onClose', event)

      if (!this.isManualClose) {
        this.handleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      this.log('❌ WebSocket 错误:', error)
      this.emit('onError', error)
    }
  }

  private sendAuthMessage(): void {
    // 发送管理员认证消息
    const authMessage: WebSocketMessage = {
      type: 'auth',
      data: {
        user_type: 'admin',
        timestamp: new Date().toISOString()
      }
    }
    this.send(authMessage)
  }

  private handleReconnect(): void {
    if (this.isManualClose || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('停止重连')
      return
    }

    this.reconnectAttempts++
    this.log(`🔄 准备重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)
    this.emit('onReconnecting', this.reconnectAttempts)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.config.reconnectInterval)
  }

  private startHeartbeat(): void {
    this.clearHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          data: { timestamp: new Date().toISOString() }
        })
      }
    }, this.config.heartbeatInterval)
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.clearHeartbeat()
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.eventListeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args)
        } catch (error) {
          this.log(`事件回调错误 [${event}]:`, error)
        }
      })
    }
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[AdminWebSocket]', ...args)
    }
  }
}

// 创建全局实例
let adminWebSocketInstance: AdminWebSocketService | null = null

export const createAdminWebSocketService = (config: WebSocketConfig): AdminWebSocketService => {
  if (adminWebSocketInstance) {
    adminWebSocketInstance.disconnect()
  }
  
  adminWebSocketInstance = new AdminWebSocketService(config)
  return adminWebSocketInstance
}

export const getAdminWebSocketService = (): AdminWebSocketService | null => {
  return adminWebSocketInstance
}
