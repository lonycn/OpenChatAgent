/**
 * 用户管理 API
 */
import request from '@/axios'
import type { 
  UserListParams, 
  UserListResponse, 
  UserResponse, 
  CreateUserParams, 
  UpdateUserParams,
  ChangePasswordParams,
  UserStatsResponse
} from './types'

const API_PREFIX = '/api/v1/admin/users'

/**
 * 获取用户列表
 */
export const getUserList = (params: UserListParams) => {
  // 临时返回模拟数据
  return Promise.resolve({
    success: true,
    data: {
      users: [
        {
          id: 1,
          uuid: 'user-1',
          email: 'admin@example.com',
          full_name: '系统管理员',
          avatar_url: '',
          role: 'admin' as const,
          status: 'active' as const,
          timezone: 'Asia/Shanghai',
          language: 'zh-CN',
          last_login_at: '2024-06-17T10:00:00Z',
          created_at: '2024-06-17T09:00:00Z',
          updated_at: '2024-06-17T10:00:00Z'
        },
        {
          id: 2,
          uuid: 'user-2',
          email: 'supervisor@example.com',
          full_name: '主管',
          avatar_url: '',
          role: 'supervisor' as const,
          status: 'active' as const,
          timezone: 'Asia/Shanghai',
          language: 'zh-CN',
          last_login_at: '2024-06-17T09:30:00Z',
          created_at: '2024-06-17T08:00:00Z',
          updated_at: '2024-06-17T09:30:00Z'
        },
        {
          id: 3,
          uuid: 'user-3',
          email: 'agent@example.com',
          full_name: '客服代表',
          avatar_url: '',
          role: 'agent' as const,
          status: 'active' as const,
          timezone: 'Asia/Shanghai',
          language: 'zh-CN',
          last_login_at: '2024-06-17T08:30:00Z',
          created_at: '2024-06-17T07:00:00Z',
          updated_at: '2024-06-17T08:30:00Z'
        }
      ],
      total: 3,
      page: 1,
      size: 20,
      total_pages: 1
    }
  })
}

/**
 * 获取用户详情
 */
export const getUserDetail = (id: string) => {
  return request.get<UserResponse>({
    url: `${API_PREFIX}/${id}`
  })
}

/**
 * 创建用户
 */
export const createUser = (data: CreateUserParams) => {
  return request.post<UserResponse>({
    url: API_PREFIX,
    data
  })
}

/**
 * 更新用户信息
 */
export const updateUser = (id: string, data: UpdateUserParams) => {
  return request.put<UserResponse>({
    url: `${API_PREFIX}/${id}`,
    data
  })
}

/**
 * 删除用户
 */
export const deleteUser = (id: string) => {
  return request.delete({
    url: `${API_PREFIX}/${id}`
  })
}

/**
 * 更新用户状态
 */
export const updateUserStatus = (id: string, status: 'active' | 'inactive') => {
  return request.put({
    url: `${API_PREFIX}/${id}/status`,
    data: { status }
  })
}

/**
 * 重置用户密码
 */
export const resetUserPassword = (id: string, newPassword: string) => {
  return request.post({
    url: `${API_PREFIX}/${id}/reset-password`,
    data: { new_password: newPassword }
  })
}

/**
 * 获取当前用户信息
 */
export const getCurrentUser = () => {
  return request.get<UserResponse>({
    url: '/auth/me'
  })
}

/**
 * 修改当前用户密码
 */
export const changePassword = (data: ChangePasswordParams) => {
  return request.post({
    url: '/auth/change-password',
    data
  })
}

/**
 * 获取用户权限列表
 */
export const getUserPermissions = (id: string) => {
  return request.get({
    url: `${API_PREFIX}/${id}/permissions`
  })
}

/**
 * 获取可用权限列表
 */
export const getAvailablePermissions = () => {
  return request.get({
    url: '/admin/permissions'
  })
}

/**
 * 更新用户权限
 */
export const updateUserPermissions = (id: string, permissions: string[]) => {
  return request.put({
    url: `${API_PREFIX}/${id}/permissions`,
    data: { permissions }
  })
}

/**
 * 获取用户统计数据
 */
export const getUserStats = () => {
  return request.get<UserStatsResponse>({
    url: `${API_PREFIX}/stats`
  })
}
