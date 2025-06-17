/**
 * 仪表板相关类型定义
 */

// 仪表板统计数据
export interface DashboardStats {
  users: {
    total_users: number
    active_users: number
    new_users_today: number
    online_users: number
  }
  conversations: {
    total_conversations: number
    active_conversations: number
    ai_handled: number
    human_handled: number
    avg_response_time: number
  }
  messages: {
    total_messages: number
    today_messages: number
    avg_messages_per_conversation: number
  }
  performance: {
    customer_satisfaction: number
    resolution_rate: number
    first_response_time: number
  }
}

// 仪表板统计响应
export interface DashboardStatsResponse {
  success: boolean
  data: DashboardStats
  message?: string
}

// 客服状态信息
export interface AgentInfo {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'online' | 'offline' | 'busy'
  current_conversations: number
  max_conversations: number
  avg_response_time: number
  satisfaction_rate: number
  total_conversations_today: number
  last_activity_at?: string
}

// 客服统计响应
export interface AgentStatsResponse {
  success: boolean
  data: AgentInfo[]
  message?: string
}

// 会话趋势数据点
export interface ConversationTrendPoint {
  timestamp: string
  total: number
  ai_handled: number
  human_handled: number
  resolved: number
  avg_response_time: number
}

// 会话趋势响应
export interface ConversationTrendsResponse {
  success: boolean
  data: {
    trends: ConversationTrendPoint[]
    summary: {
      total_conversations: number
      growth_rate: number
      ai_handling_rate: number
      resolution_rate: number
    }
  }
  message?: string
}

// 性能指标
export interface PerformanceMetrics {
  response_time: {
    avg: number
    p50: number
    p90: number
    p95: number
    p99: number
  }
  resolution_time: {
    avg: number
    p50: number
    p90: number
    p95: number
    p99: number
  }
  customer_satisfaction: {
    avg: number
    distribution: {
      score: number
      count: number
    }[]
  }
  agent_utilization: {
    avg: number
    by_agent: {
      agent_id: string
      agent_name: string
      utilization: number
    }[]
  }
}

// 性能指标响应
export interface PerformanceMetricsResponse {
  success: boolean
  data: PerformanceMetrics
  message?: string
}

// 实时数据
export interface RealTimeData {
  active_conversations: number
  waiting_conversations: number
  online_agents: number
  avg_wait_time: number
  current_load: number
  system_status: 'healthy' | 'warning' | 'critical'
}

// 实时数据响应
export interface RealTimeDataResponse {
  success: boolean
  data: RealTimeData
  message?: string
}
