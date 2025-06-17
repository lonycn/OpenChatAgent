/**
 * 仪表板 API
 */
import request from '@/axios'
import type {
  DashboardStatsResponse,
  AgentStatsResponse,
  ConversationTrendsResponse,
  PerformanceMetricsResponse
} from './types'

/**
 * 获取仪表板统计数据
 */
export const getDashboardStats = () => {
  // 临时返回模拟数据
  return Promise.resolve({
    success: true,
    data: {
      users: {
        total_users: 1250,
        new_users_today: 23,
        active_users: 856
      },
      conversations: {
        total_conversations: 3420,
        active_conversations: 45,
        ai_handled: 2890,
        human_handled: 530,
        today_conversations: 127
      },
      messages: {
        total_messages: 15680,
        today_messages: 456
      },
      performance: {
        customer_satisfaction: 94.5,
        resolution_rate: 87.2,
        avg_response_time: 45
      }
    }
  })
}

/**
 * 获取客服工作状态
 */
export const getAgentStats = () => {
  // 临时返回模拟数据
  return Promise.resolve({
    success: true,
    data: [
      {
        id: '1',
        name: '张小明',
        avatar: '',
        status: 'online',
        current_conversations: 3,
        max_conversations: 5,
        avg_response_time: 32,
        satisfaction_rate: 96.5
      },
      {
        id: '2',
        name: '李小红',
        avatar: '',
        status: 'busy',
        current_conversations: 5,
        max_conversations: 5,
        avg_response_time: 28,
        satisfaction_rate: 98.2
      }
    ]
  })
}

/**
 * 获取会话趋势数据
 */
export const getConversationTrends = (params?: {
  start_date?: string
  end_date?: string
  granularity?: 'hour' | 'day' | 'week' | 'month'
}) => {
  // 临时返回模拟数据
  const trends = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    trends.push({
      timestamp: date.toISOString(),
      total: Math.floor(Math.random() * 100) + 50,
      ai_handled: Math.floor(Math.random() * 70) + 30,
      human_handled: Math.floor(Math.random() * 30) + 10
    })
  }

  return Promise.resolve({
    success: true,
    data: { trends }
  })
}

/**
 * 获取性能指标
 */
export const getPerformanceMetrics = (params?: { start_date?: string; end_date?: string }) => {
  return request.get<PerformanceMetricsResponse>({
    url: '/admin/analytics/performance',
    params
  })
}

/**
 * 获取实时数据
 */
export const getRealTimeData = () => {
  // 临时返回模拟数据
  return Promise.resolve({
    success: true,
    data: {
      active_conversations: 45,
      waiting_conversations: 8,
      online_agents: 12,
      current_load: 68.5,
      system_status: 'healthy'
    }
  })
}
