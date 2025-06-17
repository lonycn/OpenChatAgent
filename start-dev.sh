#!/bin/bash

# OpenChatAgent v3.0 开发环境启动脚本
# 统一架构：chat-api (Python) + chat-front (React) + chat-admin (Vue 3 + Element Plus)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 $port ($service) 已被占用"
        log_info "正在尝试释放端口..."
        
        # 尝试杀死占用端口的进程
        local pid=$(lsof -ti:$port)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            sleep 1
            
            # 再次检查
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                log_error "无法释放端口 $port，请手动处理"
                return 1
            else
                log_success "端口 $port 已释放"
            fi
        fi
    fi
    return 0
}

# 检查必要的依赖
check_dependencies() {
    log_step "检查系统依赖..."
    
    # 检查 Python
    check_command "python3"
    check_command "pip3"
    
    # 检查 Node.js
    check_command "node"
    check_command "npm"
    
    # 检查 Python 版本
    local python_version=$(python3 -c "import sys; print('.'.join(map(str, sys.version_info[:2])))")
    local required_python="3.9"

    if [ "$(printf '%s\n' "$required_python" "$python_version" | sort -V | head -n1)" != "$required_python" ]; then
        log_error "Python 版本过低，需要 >= $required_python，当前版本: $python_version"
        exit 1
    fi
    
    # 检查 Node.js 版本
    local node_version=$(node -v | cut -d'v' -f2)
    local required_node="16.0.0"
    
    if [ "$(printf '%s\n' "$required_node" "$node_version" | sort -V | head -n1)" != "$required_node" ]; then
        log_error "Node.js 版本过低，需要 >= $required_node，当前版本: $node_version"
        exit 1
    fi
    
    log_success "依赖检查通过 (Python $python_version, Node.js $node_version)"
}

# 检查端口可用性
check_ports() {
    log_step "检查端口可用性..."
    
    check_port 8000 "chat-api"
    check_port 8001 "chat-front"
    check_port 4001 "chat-admin"
    
    log_success "端口检查完成"
}

# 检查数据库连接
check_databases() {
    log_step "检查数据库连接..."
    
    # 检查 MySQL
    if command -v mysql &> /dev/null; then
        if mysql -h localhost -u root -p123456 -e "SELECT 1;" &> /dev/null; then
            log_success "MySQL 连接正常"
        else
            log_warning "MySQL 连接失败，请检查配置"
        fi
    else
        log_warning "MySQL 客户端未安装，跳过检查"
    fi
    
    # 检查 Redis
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            log_success "Redis 连接正常"
        else
            log_warning "Redis 连接失败，请检查配置"
        fi
    else
        log_warning "Redis 客户端未安装，跳过检查"
    fi
}

# 环境配置
setup_environment() {
    log_step "配置环境变量..."
    
    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_info "复制环境变量模板..."
            cp .env.example .env
            log_warning "请编辑 .env 文件，配置必要的环境变量（如 DASHSCOPE_API_KEY）"
        else
            log_error ".env.example 文件不存在"
            exit 1
        fi
    fi
    
    log_success "环境配置完成"
}

# 安装 Python 依赖
setup_python_env() {
    log_step "设置 Python 环境..."

    cd chat-api

    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        log_info "创建 Python 虚拟环境..."
        python3 -m venv venv
        NEED_INSTALL_PYTHON=true
    else
        # 检查是否需要重新安装依赖
        if [ ! -f ".deps_installed" ] || [ "requirements.txt" -nt ".deps_installed" ]; then
            NEED_INSTALL_PYTHON=true
        else
            log_info "Python 依赖已是最新，跳过安装"
            NEED_INSTALL_PYTHON=false
        fi
    fi

    # 激活虚拟环境
    source venv/bin/activate

    # 安装依赖（仅在需要时）
    if [ "$NEED_INSTALL_PYTHON" = true ]; then
        log_info "安装 Python 依赖..."
        pip install --upgrade pip
        pip install -r requirements.txt

        # 标记依赖已安装
        touch .deps_installed
        log_success "Python 依赖安装完成"
    fi

    cd ..
    log_success "Python 环境设置完成"
}

