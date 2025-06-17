<template>
  <div class="dashboard-container">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon users">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ dashboardStats?.users?.total_users || 0 }}</div>
              <div class="stat-label">总用户数</div>
              <div class="stat-change positive">
                +{{ dashboardStats?.users?.new_users_today || 0 }} 今日新增
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon conversations">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ dashboardStats?.conversations?.total_conversations || 0 }}</div>
              <div class="stat-label">总会话数</div>
              <div class="stat-change positive">
                {{ dashboardStats?.conversations?.active_conversations || 0 }} 进行中
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon messages">
              <el-icon><Message /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ dashboardStats?.messages?.total_messages || 0 }}</div>
              <div class="stat-label">总消息数</div>
              <div class="stat-change positive">
                +{{ dashboardStats?.messages?.today_messages || 0 }} 今日
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon satisfaction">
              <el-icon><Star /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ (dashboardStats?.performance?.customer_satisfaction || 0).toFixed(1) }}%</div>
              <div class="stat-label">客户满意度</div>
              <div class="stat-change positive">
                {{ (dashboardStats?.performance?.resolution_rate || 0).toFixed(1) }}% 解决率
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-section">
      <el-col :span="16">
        <el-card title="会话趋势" class="chart-card">
          <div ref="conversationTrendChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card title="AI vs 人工处理" class="chart-card">
          <div ref="agentTypeChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 客服状态和实时数据 -->
    <el-row :gutter="20" class="bottom-section">
      <el-col :span="12">
        <el-card title="客服工作状态" class="agent-status-card">
          <div class="agent-list" v-loading="agentLoading">
            <div
              v-for="agent in agentStats"
              :key="agent.id"
              class="agent-item"
            >
              <div class="agent-avatar">
                <el-badge
                  :type="getStatusBadgeType(agent.status)"
                  is-dot
                >
                  <el-avatar :src="agent.avatar" :icon="User" size="small" />
                </el-badge>
              </div>
              
              <div class="agent-info">
                <div class="agent-name">{{ agent.name }}</div>
                <div class="agent-meta">
                  <span class="status">{{ getStatusText(agent.status) }}</span>
                  <span class="conversations">{{ agent.current_conversations }}/{{ agent.max_conversations }} 会话</span>
                </div>
              </div>
              
              <div class="agent-metrics">
                <div class="metric">
                  <span class="label">响应时间</span>
                  <span class="value">{{ formatResponseTime(agent.avg_response_time) }}</span>
                </div>
                <div class="metric">
                  <span class="label">满意度</span>
                  <span class="value">{{ agent.satisfaction_rate.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card title="实时数据" class="realtime-card">
          <div class="realtime-metrics" v-loading="realtimeLoading">
            <div class="metric-item">
              <div class="metric-icon active">
                <el-icon><ChatDotRound /></el-icon>
              </div>
              <div class="metric-content">
                <div class="metric-value">{{ realtimeData?.active_conversations || 0 }}</div>
                <div class="metric-label">活跃会话</div>
              </div>
            </div>

            <div class="metric-item">
              <div class="metric-icon waiting">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="metric-content">
                <div class="metric-value">{{ realtimeData?.waiting_conversations || 0 }}</div>
                <div class="metric-label">等待中</div>
              </div>
            </div>

            <div class="metric-item">
              <div class="metric-icon online">
                <el-icon><User /></el-icon>
              </div>
              <div class="metric-content">
                <div class="metric-value">{{ realtimeData?.online_agents || 0 }}</div>
                <div class="metric-label">在线客服</div>
              </div>
            </div>

            <div class="metric-item">
              <div class="metric-icon load">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="metric-content">
                <div class="metric-value">{{ (realtimeData?.current_load || 0).toFixed(1) }}%</div>
                <div class="metric-label">系统负载</div>
              </div>
            </div>
          </div>

          <div class="system-status">
            <el-alert
              :title="`系统状态: ${getSystemStatusText(realtimeData?.system_status)}`"
              :type="getSystemStatusType(realtimeData?.system_status)"
              :closable="false"
              show-icon
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  User,
  ChatDotRound,
  Message,
  Star,
  Clock,
  TrendCharts
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getDashboardStats, getAgentStats, getConversationTrends, getRealTimeData } from '@/api/dashboard'
import type { DashboardStats, AgentInfo, RealTimeData } from '@/api/dashboard/types'

// 响应式数据
const dashboardStats = ref<DashboardStats>()
const agentStats = ref<AgentInfo[]>([])
const realtimeData = ref<RealTimeData>()
const agentLoading = ref(false)
const realtimeLoading = ref(false)

// 图表引用
const conversationTrendChart = ref<HTMLElement>()
const agentTypeChart = ref<HTMLElement>()

// 图表实例
let trendChartInstance: echarts.ECharts | null = null
let agentTypeChartInstance: echarts.ECharts | null = null

// 定时器
let realtimeTimer: NodeJS.Timeout | null = null

// 方法
const loadDashboardStats = async () => {
  try {
    const response = await getDashboardStats()
    if (response.success) {
      dashboardStats.value = response.data
    }
  } catch (error) {
    console.error('加载仪表板统计失败:', error)
    ElMessage.error('加载仪表板统计失败')
  }
}

const loadAgentStats = async () => {
  agentLoading.value = true
  try {
    const response = await getAgentStats()
    if (response.success) {
      agentStats.value = response.data
    }
  } catch (error) {
    console.error('加载客服状态失败:', error)
    ElMessage.error('加载客服状态失败')
  } finally {
    agentLoading.value = false
  }
}

const loadRealtimeData = async () => {
  realtimeLoading.value = true
  try {
    const response = await getRealTimeData()
    if (response.success) {
      realtimeData.value = response.data
    }
  } catch (error) {
    console.error('加载实时数据失败:', error)
  } finally {
    realtimeLoading.value = false
  }
}

const initConversationTrendChart = async () => {
  if (!conversationTrendChart.value) return

  try {
    const response = await getConversationTrends({
      granularity: 'day'
    })
    
    if (response.success && trendChartInstance) {
      const { trends } = response.data
      
      const option = {
        title: {
          text: '最近7天会话趋势',
          textStyle: { fontSize: 14 }
        },
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['总会话', 'AI处理', '人工处理']
        },
        xAxis: {
          type: 'category',
          data: trends.map(item => new Date(item.timestamp).toLocaleDateString())
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '总会话',
            type: 'line',
            data: trends.map(item => item.total),
            smooth: true
          },
          {
            name: 'AI处理',
            type: 'line',
            data: trends.map(item => item.ai_handled),
            smooth: true
          },
          {
            name: '人工处理',
            type: 'line',
            data: trends.map(item => item.human_handled),
            smooth: true
          }
        ]
      }
      
      trendChartInstance.setOption(option)
    }
  } catch (error) {
    console.error('加载会话趋势图失败:', error)
  }
}

