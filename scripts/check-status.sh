#!/bin/bash

# OpenChatAgent v3.0 服务状态检查脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️]${NC} $1"
}

# 检查端口状态
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -ti:$port)
        log_success "$service (端口 $port) - 运行中 (PID: $pid)"
        return 0
    else
        log_error "$service (端口 $port) - 未运行"
        return 1
    fi
}

# 检查 HTTP 服务
check_http() {
    local url=$1
    local service=$2
    
    if curl -s --connect-timeout 3 "$url" >/dev/null 2>&1; then
        log_success "$service - HTTP 响应正常"
        return 0
    else
        log_error "$service - HTTP 响应失败"
        return 1
    fi
}

echo "🔍 OpenChatAgent v3.0 服务状态检查"
echo "=================================="
echo ""

# 检查端口状态
log_info "检查端口状态..."
check_port 8000 "chat-api (Python FastAPI)"
check_port 8001 "chat-front (React)"
check_port 8006 "chat-admin-ui (Ant Design Pro)"

echo ""

# 检查 HTTP 服务
log_info "检查 HTTP 服务..."
check_http "http://localhost:8000/health" "chat-api 健康检查"
check_http "http://localhost:8001" "chat-front 前端服务"
check_http "http://localhost:8006" "chat-admin-ui 管理后台"

echo ""

# 检查数据库连接
log_info "检查数据库连接..."

# 检查 MySQL
if command -v mysql &> /dev/null; then
    if mysql -h localhost -u root -p123456 -e "SELECT 1;" &> /dev/null; then
        log_success "MySQL 数据库连接正常"
    else
        log_error "MySQL 数据库连接失败"
    fi
else
    log_warning "MySQL 客户端未安装"
fi

# 检查 Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        log_success "Redis 缓存连接正常"
    else
        log_error "Redis 缓存连接失败"
    fi
else
    log_warning "Redis 客户端未安装"
fi

echo ""

# 检查进程状态
log_info "检查进程状态..."
if [ -f ".dev_pids" ]; then
    pids=$(cat .dev_pids)
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            local cmd=$(ps -p $pid -o comm= 2>/dev/null)
            log_success "进程 $pid ($cmd) 运行中"
        else
            log_error "进程 $pid 已停止"
        fi
    done
else
    log_warning "未找到 .dev_pids 文件，可能服务未通过脚本启动"
fi

echo ""
echo "📋 服务访问地址："
echo "  🖥️  用户聊天界面:   http://localhost:8001"
echo "  🛠️  管理后台界面:   http://localhost:8006"
echo "  🔗 API 服务:       http://localhost:8000"
echo "  📚 API 文档:       http://localhost:8000/docs"
echo ""
