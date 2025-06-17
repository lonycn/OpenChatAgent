<template>
  <div class="conversations-container">
    <el-container style="height: 100vh">
      <!-- 左侧会话列表 -->
      <el-aside width="380px" class="conversation-sidebar">
        <div class="sidebar-header">
          <h3>会话列表</h3>
          <div class="search-filters">
            <el-input
              v-model="searchText"
              placeholder="搜索会话..."
              :prefix-icon="Search"
              clearable
              @input="handleSearch"
            />
            <el-select
              v-model="statusFilter"
              placeholder="筛选状态"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="全部状态" value="" />
              <el-option label="进行中" value="open" />
              <el-option label="等待中" value="pending" />
              <el-option label="已解决" value="resolved" />
              <el-option label="已关闭" value="closed" />
            </el-select>
          </div>
        </div>

        <div class="conversation-list" v-loading="loading">
          <div
            v-for="conversation in filteredConversations"
            :key="conversation.id"
            class="conversation-item"
            :class="{ active: selectedConversation?.id === conversation.id }"
            @click="selectConversation(conversation)"
          >
            <div class="conversation-avatar">
              <el-badge
                :value="conversation.unread_count"
                :hidden="conversation.unread_count === 0"
              >
                <el-avatar :src="conversation.customer.avatar" :icon="User" />
              </el-badge>
            </div>

            <div class="conversation-content">
              <div class="conversation-header">
                <span class="customer-name">{{ conversation.customer.name }}</span>
                <div class="conversation-meta">
                  <el-tag :type="getStatusType(conversation.status) as any" size="small">
                    {{ getStatusText(conversation.status) }}
                  </el-tag>
                  <el-tag :type="getPriorityType(conversation.priority) as any" size="small">
                    {{ getPriorityText(conversation.priority) }}
                  </el-tag>
                </div>
              </div>

              <div class="last-message">
                {{ conversation.last_message?.content || '暂无消息' }}
              </div>

              <div class="conversation-footer">
                <span class="source-icon">
                  <component :is="getSourceIcon(conversation.customer.source)" />
                </span>
                <span class="update-time">
                  {{ formatTime(conversation.updated_at) }}
                </span>
                <span v-if="conversation.assigned_agent" class="agent-name">
                  · {{ conversation.assigned_agent.name }}
                </span>
              </div>
            </div>

            <div class="conversation-actions">
              <el-dropdown @command="handleConversationAction">
                <el-button link :icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'assign', id: conversation.id }">
                      分配客服
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'priority', id: conversation.id }">
                      设置优先级
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'resolve', id: conversation.id }">
                      标记已解决
                    </el-dropdown-item>
                    <el-dropdown-item divided :command="{ action: 'close', id: conversation.id }">
                      关闭会话
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </el-aside>

      <!-- 中间消息区域 -->
      <el-main class="conversation-main">
        <div v-if="selectedConversation" class="chat-container">
          <!-- 消息头部 -->
          <div class="chat-header">
            <div class="customer-info">
              <el-avatar :src="selectedConversation.customer.avatar" :icon="User" />
              <div class="customer-details">
                <h4>{{ selectedConversation.customer.name }}</h4>
                <span class="customer-meta">
                  <component :is="getSourceIcon(selectedConversation.customer.source)" />
                  {{ selectedConversation.customer.source }} · 活跃于
                  {{ formatTime(selectedConversation.updated_at) }}
                </span>
              </div>
            </div>

            <div class="chat-actions">
              <el-tag
                :type="selectedConversation.current_agent_type === 'ai' ? 'info' : 'success'"
                size="small"
                class="agent-type-tag"
              >
                {{ selectedConversation.current_agent_type === 'ai' ? 'AI处理中' : '人工处理中' }}
              </el-tag>

              <el-button
                v-if="
                  selectedConversation.current_agent_type === 'ai' &&
                  selectedConversation.status === 'open'
                "
                type="success"
                size="small"
                @click="handleTakeOver"
              >
                人工接管
              </el-button>

              <el-button
                v-if="
                  selectedConversation.current_agent_type === 'human' &&
                  selectedConversation.status === 'open'
                "
                type="warning"
                size="small"
                @click="handleSwitchToAI"
              >
                切换AI
              </el-button>

              <el-button :icon="Star" link>收藏</el-button>
              <el-button :icon="Check" type="primary" @click="handleResolve">解决</el-button>
              <el-dropdown @command="handleConversationAction">
                <el-button :icon="MoreFilled" link />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'assign', id: selectedConversation.id }">
                      分配客服
                    </el-dropdown-item>
                    <el-dropdown-item
                      :command="{ action: 'priority', id: selectedConversation.id }"
                    >
                      设置优先级
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'notes', id: selectedConversation.id }">
                      添加备注
                    </el-dropdown-item>
                    <el-dropdown-item
                      divided
                      :command="{ action: 'close', id: selectedConversation.id }"
                    >
                      关闭会话
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <!-- 消息列表 -->
          <div class="messages-container" ref="messagesContainer">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message-item"
              :class="{ 'message-agent': message.sender_type === 'agent' }"
            >
              <div v-if="message.sender_type === 'customer'" class="message-avatar">
                <el-avatar :src="selectedConversation.customer.avatar" :icon="User" size="small" />
              </div>

              <div class="message-content">
                <div class="message-bubble">
                  {{ message.content }}
                </div>
                <div class="message-time">
                  {{ formatTime(message.created_at) }}
                </div>
              </div>

              <div v-if="message.sender_type === 'agent'" class="message-avatar">
                <el-avatar
                  :src="selectedConversation.assigned_agent?.avatar"
                  :icon="User"
                  size="small"
                />
              </div>
            </div>
          </div>

          <!-- 快速回复 -->
          <div class="quick-replies" v-if="selectedConversation.status === 'open'">
            <div class="quick-reply-header">
              <span>快速回复:</span>
            </div>
            <div class="quick-reply-buttons">
              <el-button
                v-for="reply in quickReplies"
                :key="reply.id"
                size="small"
                @click="handleQuickReply(reply.content)"
              >
                {{ reply.title }}
              </el-button>
            </div>
          </div>

          <!-- 消息输入框 -->
          <div class="message-input-container">
            <el-input
              v-model="messageInput"
              type="textarea"
              :rows="3"
              placeholder="输入消息..."
              @keydown.enter.exact="handleSendMessage"
            />
            <div class="input-actions">
              <el-button
                type="primary"
                :icon="Promotion"
                :disabled="!messageInput.trim()"
                @click="handleSendMessage"
              >
                发送
              </el-button>
              <el-button type="default" @click="showQuickReplyDialog = true"> 模板 </el-button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <el-empty description="请选择一个会话开始聊天" />
        </div>
      </el-main>

      <!-- 右侧客户信息面板 -->
      <el-aside width="320px" class="customer-sidebar" v-if="selectedConversation">
        <el-tabs>
          <el-tab-pane label="客户信息" name="contact">
            <div class="customer-profile">
              <div class="profile-header">
                <el-avatar :src="selectedConversation.customer.avatar" :icon="User" :size="64" />
                <h4>{{ selectedConversation.customer.name }}</h4>
                <p
                  >{{ selectedConversation.customer.custom_attributes?.title }} at
                  {{ selectedConversation.customer.custom_attributes?.company }}</p
                >
              </div>

              <div class="profile-details">
                <div class="detail-item">
                  <span class="label">邮箱:</span>
                  <span class="value">{{ selectedConversation.customer.email || '未提供' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">电话:</span>
                  <span class="value">{{ selectedConversation.customer.phone || '未提供' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">位置:</span>
                  <span class="value">{{ selectedConversation.customer.location || '未知' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">来源:</span>
                  <span class="value">{{ selectedConversation.customer.source }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="会话历史" name="history">
            <div class="conversation-history">
              <!-- 会话历史内容 -->
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-aside>
    </el-container>

    <!-- 快速回复模板对话框 -->
    <el-dialog v-model="showQuickReplyDialog" title="选择回复模板" width="600px">
      <div class="template-list">
        <div
          v-for="template in replyTemplates"
          :key="template.id"
          class="template-item"
          @click="handleSelectTemplate(template)"
        >
          <div class="template-title">{{ template.title }}</div>
          <div class="template-content">{{ template.content }}</div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showQuickReplyDialog = false">取消</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分配客服对话框 -->
    <el-dialog v-model="showAssignDialog" title="分配客服" width="400px">
      <el-form>
        <el-form-item label="选择客服">
          <el-select v-model="selectedAgent" placeholder="请选择客服">
            <el-option
              v-for="agent in availableAgents"
              :key="agent.id"
              :label="agent.name"
              :value="agent.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAssignDialog = false">取消</el-button>
          <el-button type="primary" @click="handleAssignAgent">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  User,
  MoreFilled,
  Star,
  Check,
  Promotion,
  Monitor,
  Iphone,
  ChatDotRound,
  Link
} from '@element-plus/icons-vue'
import { getConversationList, getConversationMessages, sendMessage } from '@/api/conversations'
import type { Conversation, Message, ConversationListParams } from '@/api/conversations/types'
import dayjs from 'dayjs'

// 响应式数据
const loading = ref(false)
const conversations = ref<Conversation[]>([])
const selectedConversation = ref<Conversation | null>(null)
const messages = ref<Message[]>([])
const messageInput = ref('')
const searchText = ref('')
const statusFilter = ref('')
const messagesContainer = ref<HTMLElement>()
const showQuickReplyDialog = ref(false)
const showAssignDialog = ref(false)
const selectedAgent = ref('')

// 快速回复数据
const quickReplies = ref([
  { id: 1, title: '感谢咨询', content: '感谢您的咨询，我会尽快为您处理。' },
  { id: 2, title: '稍等片刻', content: '请稍等片刻，我正在为您查询相关信息。' },
  { id: 3, title: '问题已解决', content: '您的问题已经解决，如有其他疑问请随时联系我们。' },
  { id: 4, title: '转接专员', content: '我将为您转接专业客服人员，请稍候。' }
])

// 回复模板数据
const replyTemplates = ref([
  { id: 1, title: '欢迎语', content: '您好！欢迎咨询，我是您的专属客服，很高兴为您服务。' },
  { id: 2, title: '查询中', content: '我正在为您查询相关信息，请稍等片刻...' },
  {
    id: 3,
    title: '问题解决',
    content: '您的问题已经得到解决，感谢您的耐心等待。如有其他问题，请随时联系我们。'
  },
  { id: 4, title: '转接说明', content: '根据您的问题，我将为您转接到专业部门，请稍候。' },
  {
    id: 5,
    title: '结束语',
    content: '感谢您的咨询，祝您生活愉快！如有其他问题，欢迎随时联系我们。'
  }
])

// 可用客服列表
const availableAgents = ref([
  { id: '1', name: '张小明', status: 'online' },
  { id: '2', name: '李小红', status: 'online' },
  { id: '3', name: '王小华', status: 'busy' }
])

// 查询参数
const queryParams = reactive<ConversationListParams>({
  page: 1,
  size: 20,
  search: '',
  status: ''
})

// 计算属性
const filteredConversations = computed(() => {
  return conversations.value.filter((conv) => {
    const matchesSearch =
      !searchText.value ||
      conv.customer.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
      (conv.last_message?.content || '').toLowerCase().includes(searchText.value.toLowerCase())

    const matchesStatus = !statusFilter.value || conv.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

// 方法
const loadConversations = async () => {
  loading.value = true
  try {
    const response = await getConversationList(queryParams)
    if ((response as any)?.success) {
      conversations.value = response.data.conversations
      if (conversations.value.length > 0 && !selectedConversation.value) {
        await selectConversation(conversations.value[0])
      }
    }
  } catch (error) {
    console.error('加载会话列表失败:', error)
    ElMessage.error('加载会话列表失败')
  } finally {
    loading.value = false
  }
}

const selectConversation = async (conversation: Conversation) => {
  selectedConversation.value = conversation
  await loadMessages(conversation.id)
}

const loadMessages = async (conversationId: string) => {
  try {
    const response = await getConversationMessages(conversationId)
    if ((response as any)?.success) {
      messages.value = response.data.messages
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {
    console.error('加载消息失败:', error)
    ElMessage.error('加载消息失败')
  }
}

const handleSendMessage = async () => {
  if (!messageInput.value.trim() || !selectedConversation.value) return

  try {
    const response = await sendMessage(selectedConversation.value.id, {
      content: messageInput.value,
      message_type: 'text'
    })

    if ((response as any)?.success) {
      messageInput.value = ''
      await loadMessages(selectedConversation.value.id)
      ElMessage.success('消息发送成功')
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
  }
}

const handleSearch = () => {
  queryParams.search = searchText.value
}

const handleFilterChange = () => {
  queryParams.status = statusFilter.value
}

// 人工接管
const handleTakeOver = async () => {
  if (!selectedConversation.value) return

  try {
    // TODO: 调用接管API
    selectedConversation.value.current_agent_type = 'human'
    ElMessage.success('已成功接管会话，现在由人工客服处理')

    // 发送系统消息
    const systemMessage = {
      id: Date.now().toString(),
      conversation_id: selectedConversation.value.id,
      content: '人工客服已接管此会话',
      sender_type: 'system' as const,
      message_type: 'text' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    messages.value.push(systemMessage)
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('接管会话失败:', error)
    ElMessage.error('接管会话失败')
  }
}

// 切换到AI
const handleSwitchToAI = async () => {
  if (!selectedConversation.value) return

  try {
    // TODO: 调用切换AI的API
    selectedConversation.value.current_agent_type = 'ai'
    ElMessage.success('已切换到AI处理')

    // 发送系统消息
    const systemMessage = {
      id: Date.now().toString(),
      conversation_id: selectedConversation.value.id,
      content: 'AI助手已接管此会话',
      sender_type: 'system' as const,
      message_type: 'text' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    messages.value.push(systemMessage)
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('切换AI失败:', error)
    ElMessage.error('切换AI失败')
  }
}

// 快速回复
const handleQuickReply = (content: string) => {
  messageInput.value = content
}

// 选择模板
const handleSelectTemplate = (template: any) => {
  messageInput.value = template.content
  showQuickReplyDialog.value = false
}

// 解决会话
const handleResolve = async () => {
  if (!selectedConversation.value) return

  try {
    // TODO: 调用解决会话API
    selectedConversation.value.status = 'resolved'
    ElMessage.success('会话已标记为已解决')

    // 发送系统消息
    const systemMessage = {
      id: Date.now().toString(),
      conversation_id: selectedConversation.value.id,
      content: '会话已被标记为已解决',
      sender_type: 'system' as const,
      message_type: 'text' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    messages.value.push(systemMessage)
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('解决会话失败:', error)
    ElMessage.error('解决会话失败')
  }
}

// 分配客服
const handleAssignAgent = async () => {
  if (!selectedAgent.value || !selectedConversation.value) return

  try {
    // TODO: 调用分配客服API
    const agent = availableAgents.value.find((a) => a.id === selectedAgent.value)
    if (agent) {
      ElMessage.success(`已将会话分配给 ${agent.name}`)
      showAssignDialog.value = false
      selectedAgent.value = ''
    }
  } catch (error) {
    console.error('分配客服失败:', error)
    ElMessage.error('分配客服失败')
  }
}

const handleConversationAction = (command: { action: string; id: string }) => {
  const { action, id } = command

  switch (action) {
    case 'assign':
      showAssignDialog.value = true
      break
    case 'priority':
      ElMessage.info('设置优先级功能开发中')
      break
    case 'notes':
      ElMessage.info('添加备注功能开发中')
      break
    case 'close':
      ElMessage.info('关闭会话功能开发中')
      break
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 工具方法
const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    open: 'success',
    pending: 'warning',
    resolved: 'info',
    closed: 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    open: '进行中',
    pending: '等待中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return statusMap[status] || status
}

const getPriorityType = (priority: string) => {
  const priorityMap: Record<string, string> = {
    urgent: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'info'
  }
  return priorityMap[priority] || 'info'
}

const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  }
  return priorityMap[priority] || priority
}

const getSourceIcon = (source: string) => {
  const iconMap: Record<string, any> = {
    website: Monitor,
    mobile: Iphone,
    social: ChatDotRound,
    api: Link
  }
  return iconMap[source] || Monitor
}

const formatTime = (time: string) => {
  return dayjs(time).format('MM-DD HH:mm')
}

// 生命周期
onMounted(() => {
  loadConversations()
})
</script>

<style scoped lang="less">
.conversations-container {
  height: 100vh;
  background: #fff;
}

.conversation-sidebar {
  border-right: 1px solid #e8e8e8;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .search-filters {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }

  &.active {
    background-color: #e6f7ff;
    border-left: 3px solid #1890ff;
  }

  .conversation-avatar {
    margin-right: 12px;
    flex-shrink: 0;
  }

  .conversation-content {
    flex: 1;
    min-width: 0;

    .conversation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .customer-name {
        font-weight: 600;
        font-size: 14px;
      }

      .conversation-meta {
        display: flex;
        gap: 4px;
      }
    }

    .last-message {
      color: #666;
      font-size: 13px;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .conversation-footer {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #999;

      .source-icon {
        display: flex;
        align-items: center;
      }
    }
  }

  .conversation-actions {
    flex-shrink: 0;
    margin-left: 8px;
  }
}

.conversation-main {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  .customer-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .customer-details {
      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .customer-meta {
        font-size: 12px;
        color: #666;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .chat-actions {
    display: flex;
    gap: 8px;
  }
}

.messages-container {
  flex: 1;
  padding: 16px 24px;
  overflow-y: auto;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;

  &.message-agent {
    flex-direction: row-reverse;

    .message-content {
      align-items: flex-end;

      .message-bubble {
        background: #1890ff;
        color: white;
      }
    }
  }

  .message-avatar {
    flex-shrink: 0;
  }

  .message-content {
    max-width: 70%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    .message-bubble {
      background: white;
      padding: 12px 16px;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      margin-bottom: 4px;
      word-wrap: break-word;
    }

    .message-time {
      font-size: 11px;
      color: #999;
    }
  }
}

.message-input-container {
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  background: white;
  flex-shrink: 0;

  .input-actions {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.quick-replies {
  padding: 12px 24px;
  background: #f8f9fa;
  border-top: 1px solid #e8e8e8;

  .quick-reply-header {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
  }

  .quick-reply-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.agent-type-tag {
  margin-right: 8px;
}

.template-list {
  max-height: 400px;
  overflow-y: auto;
}

.template-item {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #1890ff;
    background-color: #f0f8ff;
  }

  .template-title {
    font-weight: 500;
    margin-bottom: 4px;
    color: #333;
  }

  .template-content {
    font-size: 12px;
    color: #666;
    line-height: 1.4;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.customer-sidebar {
  border-left: 1px solid #e8e8e8;
  height: 100vh;
  overflow: auto;
  padding: 16px;
}

.customer-profile {
  .profile-header {
    text-align: center;
    margin-bottom: 24px;

    h4 {
      margin: 8px 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .profile-details {
    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;

      .label {
        font-weight: 500;
        color: #666;
      }

      .value {
        color: #333;
      }
    }
  }
}
</style>