const initAgentTypeChart = () => {
  if (!agentTypeChart.value || !dashboardStats.value) return

  const { ai_handled, human_handled } = dashboardStats.value.conversations
  
  const option = {
    title: {
      text: '处理方式分布',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        type: 'pie',
        radius: '70%',
        data: [
          { value: ai_handled, name: 'AI处理' },
          { value: human_handled, name: '人工处理' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  if (agentTypeChartInstance) {
    agentTypeChartInstance.setOption(option)
  }
}

// 工具方法
const getStatusBadgeType = (status: string) => {
  const typeMap: Record<string, string> = {
    online: 'success',
    busy: 'warning',
    offline: 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    online: '在线',
    busy: '忙碌',
    offline: '离线'
  }
  return textMap[status] || status
}

const getSystemStatusText = (status?: string) => {
  const textMap: Record<string, string> = {
    healthy: '正常',
    warning: '警告',
    critical: '严重'
  }
  return textMap[status || 'healthy'] || '未知'
}

const getSystemStatusType = (status?: string) => {
  const typeMap: Record<string, any> = {
    healthy: 'success',
    warning: 'warning',
    critical: 'error'
  }
  return typeMap[status || 'healthy'] || 'info'
}

const formatResponseTime = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`
  } else {
    return `${(seconds / 60).toFixed(1)}min`
  }
}

// 生命周期
onMounted(async () => {
  // 初始化图表
  if (conversationTrendChart.value) {
    trendChartInstance = echarts.init(conversationTrendChart.value)
  }
  if (agentTypeChart.value) {
    agentTypeChartInstance = echarts.init(agentTypeChart.value)
  }

  // 加载数据
  await Promise.all([
    loadDashboardStats(),
    loadAgentStats(),
    loadRealtimeData()
  ])

  // 初始化图表
  await initConversationTrendChart()
  initAgentTypeChart()

  // 启动实时数据更新
  realtimeTimer = setInterval(loadRealtimeData, 30000) // 30秒更新一次
})

onUnmounted(() => {
  if (trendChartInstance) {
    trendChartInstance.dispose()
  }
  if (agentTypeChartInstance) {
    agentTypeChartInstance.dispose()
  }
  if (realtimeTimer) {
    clearInterval(realtimeTimer)
  }
})
</script>

<style scoped lang="less">
.dashboard-container {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.stats-cards {
  margin-bottom: 20px;

  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;

        &.users {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        &.conversations {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        &.messages {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        &.satisfaction {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
      }

      .stat-info {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }

        .stat-change {
          font-size: 12px;

          &.positive {
            color: #52c41a;
          }

          &.negative {
            color: #ff4d4f;
          }
        }
      }
    }
  }
}

.charts-section {
  margin-bottom: 20px;

  .chart-card {
    .chart-container {
      height: 300px;
      width: 100%;
    }
  }
}

.bottom-section {
  .agent-status-card {
    .agent-list {
      max-height: 400px;
      overflow-y: auto;

      .agent-item {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .agent-avatar {
          margin-right: 12px;
        }

        .agent-info {
          flex: 1;

          .agent-name {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
          }

          .agent-meta {
            display: flex;
            gap: 8px;
            font-size: 12px;
            color: #666;

            .status {
              padding: 2px 6px;
              border-radius: 4px;
              background: #f0f0f0;
            }
          }
        }

        .agent-metrics {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: right;

          .metric {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 12px;

            .label {
              color: #666;
            }

            .value {
              font-weight: 600;
              color: #333;
            }
          }
        }
      }
    }
  }

  .realtime-card {
    .realtime-metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;

      .metric-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: #fafafa;
        border-radius: 8px;

        .metric-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: white;

          &.active {
            background: #52c41a;
          }

          &.waiting {
            background: #faad14;
          }

          &.online {
            background: #1890ff;
          }

          &.load {
            background: #722ed1;
          }
        }

        .metric-content {
          .metric-value {
            font-size: 20px;
            font-weight: 700;
            color: #333;
            margin-bottom: 2px;
          }

          .metric-label {
            font-size: 12px;
            color: #666;
          }
        }
      }
    }

    .system-status {
      margin-top: 16px;
    }
  }
}
</style>
