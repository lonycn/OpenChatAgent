import request from '@/axios'
import type {
  CustomerListParams,
  CustomerListResponse,
  CustomerResponse,
  CreateCustomerParams,
  UpdateCustomerParams
} from './types'

const API_PREFIX = '/api/v1/admin/customers'

// 获取客户列表
export const getCustomerList = (params: CustomerListParams) => {
  // 临时返回模拟数据
  return Promise.resolve({
    success: true,
    data: {
      customers: [
        {
          id: '1',
          name: '张三',
          email: 'zhangsan@example.com',
          avatar: '',
          source: 'website' as const,
          custom_attributes: {
            company: '测试公司',
            phone: '13800138000'
          },
          conversation_count: 5,
          active_conversations: 1,
          last_seen_at: '2024-06-17T10:30:00Z',
          created_at: '2024-06-17T09:00:00Z',
          updated_at: '2024-06-17T10:30:00Z'
        },
        {
          id: '2',
          name: '李四',
          email: 'lisi@example.com',
          avatar: '',
          source: 'mobile' as const,
          custom_attributes: {
            company: '科技公司',
            vip_level: 'gold'
          },
          conversation_count: 12,
          active_conversations: 2,
          last_seen_at: '2024-06-17T11:00:00Z',
          created_at: '2024-06-16T14:00:00Z',
          updated_at: '2024-06-17T11:00:00Z'
        },
        {
          id: '3',
          name: '王五',
          email: 'wangwu@example.com',
          avatar: '',
          source: 'api' as const,
          custom_attributes: {
            department: '技术部',
            priority: 'high'
          },
          conversation_count: 8,
          active_conversations: 0,
          last_seen_at: '2024-06-16T16:30:00Z',
          created_at: '2024-06-15T10:00:00Z',
          updated_at: '2024-06-16T16:30:00Z'
        },
        {
          id: '4',
          name: '赵六',
          email: 'zhaoliu@example.com',
          avatar: '',
          source: 'website' as const,
          custom_attributes: {
            region: '华南',
            industry: '制造业'
          },
          conversation_count: 3,
          active_conversations: 1,
          last_seen_at: '2024-06-17T09:15:00Z',
          created_at: '2024-06-17T08:00:00Z',
          updated_at: '2024-06-17T09:15:00Z'
        }
      ],
      total: 4,
      page: params.page || 1,
      size: params.size || 20,
      total_pages: 1
    }
  })
}

// 获取客户详情
export const getCustomerDetail = (customerId: string) => {
  return request.get<CustomerResponse>({
    url: `${API_PREFIX}/${customerId}`
  })
}

// 创建客户
export const createCustomer = (data: CreateCustomerParams) => {
  return request.post<CustomerResponse>({
    url: API_PREFIX,
    data
  })
}

// 更新客户信息
export const updateCustomer = (customerId: string, data: UpdateCustomerParams) => {
  // 临时返回模拟成功响应
  return Promise.resolve({
    success: true,
    data: {
      id: customerId,
      ...data,
      updated_at: new Date().toISOString()
    }
  })
}

// 删除客户
export const deleteCustomer = (customerId: string) => {
  return request.delete({
    url: `${API_PREFIX}/${customerId}`
  })
}

// 获取客户会话列表
export const getCustomerConversations = (
  customerId: string,
  params?: {
    page?: number
    size?: number
    status?: string
  }
) => {
  return request.get({
    url: `${API_PREFIX}/${customerId}/conversations`,
    params
  })
}

// 为客户创建会话
export const createCustomerConversation = (
  customerId: string,
  data: {
    channel_type: string
    initial_message?: string
  }
) => {
  return request.post({
    url: `${API_PREFIX}/${customerId}/conversations`,
    data
  })
}

// 拉黑/解除拉黑客户
export const toggleCustomerBlock = (customerId: string, blocked: boolean) => {
  return request.post({
    url: `${API_PREFIX}/${customerId}/block`,
    data: { blocked }
  })
}

// 添加客户备注
export const addCustomerNote = (customerId: string, content: string) => {
  return request.post({
    url: `${API_PREFIX}/${customerId}/notes`,
    data: { content }
  })
}

// 获取客户备注
export const getCustomerNotes = (customerId: string) => {
  return request.get({
    url: `${API_PREFIX}/${customerId}/notes`
  })
}
