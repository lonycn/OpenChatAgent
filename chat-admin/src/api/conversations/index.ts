/**
 * 会话管理 API
 */
import request from '@/axios'
import type {
  ConversationListParams,
  ConversationResponse,
  ConversationListResponse,
  MessageListResponse,
  SendMessageParams
} from './types'

const API_PREFIX = '/api/v1/admin/conversations'

/**
 * 获取会话列表
 */
export const getConversationList = (params: ConversationListParams) => {
  // 临时返回模拟数据
  return Promise.resolve({
    success: true,
    data: {
      conversations: [
        {
          id: '1',
          customer: {
            id: '1',
            name: '张三',
            email: 'zhangsan@example.com',
            avatar: '',
            source: 'website' as const,
            custom_attributes: { company: '测试公司' },
            created_at: '2024-06-17T10:00:00Z',
            updated_at: '2024-06-17T10:00:00Z'
          },
          status: 'open' as const,
          priority: 'medium' as const,
          current_agent_type: 'ai' as const,
          channel_type: 'web_widget' as const,
          tags: ['新用户'],
          last_message: {
            id: '1',
            conversation_id: '1',
            content: '你好，我需要帮助',
            sender_type: 'customer' as const,
            message_type: 'text' as const,
            created_at: '2024-06-17T10:30:00Z',
            updated_at: '2024-06-17T10:30:00Z'
          },
          unread_count: 2,
          is_starred: false,
          notes: [],
          created_at: '2024-06-17T10:00:00Z',
          updated_at: '2024-06-17T10:30:00Z'
        }
      ],
      total: 1,
      page: 1,
      size: 20,
      total_pages: 1
    }
  })
}

/**
 * 获取会话详情
 */
export const getConversationDetail = (id: string) => {
  return request.get<ConversationResponse>({
    url: `${API_PREFIX}/${id}`
  })
}

/**
 * 获取会话消息列表
 */
export const getConversationMessages = (id: string, params?: { page?: number; size?: number }) => {
  // 临时返回模拟数据
  return Promise.resolve({
    success: true,
    data: {
      messages: [
        {
          id: '1',
          conversation_id: id,
          content: '你好，我需要帮助',
          sender_type: 'customer' as const,
          message_type: 'text' as const,
          created_at: '2024-06-17T10:30:00Z',
          updated_at: '2024-06-17T10:30:00Z'
        },
        {
          id: '2',
          conversation_id: id,
          content: '您好！我是AI助手，很高兴为您服务。请问有什么可以帮助您的吗？',
          sender_type: 'agent' as const,
          message_type: 'text' as const,
          created_at: '2024-06-17T10:31:00Z',
          updated_at: '2024-06-17T10:31:00Z'
        }
      ],
      total: 2,
      page: 1,
      size: 20,
      total_pages: 1
    }
  })
}

/**
 * 发送消息
 */
export const sendMessage = (id: string, data: SendMessageParams) => {
  return request.post({
    url: `${API_PREFIX}/${id}/messages`,
    data
  })
}

/**
 * 接管会话
 */
export const takeoverConversation = (id: string) => {
  return request.post({
    url: `${API_PREFIX}/${id}/takeover`
  })
}

/**
 * 分配会话
 */
export const assignConversation = (id: string, agentId: string) => {
  return request.post({
    url: `${API_PREFIX}/${id}/assign`,
    data: { agent_id: agentId }
  })
}

/**
 * 更新会话状态
 */
export const updateConversationStatus = (id: string, status: string) => {
  return request.put({
    url: `${API_PREFIX}/${id}/status`,
    data: { status }
  })
}

/**
 * 切换代理类型
 */
export const switchAgent = (id: string, agentType: 'ai' | 'human') => {
  return request.post({
    url: `${API_PREFIX}/${id}/switch-agent`,
    data: { agent_type: agentType }
  })
}

/**
 * 添加会话备注
 */
export const addConversationNote = (id: string, note: string) => {
  return request.post({
    url: `${API_PREFIX}/${id}/notes`,
    data: { note }
  })
}

/**
 * 关闭会话
 */
export const closeConversation = (id: string) => {
  return request.post({
    url: `${API_PREFIX}/${id}/close`
  })
}

/**
 * 解决会话
 */
export const resolveConversation = (id: string) => {
  return request.post({
    url: `${API_PREFIX}/${id}/resolve`
  })
}

/**
 * 获取会话统计数据
 */
export const getConversationStats = () => {
  return request.get({
    url: `${API_PREFIX}/stats`
  })
}
