/**
 * 管理员 WebSocket 连接管理
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { createAdminWebSocketService, getAdminWebSocketService, type WebSocketMessage } from '@/utils/websocket'
import { useUserStore } from '@/store/modules/user'

export interface ConversationNotification {
  type: 'handover_request' | 'new_message' | 'conversation_update'
  conversation_id: string
  message?: string
  data?: any
}

export const useAdminWebSocket = () => {
  const userStore = useUserStore()
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const isConnected = ref(false)
  const notifications = ref<ConversationNotification[]>([])

  // WebSocket 配置
  const wsConfig = {
    url: 'ws://localhost:8000/ws/admin', // 管理员专用 WebSocket 端点
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    debug: true
  }

  /**
   * 初始化 WebSocket 连接
   */
  const initWebSocket = () => {
    const wsService = createAdminWebSocketService(wsConfig)

    // 监听连接状态变化
    wsService.on('onConnectionStateChange', (state: string) => {
      connectionStatus.value = state as any
      isConnected.value = state === 'connected'
      
      if (state === 'connected') {
        ElMessage.success('WebSocket 连接成功')
      } else if (state === 'disconnected') {
        ElMessage.warning('WebSocket 连接断开')
      }
    })

    // 监听消息接收
    wsService.on('onMessage', handleWebSocketMessage)

    // 监听连接打开
    wsService.on('onOpen', () => {
      console.log('✅ 管理员 WebSocket 连接已建立')
    })

    // 监听连接关闭
    wsService.on('onClose', () => {
      console.log('🔌 管理员 WebSocket 连接已关闭')
    })

    // 监听重连
    wsService.on('onReconnecting', (attempt: number) => {
      console.log(`🔄 正在重连... (${attempt})`)
    })

    // 监听错误
    wsService.on('onError', (error: any) => {
      console.error('❌ WebSocket 错误:', error)
      ElMessage.error('WebSocket 连接错误')
    })

    // 开始连接
    const token = userStore.getToken
    wsService.connect(token)

    return wsService
  }

  /**
   * 处理 WebSocket 消息
   */
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    console.log('收到管理员消息:', message)

    switch (message.type) {
      case 'notification':
        handleNotification(message.data)
        break
      case 'conversation_update':
        handleConversationUpdate(message.data)
        break
      case 'new_message':
        handleNewMessage(message.data)
        break
      case 'handover_request':
        handleHandoverRequest(message.data)
        break
      case 'pong':
        // 心跳响应，无需处理
        break
      default:
        console.log('未处理的消息类型:', message.type)
    }
  }

  /**
   * 处理通知消息
   */
  const handleNotification = (data: any) => {
    const notification: ConversationNotification = {
      type: data.event || 'conversation_update',
      conversation_id: data.conversation_id,
      message: data.message,
      data
    }

    notifications.value.unshift(notification)

    // 显示系统通知
    ElNotification({
      title: '新通知',
      message: data.message || '有新的对话更新',
      type: 'info',
      duration: 5000
    })
  }

  /**
   * 处理对话更新
   */
  const handleConversationUpdate = (data: any) => {
    // 触发对话列表刷新
    window.dispatchEvent(new CustomEvent('conversation-updated', { detail: data }))
  }

  /**
   * 处理新消息
   */
  const handleNewMessage = (data: any) => {
    // 触发消息列表刷新
    window.dispatchEvent(new CustomEvent('new-message', { detail: data }))
    
    // 显示新消息通知
    ElNotification({
      title: '新消息',
      message: `来自 ${data.sender_name || '客户'} 的新消息`,
      type: 'info',
      duration: 3000
    })
  }

  /**
   * 处理转人工请求
   */
  const handleHandoverRequest = (data: any) => {
    const notification: ConversationNotification = {
      type: 'handover_request',
      conversation_id: data.conversation_id,
      message: '有新的转人工请求',
      data
    }

    notifications.value.unshift(notification)

    // 显示重要通知
    ElNotification({
      title: '转人工请求',
      message: '有客户请求转人工服务，请及时处理',
      type: 'warning',
      duration: 0, // 不自动关闭
      showClose: true
    })

    // 触发对话列表刷新
    window.dispatchEvent(new CustomEvent('handover-request', { detail: data }))
  }

  /**
   * 发送消息到 WebSocket
   */
  const sendMessage = (message: WebSocketMessage): boolean => {
    const wsService = getAdminWebSocketService()
    if (wsService && wsService.isWebSocketConnected()) {
      return wsService.send(message)
    }
    return false
  }

  /**
   * 接管对话
   */
  const takeoverConversation = (conversationId: string) => {
    const message: WebSocketMessage = {
      type: 'admin_action',
      data: {
        action: 'takeover',
        conversation_id: conversationId,
        admin_id: userStore.getUserInfo?.id
      }
    }
    return sendMessage(message)
  }

  /**
   * 发送管理员消息
   */
  const sendAdminMessage = (conversationId: string, content: string) => {
    const message: WebSocketMessage = {
      type: 'admin_message',
      data: {
        conversation_id: conversationId,
        content,
        sender_id: userStore.getUserInfo?.id,
        sender_name: userStore.getUserInfo?.name || '管理员'
      }
    }
    return sendMessage(message)
  }

  /**
   * 切换代理类型
   */
  const switchAgentType = (conversationId: string, agentType: 'ai' | 'human') => {
    const message: WebSocketMessage = {
      type: 'admin_action',
      data: {
        action: 'switch_agent',
        conversation_id: conversationId,
        agent_type: agentType,
        admin_id: userStore.getUserInfo?.id
      }
    }
    return sendMessage(message)
  }

  /**
   * 清除通知
   */
  const clearNotification = (index: number) => {
    notifications.value.splice(index, 1)
  }

  /**
   * 清除所有通知
   */
  const clearAllNotifications = () => {
    notifications.value = []
  }

  /**
   * 断开连接
   */
  const disconnect = () => {
    const wsService = getAdminWebSocketService()
    if (wsService) {
      wsService.disconnect()
    }
  }

  /**
   * 重新连接
   */
  const reconnect = () => {
    disconnect()
    setTimeout(() => {
      initWebSocket()
    }, 1000)
  }

  // 组件挂载时初始化
  onMounted(() => {
    initWebSocket()
  })

  // 组件卸载时断开连接
  onUnmounted(() => {
    disconnect()
  })

  return {
    connectionStatus,
    isConnected,
    notifications,
    sendMessage,
    takeoverConversation,
    sendAdminMessage,
    switchAgentType,
    clearNotification,
    clearAllNotifications,
    disconnect,
    reconnect
  }
}
