import { AxiosResponse, InternalAxiosRequestConfig } from './types'
import qs from 'qs'
import { SUCCESS_CODE, TRANSFORM_REQUEST_DATA } from '@/constants'
import { useUserStoreWithOut } from '@/store/modules/user'
import { objToFormData } from '@/utils'

const defaultRequestInterceptors = (config: InternalAxiosRequestConfig) => {
  // 添加认证 token
  const userStore = useUserStoreWithOut()
  const token = userStore.getToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (
    config.method === 'post' &&
    config.headers['Content-Type'] === 'application/x-www-form-urlencoded'
  ) {
    config.data = qs.stringify(config.data)
  } else if (
    TRANSFORM_REQUEST_DATA &&
    config.method === 'post' &&
    config.headers['Content-Type'] === 'multipart/form-data' &&
    !(config.data instanceof FormData)
  ) {
    config.data = objToFormData(config.data)
  }
  if (config.method === 'get' && config.params) {
    let url = config.url as string
    url += '?'
    const keys = Object.keys(config.params)
    for (const key of keys) {
      if (config.params[key] !== void 0 && config.params[key] !== null) {
        url += `${key}=${encodeURIComponent(config.params[key])}&`
      }
    }
    url = url.substring(0, url.length - 1)
    config.params = {}
    config.url = url
  }
  return config
}

const defaultResponseInterceptors = (response: AxiosResponse) => {
  if (response?.config?.responseType === 'blob') {
    // 如果是文件流，直接过
    return response
  } else if (response.status >= 200 && response.status < 300) {
    // 成功响应，直接返回数据
    return {
      code: 200,
      data: response.data,
      message: 'success',
      success: true
    }
  } else {
    ElMessage.error(response?.data?.detail || response?.data?.message || '请求失败')
    if (response.status === 401) {
      // 清除 token 并跳转到登录页
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(response.data)
  }
}

export { defaultResponseInterceptors, defaultRequestInterceptors }
