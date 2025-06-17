/**
 * 认证相关 API
 */
import request from '@/axios'
import type { LoginParams, LoginResponse, RefreshTokenResponse } from './types'

/**
 * 用户登录
 */
export const login = (data: LoginParams) => {
  return request.post<LoginResponse>({
    url: '/auth/login',
    data
  })
}

/**
 * 用户登出
 */
export const logout = () => {
  return request.post({
    url: '/auth/logout'
  })
}

/**
 * 刷新 token
 */
export const refreshToken = (refreshToken: string) => {
  return request.post<RefreshTokenResponse>({
    url: '/auth/refresh',
    data: { refresh_token: refreshToken }
  })
}

/**
 * 获取当前用户信息
 */
export const getCurrentUser = () => {
  return request.get({
    url: '/auth/me'
  })
}

/**
 * 修改密码
 */
export const changePassword = (data: {
  old_password: string
  new_password: string
  confirm_password: string
}) => {
  return request.post({
    url: '/auth/change-password',
    data
  })
}
