<template>
  <div class="customers-container">
    <!-- 搜索和操作栏 -->
    <div class="search-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索客户姓名、邮箱"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.source" placeholder="客户来源" clearable>
            <el-option label="全部" value="" />
            <el-option label="网站" value="website" />
            <el-option label="移动端" value="mobile" />
            <el-option label="API" value="api" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.status" placeholder="客户状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="活跃" value="active" />
            <el-option label="非活跃" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 客户列表 -->
    <div class="table-container">
      <el-table
        v-loading="loading"
        :data="customerList"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="客户信息" width="250">
          <template #default="{ row }">
            <div class="customer-info">
              <el-avatar :size="40" :src="row.avatar || ''" class="customer-avatar">
                {{ row.name?.charAt(0) || 'N' }}
              </el-avatar>
              <div class="customer-details">
                <div class="customer-name">{{ row.name || '未知客户' }}</div>
                <div class="customer-email">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="source" label="来源" width="100">
          <template #default="{ row }">
            <el-tag :type="getSourceTagType(row.source)">
              {{ getSourceText(row.source) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="自定义属性" width="200">
          <template #default="{ row }">
            <div v-if="row.custom_attributes">
              <el-tag
                v-for="(value, key) in row.custom_attributes"
                :key="key"
                size="small"
                class="custom-attr-tag"
              >
                {{ key }}: {{ value }}
              </el-tag>
            </div>
            <span v-else class="text-gray-400">无</span>
          </template>
        </el-table-column>

        <el-table-column label="会话统计" width="120">
          <template #default="{ row }">
            <div class="conversation-stats">
              <div>总会话: {{ row.conversation_count || 0 }}</div>
              <div>活跃会话: {{ row.active_conversations || 0 }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="last_seen_at" label="最后活跃" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.last_seen_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="注册时间" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleViewConversations(row)"
            >
              查看会话
            </el-button>
            <el-button
              type="success"
              size="small"
              @click="handleStartConversation(row)"
            >
              发起会话
            </el-button>
            <el-dropdown @command="(command) => handleMoreAction(command, row)">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑信息</el-dropdown-item>
                  <el-dropdown-item command="notes">查看备注</el-dropdown-item>
                  <el-dropdown-item command="block" divided>拉黑客户</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 客户详情对话框 -->
    <el-dialog
      v-model="customerDialogVisible"
      :title="isEditMode ? '编辑客户信息' : '客户详情'"
      width="600px"
    >
      <el-form
        v-if="currentCustomer"
        :model="customerForm"
        label-width="100px"
      >
        <el-form-item label="客户姓名">
          <el-input v-model="customerForm.name" :disabled="!isEditMode" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="customerForm.email" :disabled="!isEditMode" />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="customerForm.source" :disabled="!isEditMode">
            <el-option label="网站" value="website" />
            <el-option label="移动端" value="mobile" />
            <el-option label="API" value="api" />
          </el-select>
        </el-form-item>
        <el-form-item label="自定义属性">
          <el-input
            v-model="customAttributesText"
            type="textarea"
            :rows="3"
            :disabled="!isEditMode"
            placeholder="JSON格式，如: {&quot;company&quot;: &quot;公司名&quot;, &quot;phone&quot;: &quot;电话&quot;}"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="customerDialogVisible = false">取消</el-button>
          <el-button v-if="isEditMode" type="primary" @click="handleSaveCustomer">
            保存
          </el-button>
          <el-button v-else type="primary" @click="isEditMode = true">
            编辑
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, ArrowDown } from '@element-plus/icons-vue'
import { getCustomerList, updateCustomer } from '@/api/customers'
import type { Customer, CustomerListParams } from '@/api/customers/types'
import { formatDateTime } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const customerList = ref<Customer[]>([])
const selectedCustomers = ref<Customer[]>([])
const customerDialogVisible = ref(false)
const currentCustomer = ref<Customer | null>(null)
const isEditMode = ref(false)

// 搜索表单
const searchForm = reactive<CustomerListParams>({
  keyword: '',
  source: '',
  status: '',
  page: 1,
  size: 20
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 客户表单
const customerForm = reactive({
  name: '',
  email: '',
  source: '',
  custom_attributes: {}
})

// 自定义属性文本
const customAttributesText = ref('')

// 加载客户列表
const loadCustomers = async () => {
  loading.value = true
  try {
    const params = {
      ...searchForm,
      page: pagination.page,
      size: pagination.size
    }
    const response = await getCustomerList(params)
    if (response.success) {
      customerList.value = response.data.customers
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('加载客户列表失败:', error)
    ElMessage.error('加载客户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadCustomers()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    source: '',
    status: '',
    page: 1,
    size: 20
  })
  pagination.page = 1
  loadCustomers()
}

// 选择变化
const handleSelectionChange = (selection: Customer[]) => {
  selectedCustomers.value = selection
}

// 分页变化
const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  loadCustomers()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadCustomers()
}

// 查看客户会话
const handleViewConversations = (customer: Customer) => {
  // 跳转到会话管理页面，并筛选该客户的会话
  // TODO: 实现跳转逻辑
  ElMessage.info(`查看客户 ${customer.name} 的会话记录`)
}

// 发起会话
const handleStartConversation = (customer: Customer) => {
  // TODO: 实现发起会话逻辑
  ElMessage.info(`向客户 ${customer.name} 发起会话`)
}

// 更多操作
const handleMoreAction = (command: string, customer: Customer) => {
  switch (command) {
    case 'edit':
      handleEditCustomer(customer)
      break
    case 'notes':
      // TODO: 查看客户备注
      ElMessage.info(`查看客户 ${customer.name} 的备注`)
      break
    case 'block':
      handleBlockCustomer(customer)
      break
  }
}

// 编辑客户
const handleEditCustomer = (customer: Customer) => {
  currentCustomer.value = customer
  Object.assign(customerForm, {
    name: customer.name,
    email: customer.email,
    source: customer.source,
    custom_attributes: customer.custom_attributes || {}
  })
  customAttributesText.value = JSON.stringify(customer.custom_attributes || {}, null, 2)
  isEditMode.value = true
  customerDialogVisible.value = true
}

// 保存客户信息
const handleSaveCustomer = async () => {
  if (!currentCustomer.value) return
  
  try {
    // 解析自定义属性
    let customAttributes = {}
    if (customAttributesText.value.trim()) {
      customAttributes = JSON.parse(customAttributesText.value)
    }
    
    const updateData = {
      name: customerForm.name,
      email: customerForm.email,
      source: customerForm.source,
      custom_attributes: customAttributes
    }
    
    const response = await updateCustomer(currentCustomer.value.id, updateData)
    if (response.success) {
      ElMessage.success('客户信息更新成功')
      customerDialogVisible.value = false
      loadCustomers()
    }
  } catch (error) {
    console.error('更新客户信息失败:', error)
    ElMessage.error('更新客户信息失败')
  }
}

// 拉黑客户
const handleBlockCustomer = async (customer: Customer) => {
  try {
    await ElMessageBox.confirm(
      `确定要拉黑客户 ${customer.name} 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // TODO: 实现拉黑逻辑
    ElMessage.success(`客户 ${customer.name} 已被拉黑`)
    loadCustomers()
  } catch {
    // 用户取消操作
  }
}

// 获取来源标签类型
const getSourceTagType = (source: string) => {
  const typeMap: Record<string, string> = {
    website: 'primary',
    mobile: 'success',
    api: 'info'
  }
  return typeMap[source] || 'default'
}

// 获取来源文本
const getSourceText = (source: string) => {
  const textMap: Record<string, string> = {
    website: '网站',
    mobile: '移动端',
    api: 'API'
  }
  return textMap[source] || source
}

// 初始化
onMounted(() => {
  loadCustomers()
})
</script>

<style scoped lang="scss">
.customers-container {
  padding: 20px;
}

.search-bar {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-details {
  flex: 1;
}

.customer-name {
  font-weight: 500;
  color: #303133;
}

.customer-email {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.custom-attr-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.conversation-stats {
  font-size: 12px;
  line-height: 1.4;
}

.pagination-container {
  padding: 20px;
  text-align: right;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
