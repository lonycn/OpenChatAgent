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
  return request.get<ConversationListResponse>({
    url: API_PREFIX,
    params
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
  return request.get<MessageListResponse>({
    url: `${API_PREFIX}/${id}/messages`,
    params
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