# 安装 Node.js 依赖
setup_node_env() {
    log_step "设置 Node.js 环境..."

    # 安装 chat-front 依赖
    if [ -d "chat-front" ] && [ -f "chat-front/package.json" ]; then
        cd chat-front

        # 检查是否需要安装依赖
        if [ ! -d "node_modules" ] || [ ! -f ".deps_installed" ] || [ "package.json" -nt ".deps_installed" ]; then
            log_info "安装 chat-front 依赖..."
            npm install --legacy-peer-deps
            touch .deps_installed
            log_success "chat-front 依赖安装完成"
        else
            log_info "chat-front 依赖已是最新，跳过安装"
        fi

        cd ..
    fi

    # 安装 chat-admin 依赖
    if [ -d "chat-admin" ] && [ -f "chat-admin/package.json" ]; then
        cd chat-admin

        # 检查是否需要安装依赖
        if [ ! -d "node_modules" ] || [ ! -f ".deps_installed" ] || [ "package.json" -nt ".deps_installed" ]; then
            log_info "安装 chat-admin 依赖..."
            if command -v pnpm &> /dev/null; then
                pnpm install
            else
                npm install --legacy-peer-deps
            fi
            touch .deps_installed
            log_success "chat-admin 依赖安装完成"
        else
            log_info "chat-admin 依赖已是最新，跳过安装"
        fi

        cd ..
    fi

    log_success "Node.js 环境设置完成"
}

# 启动服务
start_services() {
    log_step "启动开发服务..."

    # 启动 chat-api (Python FastAPI)
    log_info "启动 chat-api (端口 8000)..."
    cd chat-api

    # 使用系统 Python 和已安装的依赖启动
    if [ -d "venv" ]; then
        # 使用虚拟环境
        source venv/bin/activate
        uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
    else
        # 使用系统 Python
        PYTHONPATH=$(pwd)/venv/lib/python*/site-packages:$PYTHONPATH python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
    fi
    API_PID=$!
    cd ..

    sleep 8  # 等待 API 启动

    # 启动 chat-front (React)
    log_info "启动 chat-front (端口 8001)..."
    cd chat-front
    npm run dev -- --port 8001 &
    FRONT_PID=$!
    cd ..

    sleep 3

    # 启动 chat-admin (Vue 3 + Element Plus)
    log_info "启动 chat-admin (端口 4001)..."
    cd chat-admin
    if command -v pnpm &> /dev/null; then
        pnpm dev &
    else
        npm run dev &
    fi
    ADMIN_PID=$!
    cd ..

    # 保存 PID 到文件
    echo "$API_PID $FRONT_PID $ADMIN_PID" > .dev_pids

    log_success "所有服务已启动"
    log_info "进程 ID 已保存到 .dev_pids 文件"
}

# 显示服务信息
show_services() {
    echo ""
    echo "🚀 OpenChatAgent v3.0 开发环境启动完成！"
    echo "=============================================="
    echo ""
    echo "📋 服务访问地址："
    echo "  🖥️  用户聊天界面:   http://localhost:8001"
    echo "  🛠️  管理后台界面:   http://localhost:4001"
    echo "  🔗 API 服务:       http://localhost:8000"
    echo "  📚 API 文档:       http://localhost:8000/docs"
    echo ""
    echo "🔧 开发工具："
    echo "  📊 健康检查:       curl http://localhost:8000/health"
    echo "  🛑 停止服务:       ./scripts/stop-dev.sh"
    echo ""
    echo "💡 提示："
    echo "  - 确保已配置 .env 文件中的数据库和 API 密钥"
    echo "  - 首次启动可能需要等待依赖安装和数据库初始化"
    echo "  - 如遇问题，请查看各服务的日志输出"
    echo ""
    echo "🎯 新架构特性："
    echo "  ✅ 统一 Python 后端 (FastAPI)"
    echo "  ✅ 现代化前端 (React + TypeScript)"
    echo "  ✅ 专业管理后台 (Vue 3 + Element Plus)"
    echo "  ✅ 实时通信 (WebSocket)"
    echo "  ✅ AI 智能回复 (阿里百炼)"
    echo ""
}

# 清理函数
cleanup() {
    log_info "正在清理..."
    
    if [ -f ".dev_pids" ]; then
        local pids=$(cat .dev_pids)
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                log_info "停止进程 $pid"
                kill $pid 2>/dev/null || true
            fi
        done
        rm -f .dev_pids
    fi
    
    log_info "清理完成"
}

# 信号处理
trap cleanup EXIT INT TERM

# 主函数
main() {
    echo "🚀 OpenChatAgent v3.0 开发环境启动脚本"
    echo "========================================"
    echo ""
    
    # 检查是否在项目根目录
    if [ ! -d "chat-api" ] || [ ! -d "chat-front" ] || [ ! -d "chat-admin" ]; then
        log_error "请在项目根目录运行此脚本"
        log_error "确保存在 chat-api、chat-front、chat-admin 目录"
        exit 1
    fi
    
    # 执行启动流程
    check_dependencies
    check_ports
    check_databases
    setup_environment
    setup_python_env
    setup_node_env
    start_services
    show_services
    
    # 保持脚本运行
    if [ -f ".dev_pids" ]; then
        log_info "按 Ctrl+C 停止所有服务"
        wait
    fi
}

# 运行主函数
main "$@"
