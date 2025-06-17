/**
 * 客户管理相关类型定义
 */

// 客户来源
export type CustomerSource = 'website' | 'mobile' | 'api' | 'social' | 'email'

// 客户状态
export type CustomerStatus = 'active' | 'inactive' | 'blocked'

// 客户信息
export interface Customer {
  id: string
  name: string
  email: string
  avatar?: string
  source: CustomerSource
  status?: CustomerStatus
  custom_attributes?: Record<string, any>
  conversation_count?: number
  active_conversations?: number
  last_seen_at?: string
  created_at: string
  updated_at: string
}

// 客户列表查询参数
export interface CustomerListParams {
  keyword?: string
  source?: CustomerSource | ''
  status?: CustomerStatus | ''
  page?: number
  size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// 客户列表响应
export interface CustomerListResponse {
  customers: Customer[]
  total: number
  page: number
  size: number
  total_pages: number
}

// 客户详情响应
export interface CustomerResponse {
  customer: Customer
}

// 创建客户参数
export interface CreateCustomerParams {
  name: string
  email: string
  source: CustomerSource
  avatar?: string
  custom_attributes?: Record<string, any>
}

// 更新客户参数
export interface UpdateCustomerParams {
  name?: string
  email?: string
  source?: CustomerSource
  avatar?: string
  status?: CustomerStatus
  custom_attributes?: Record<string, any>
}

// 客户备注
export interface CustomerNote {
  id: string
  customer_id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

// 客户统计
export interface CustomerStats {
  total_customers: number
  new_customers_today: number
  active_customers: number
  blocked_customers: number
  customers_by_source: Record<CustomerSource, number>
}

// 客户会话统计
export interface CustomerConversationStats {
  total_conversations: number
  active_conversations: number
  resolved_conversations: number
  avg_response_time: number
  satisfaction_score?: number
}
