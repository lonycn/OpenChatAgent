<template>
  <div class="users-container">
    <el-card>
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <h2>用户管理</h2>
          <p>管理系统用户和权限</p>
        </div>
        <div class="header-right">
          <el-button type="primary" :icon="Plus" @click="handleCreateUser"> 新增用户 </el-button>
        </div>
      </div>

      <!-- 搜索和筛选 -->
      <div class="search-filters">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input
              v-model="searchParams.search"
              placeholder="搜索用户名、姓名或邮箱"
              :prefix-icon="Search"
              clearable
              @input="handleSearch"
            />
          </el-col>
          <el-col :span="4">
            <el-select
              v-model="searchParams.role"
              placeholder="筛选角色"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="全部角色" value="" />
              <el-option label="管理员" value="admin" />
              <el-option label="主管" value="supervisor" />
              <el-option label="客服" value="agent" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select
              v-model="searchParams.status"
              placeholder="筛选状态"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="全部状态" value="" />
              <el-option label="活跃" value="active" />
              <el-option label="禁用" value="inactive" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-button type="primary" :icon="Search" @click="loadUsers"> 搜索 </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 用户表格 -->
      <el-table :data="users" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="avatar" label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :icon="User" size="small" />
          </template>
        </el-table-column>

        <el-table-column prop="email" label="邮箱" width="200" />

        <el-table-column prop="full_name" label="姓名" width="120">
          <template #default="{ row }">
            {{ row.full_name || row.name }}
          </template>
        </el-table-column>

        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="last_login_at" label="最后登录" width="160">
          <template #default="{ row }">
            {{ row.last_login_at ? formatTime(row.last_login_at) : '从未登录' }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" :icon="Edit" @click="handleEditUser(row)">
              编辑
            </el-button>
            <el-button link size="small" :icon="Key" @click="handleResetPassword(row)">
              重置密码
            </el-button>
            <el-dropdown @command="(command) => handleUserAction(command, row)">
              <el-button link size="small" :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="permissions"> 权限管理 </el-dropdown-item>
                  <el-dropdown-item :command="row.status === 'active' ? 'disable' : 'enable'">
                    {{ row.status === 'active' ? '禁用用户' : '启用用户' }}
                  </el-dropdown-item>
                  <el-dropdown-item divided command="delete"> 删除用户 </el-dropdown-item>
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
    </el-card>

    <!-- 用户表单对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="isEditMode ? '编辑用户' : '新增用户'"
      width="600px"
      @close="resetUserForm"
    >
      <el-form ref="userFormRef" :model="userForm" :rules="userFormRules" label-width="80px">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" :disabled="isEditMode" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="姓名" prop="full_name">
          <el-input v-model="userForm.full_name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="主管" value="supervisor" />
            <el-option label="客服" value="agent" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" placeholder="请选择状态">
            <el-option label="活跃" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="!isEditMode" label="密码" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitUser">
          {{ isEditMode ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="passwordDialogVisible" title="重置密码" width="400px">
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordFormRules"
        label-width="80px"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请确认新密码"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitPassword">
          重置密码
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Edit, Key, MoreFilled, User } from '@element-plus/icons-vue'
import {
  getUserList,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  resetUserPassword
} from '@/api/users'
import type {
  User as UserType,
  UserListParams,
  CreateUserParams,
  UpdateUserParams,
  UserRole,
  UserStatus
} from '@/api/users/types'
import dayjs from 'dayjs'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const users = ref<UserType[]>([])
const userDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const isEditMode = ref(false)
const currentUser = ref<UserType | null>(null)

// 表单引用
const userFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

// 搜索参数
const searchParams = reactive<UserListParams>({
  page: 1,
  size: 20,
  search: '',
  role: '',
  status: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 用户表单
const userForm = reactive<CreateUserParams & UpdateUserParams>({
  email: '',
  full_name: '',
  password: '',
  role: 'agent',
  status: 'active'
})

// 密码表单
const passwordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

// 表单验证规则
const userFormRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  full_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于 8 个字符', trigger: 'blur' }
  ]
}

const passwordFormRules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 方法
const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      ...searchParams,
      page: pagination.page,
      size: pagination.size
    }

    const response = await getUserList(params)
    if ((response as any)?.success) {
      users.value = response.data.users
      pagination.total = response.data.total
      pagination.totalPages = response.data.total_pages
    } else {
      ElMessage.error((response as any)?.message || '获取用户列表失败')
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadUsers()
}

const handleFilterChange = () => {
  pagination.page = 1
  loadUsers()
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  loadUsers()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadUsers()
}

const handleCreateUser = () => {
  isEditMode.value = false
  currentUser.value = null
  userDialogVisible.value = true
}

const handleEditUser = (user: UserType) => {
  isEditMode.value = true
  currentUser.value = user

  // 填充表单数据
  Object.assign(userForm, {
    email: user.email,
    full_name: user.full_name || user.name,
    role: user.role,
    status: user.status
  })

  userDialogVisible.value = true
}

const handleSubmitUser = async () => {
  if (!userFormRef.value) return

  try {
    await userFormRef.value.validate()
    submitting.value = true

    if (isEditMode.value && currentUser.value) {
      // 更新用户
      const updateData: UpdateUserParams = {
        full_name: userForm.full_name,
        role: userForm.role,
        status: userForm.status
      }

      const response = await updateUser(currentUser.value.id, updateData)
      if ((response as any)?.success) {
        ElMessage.success('用户更新成功')
        userDialogVisible.value = false
        resetUserForm()
        await loadUsers()
      } else {
        ElMessage.error((response as any)?.message || '更新用户失败')
      }
    } else {
      // 创建用户
      const createData: CreateUserParams = {
        email: userForm.email,
        full_name: userForm.full_name,
        password: userForm.password,
        role: userForm.role,
        status: userForm.status
      }

      const response = await createUser(createData)
      if ((response as any)?.success) {
        ElMessage.success('用户创建成功')
        userDialogVisible.value = false
        resetUserForm()
        await loadUsers()
      } else {
        ElMessage.error((response as any)?.message || '创建用户失败')
      }
    }
  } catch (error) {
    console.error('提交用户信息失败:', error)
    ElMessage.error('提交用户信息失败')
  } finally {
    submitting.value = false
  }
}

const handleResetPassword = (user: UserType) => {
  currentUser.value = user
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

const handleSubmitPassword = async () => {
  if (!passwordFormRef.value || !currentUser.value) return

  try {
    await passwordFormRef.value.validate()
    submitting.value = true

    const response = await resetUserPassword(currentUser.value.id, passwordForm.newPassword)
    if ((response as any)?.success) {
      ElMessage.success('密码重置成功')
      passwordDialogVisible.value = false
    } else {
      ElMessage.error((response as any)?.message || '重置密码失败')
    }
  } catch (error) {
    console.error('重置密码失败:', error)
    ElMessage.error('重置密码失败')
  } finally {
    submitting.value = false
  }
}

const handleUserAction = async (command: string, user: UserType) => {
  switch (command) {
    case 'permissions':
      ElMessage.info('权限管理功能开发中')
      break

    case 'enable':
    case 'disable':
      try {
        const newStatus = command === 'enable' ? 'active' : 'inactive'
        const response = await updateUserStatus(user.id, newStatus)
        if ((response as any)?.success) {
          ElMessage.success(`用户状态已${newStatus === 'active' ? '激活' : '禁用'}`)
          await loadUsers()
        } else {
          ElMessage.error((response as any)?.message || '更新用户状态失败')
        }
      } catch (error) {
        console.error('更新用户状态失败:', error)
        ElMessage.error('更新用户状态失败')
      }
      break

    case 'delete':
      try {
        await ElMessageBox.confirm(
          `确定要删除用户 "${user.name}" 吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const response = await deleteUser(user.id)
        if ((response as any)?.success) {
          ElMessage.success('用户删除成功')
          await loadUsers()
        } else {
          ElMessage.error((response as any)?.message || '删除用户失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除用户失败:', error)
          ElMessage.error('删除用户失败')
        }
      }
      break
  }
}

const resetUserForm = () => {
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }

  Object.assign(userForm, {
    email: '',
    full_name: '',
    password: '',
    role: 'agent',
    status: 'active'
  })
}

// 工具方法
const getRoleType = (role: string) => {
  const typeMap: Record<string, string> = {
    admin: 'danger',
    supervisor: 'warning',
    agent: 'primary'
  }
  return typeMap[role] || 'info'
}

const getRoleText = (role: string) => {
  const textMap: Record<string, string> = {
    admin: '管理员',
    supervisor: '主管',
    agent: '客服'
  }
  return textMap[role] || role
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    active: 'success',
    inactive: 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    active: '活跃',
    inactive: '禁用'
  }
  return textMap[status] || status
}

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 生命周期
onMounted(() => {
  loadUsers()
})
</script>

<style scoped lang="less">
.users-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8e8e8;

  .header-left {
    h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }
}

.search-filters {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
