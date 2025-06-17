import request from '@/axios'
import type { UserType } from './types'

interface RoleParams {
  roleName: string
}

// 登录接口
export const loginApi = (data: UserType): Promise<IResponse<UserType>> => {
  return request.post({ url: '/api/v1/auth/login', data })
}

// 登出接口
export const loginOutApi = (): Promise<IResponse> => {
  // 临时返回模拟成功响应
  return Promise.resolve({
    success: true,
    code: 200,
    message: '登出成功',
    data: null
  })
}

// 获取用户列表
export const getUserListApi = ({ params }: AxiosConfig) => {
  return request.get<{
    code: string
    data: {
      list: UserType[]
      total: number
    }
  }>({ url: '/api/v1/admin/users', params })
}

// 获取管理员角色权限
export const getAdminRoleApi = (
  params: RoleParams
): Promise<IResponse<AppCustomRouteRecordRaw[]>> => {
  return request.get({ url: '/admin/roles/routes', params })
}

// 获取测试角色权限
export const getTestRoleApi = (params: RoleParams): Promise<IResponse<string[]>> => {
  return request.get({ url: '/admin/roles/permissions', params })
}
