#!/bin/bash

# 🏢 chat-admin 项目初始化脚本
# 作者: OpenChatAgent Team
# 功能: 快速搭建 chat-admin 客服管理后台

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    # 检查版本
    NODE_VERSION=$(node -v | sed 's/v//')
    if [[ $(echo "$NODE_VERSION 18.0.0" | tr " " "\n" | sort -V | head -n1) != "18.0.0" ]]; then
        log_error "Node.js 版本过低，需要 18.0.0 或更高版本，当前版本: $NODE_VERSION"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 创建项目结构
create_project_structure() {
    log_info "创建 chat-admin 项目结构..."
    
    # 检查是否已存在
    if [ -d "chat-admin" ]; then
        log_warning "chat-admin 目录已存在"
        read -p "是否删除并重新创建? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf chat-admin
        else
            log_error "取消创建"
            exit 1
        fi
    fi
    
    # 使用 Vite 创建 React + TypeScript 项目
    npm create vite@latest chat-admin -- --template react-ts
    
    cd chat-admin
    
    # 创建目录结构
    mkdir -p src/{components,pages,services,hooks,store,utils,types}
    mkdir -p src/components/{Chat,Customer,Dashboard,Common}
    mkdir -p src/pages/{Dashboard,Conversations,Customers,Reports,Settings,Auth}
    mkdir -p tests/{components,pages,services,utils}
    mkdir -p public
    
    log_success "项目结构创建完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装核心依赖
    npm install \
        antd@latest \
        @ant-design/pro-components@latest \
        @ant-design/charts@latest \
        @ant-design/icons@latest \
        axios@latest \
        socket.io-client@latest \
        zustand@latest \
        @tanstack/react-query@latest \
        react-router-dom@latest \
        dayjs@latest \
        lodash-es@latest
    
    # 安装开发依赖
    npm install -D \
        @types/lodash-es@latest \
        @typescript-eslint/eslint-plugin@latest \
        @typescript-eslint/parser@latest \
        eslint@latest \
        eslint-plugin-react@latest \
        eslint-plugin-react-hooks@latest \
        eslint-plugin-react-refresh@latest \
        prettier@latest \
        tailwindcss@latest \
        autoprefixer@latest \
        postcss@latest \
        @vitest/ui@latest \
        @testing-library/react@latest \
        @testing-library/jest-dom@latest \
        jsdom@latest
    
    log_success "依赖安装完成"
}

# 配置开发环境
setup_dev_config() {
    log_info "配置开发环境..."
    
    # 创建 .env.local 文件
    cat > .env.local << EOF
# chat-admin 开发环境配置

# API 配置
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001/admin/ws

# 应用配置
VITE_APP_TITLE=智能客服管理后台
VITE_APP_VERSION=1.0.0

# 开发模式
VITE_DEV_MODE=true
VITE_MOCK_API=false

# 功能开关
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
EOF
    
    # 创建 tailwind.config.js
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
EOF
    
    # 创建 .prettierrc
    cat > .prettierrc << EOF
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF
    
    # 创建 .eslintrc.cjs
    cat > .eslintrc.cjs << 'EOF'
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
EOF
    
    log_success "开发环境配置完成"
}

# 创建基础组件
create_base_components() {
    log_info "创建基础组件..."
    
    # 创建 Layout 组件
    cat > src/components/Common/Layout.tsx << 'EOF'
import React from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import { 
  DashboardOutlined, 
  MessageOutlined, 
  UserOutlined, 
  BarChartOutlined,
  SettingOutlined 
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '工作台',
  },
  {
    key: '/conversations',
    icon: <MessageOutlined />,
    label: '会话管理',
  },
  {
    key: '/customers',
    icon: <UserOutlined />,
    label: '客户管理',
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: '数据报表',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200}>
        <div className="h-16 flex items-center justify-center border-b">
          <h1 className="text-lg font-bold text-blue-600">客服管理后台</h1>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['/dashboard']}
          items={menuItems}
          className="border-r-0"
        />
      </Sider>
      <AntLayout>
        <Header className="bg-white shadow-sm px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-gray-800">智能客服系统</h2>
            <div className="flex items-center space-x-4">
              <span>欢迎，客服小王</span>
            </div>
          </div>
        </Header>
        <Content className="p-6 bg-gray-50">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
EOF
    
    # 创建 Loading 组件
    cat > src/components/Common/Loading.tsx << 'EOF'
import React from 'react';
import { Spin } from 'antd';

interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  size = 'default', 
  tip = '加载中...' 
}) => {
  return (
    <div className="flex items-center justify-center min-h-32">
      <Spin size={size} tip={tip} />
    </div>
  );
};
EOF
    
    log_success "基础组件创建完成"
}

