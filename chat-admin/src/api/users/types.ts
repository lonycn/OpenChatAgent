/**
 * 用户管理相关类型定义
 */

// 用户角色
export type UserRole = 'admin' | 'supervisor' | 'agent' | 'guest'

// 用户状态
export type UserStatus = 'active' | 'inactive' | 'suspended'

// 用户信息
export interface User {
  id: number
  uuid: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  status: UserStatus
  timezone: string
  language: string
  last_login_at?: string
  created_at: string
  updated_at: string
  // 兼容前端显示
  username?: string
  name?: string
  avatar?: string
}

// 用户列表查询参数
export interface UserListParams {
  page?: number
  size?: number
  search?: string
  role?: UserRole
  status?: UserStatus
}

// 用户列表响应
export interface UserListResponse {
  success: boolean
  data: {
    users: User[]
    total: number
    page: number
    size: number
    total_pages: number
  }
  message?: string
}

// 用户详情响应
export interface UserResponse {
  success: boolean
  data: User
  message?: string
}

// 创建用户参数
export interface CreateUserParams {
  email: string
  full_name: string
  password: string
  role: UserRole
  status?: UserStatus
  avatar_url?: string
  timezone?: string
  language?: string
  // 兼容前端表单
  username?: string
  name?: string
}

// 更新用户参数
export interface UpdateUserParams {
  full_name?: string
  role?: UserRole
  status?: UserStatus
  avatar_url?: string
  timezone?: string
  language?: string
  // 兼容前端表单
  name?: string
  email?: string
}

// 修改密码参数
export interface ChangePasswordParams {
  old_password: string
  new_password: string
  confirm_password: string
}

// 用户统计数据
export interface UserStats {
  total_users: number
  active_users: number
  admin_count: number
  supervisor_count: number
  agent_count: number
  online_users: number
}

// 用户统计响应
export interface UserStatsResponse {
  success: boolean
  data: UserStats
  message?: string
}
