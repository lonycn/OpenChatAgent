/**
 * 会话管理相关类型定义
 */

// 消息类型
export interface Message {
  id: string
  conversation_id: string
  content: string
  sender_type: 'customer' | 'agent' | 'system'
  sender_id?: string
  message_type: 'text' | 'image' | 'file' | 'system'
  attachments?: Attachment[]
  created_at: string
  updated_at: string
}

// 附件类型
export interface Attachment {
  id: string
  filename: string
  file_type: string
  file_size: number
  file_url: string
}

// 客户信息
export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  avatar?: string
  location?: string
  source: 'website' | 'mobile' | 'social' | 'api'
  custom_attributes: Record<string, any>
  created_at: string
  updated_at: string
}

// 客服信息
export interface Agent {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'agent' | 'supervisor' | 'admin'
  status: 'online' | 'offline' | 'busy'
  created_at: string
  updated_at: string
}

// 会话信息
export interface Conversation {
  id: string
  customer: Customer
  assigned_agent?: Agent
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  current_agent_type: 'ai' | 'human'
  channel_type: 'web_widget' | 'mobile_app' | 'social_media' | 'api'
  tags: string[]
  last_message?: Message
  unread_count: number
  is_starred: boolean
  notes: string[]
  created_at: string
  updated_at: string
  messages?: Message[]
}

// 会话列表查询参数
export interface ConversationListParams {
  page?: number
  size?: number
  status?: string
  assignee_id?: string
  priority?: string
  channel_type?: string
  current_agent_type?: string
  search?: string
  start_date?: string
  end_date?: string
}

// 会话列表响应
export interface ConversationListResponse {
  success: boolean
  data: {
    conversations: Conversation[]
    total: number
    page: number
    size: number
    total_pages: number
  }
  message?: string
}

// 会话详情响应
export interface ConversationResponse {
  success: boolean
  data: Conversation
  message?: string
}

// 消息列表响应
export interface MessageListResponse {
  success: boolean
  data: {
    messages: Message[]
    total: number
    page: number
    size: number
    total_pages: number
  }
  message?: string
}

// 发送消息参数
export interface SendMessageParams {
  content: string
  message_type?: 'text' | 'image' | 'file'
  attachments?: File[]
}

// 会话统计数据
export interface ConversationStats {
  total_conversations: number
  active_conversations: number
  ai_handled: number
  human_handled: number
  avg_response_time: number
  today_conversations: number
  resolution_rate: number
  customer_satisfaction: number
}