# 创建类型定义
create_type_definitions() {
    log_info "创建 TypeScript 类型定义..."
    
    # 创建用户类型
    cat > src/types/user.ts << 'EOF'
export interface User {
  id: number;
  email: string;
  username?: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'supervisor' | 'agent' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  timezone: string;
  language: string;
  permissions: Permission[];
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export type Permission = 
  | 'conversations:read' | 'conversations:write' | 'conversations:assign'
  | 'contacts:read' | 'contacts:write' | 'contacts:delete'
  | 'reports:read' | 'reports:export'
  | 'settings:read' | 'settings:write'
  | 'users:read' | 'users:write' | 'users:manage'
  | 'inboxes:read' | 'inboxes:write';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refresh_token: string;
}
EOF
    
    # 创建会话类型
    cat > src/types/conversation.ts << 'EOF'
import type { User } from './user';
import type { Customer } from './customer';

export interface Conversation {
  id: number;
  uuid: string;
  contact: Customer;
  assignee?: User;
  inbox_id: number;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channel_type: 'web_widget' | 'facebook' | 'whatsapp' | 'email' | 'api';
  current_agent_type: 'ai' | 'human';
  agent_switched_at?: string;
  labels: Label[];
  unread_count: number;
  last_message?: Message;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  uuid: string;
  conversation_id: number;
  sender_type: 'contact' | 'agent' | 'ai' | 'system';
  sender?: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system' | 'event';
  metadata?: Record<string, any>;
  is_private: boolean;
  created_at: string;
}

export interface Label {
  id: number;
  title: string;
  description?: string;
  color: string;
  show_on_sidebar: boolean;
}
EOF
    
    # 创建 API 类型
    cat > src/types/api.ts << 'EOF'
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  request_id?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

export interface ConversationListParams {
  status?: string;
  assignee_id?: number;
  channel_type?: string;
  priority?: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface DashboardStats {
  real_time: {
    active_conversations: number;
    pending_conversations: number;
    online_agents: number;
    avg_response_time: number;
  };
  today: {
    new_conversations: number;
    resolved_conversations: number;
    total_messages: number;
    avg_resolution_time: number;
  };
  this_week: {
    conversations_count: number;
    resolution_rate: number;
    csat_score: number;
  };
}
EOF
    
    log_success "类型定义创建完成"
}

# 更新 package.json 脚本
update_package_scripts() {
    log_info "更新 package.json 脚本..."
    
    # 使用 node 脚本更新 package.json
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    pkg.scripts = {
      ...pkg.scripts,
      'dev': 'vite',
      'build': 'tsc && vite build',
      'preview': 'vite preview',
      'lint': 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
      'lint:fix': 'eslint . --ext ts,tsx --fix',
      'format': 'prettier --write src/**/*.{ts,tsx}',
      'test': 'vitest',
      'test:ui': 'vitest --ui',
      'type-check': 'tsc --noEmit'
    };
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    
    log_success "package.json 脚本更新完成"
}

# 创建 README
create_readme() {
    log_info "创建项目文档..."
    
    cat > README.md << 'EOF'
# 🏢 chat-admin - 智能客服管理后台

基于 React + TypeScript + Ant Design 的现代化客服管理系统。

## ✨ 特性

- 🎯 **实时会话管理** - WebSocket 实时同步，零延迟
- 🤖 **AI/人工切换** - 智能路由，无缝切换
- 📱 **移动端适配** - PWA 支持，随时随地办公
- 📊 **数据分析** - 实时统计，深度洞察
- 🔐 **权限管理** - 基于角色的精细化权限控制
- 🎨 **现代 UI** - Ant Design + Tailwind CSS

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
src/
├── components/     # 通用组件
├── pages/         # 页面组件
├── services/      # API 服务
├── hooks/         # 自定义 Hooks
├── store/         # 状态管理
├── utils/         # 工具函数
└── types/         # TypeScript 类型定义
```

## 🔧 开发指南

### 代码规范

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 代码格式化
npm run format
```

### 测试

```bash
# 运行测试
npm run test

# 测试 UI
npm run test:ui
```

## 📝 环境变量

复制 `.env.local` 文件并根据需要修改配置：

```bash
cp .env.local .env.production.local
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
EOF
    
    log_success "项目文档创建完成"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "🏢 chat-admin 项目初始化脚本"
    echo "=================================="
    echo -e "${NC}"
    
    check_dependencies
    create_project_structure
    install_dependencies
    setup_dev_config
    create_base_components
    create_type_definitions
    update_package_scripts
    create_readme
    
    echo
    log_success "chat-admin 项目初始化完成！"
    echo
    log_info "下一步："
    echo "  1. cd chat-admin"
    echo "  2. npm run dev"
    echo "  3. 打开 http://localhost:5173"
    echo
    log_info "项目文档: ./chat-admin/README.md"
    log_info "环境配置: ./chat-admin/.env.local"
    echo
}

# 运行主函数
main "$@" 