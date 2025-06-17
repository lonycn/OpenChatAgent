/**
 * 认证相关类型定义
 */

// 登录参数
export interface LoginParams {
  username: string
  password: string
  remember?: boolean
}

// 登录响应
export interface LoginResponse {
  success: boolean
  data: {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
    user: {
      id: string
      username: string
      name: string
      email: string
      avatar?: string
      role: string
      permissions: string[]
    }
  }
  message?: string
}

// 刷新 token 响应
export interface RefreshTokenResponse {
  success: boolean
  data: {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }
  message?: string
}
