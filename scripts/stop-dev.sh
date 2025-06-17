#!/bin/bash

# OpenChatAgent v3.0 停止开发服务脚本

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "🛑 停止 OpenChatAgent v3.0 开发服务..."

# 停止通过 .dev_pids 记录的进程
if [ -f ".dev_pids" ]; then
    log_info "停止已记录的开发进程..."
    pids=$(cat .dev_pids)
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            log_info "停止进程 $pid"
            kill $pid 2>/dev/null || true
            sleep 1
            # 如果进程仍在运行，强制杀死
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null || true
            fi
        fi
    done
    rm -f .dev_pids
    log_success "已记录的进程已停止"
fi

# 清理可能残留的进程
log_info "清理可能残留的进程..."

# 清理 Python 进程
pkill -f "python.*run.py" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "fastapi" 2>/dev/null || true

# 清理 Node.js 进程
pkill -f "vite.*8001" 2>/dev/null || true
pkill -f "max.*dev" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# 释放端口
log_info "释放端口..."
for port in 8000 8001 8006; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        log_warning "强制释放端口 $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

# 清理临时文件
log_info "清理临时文件..."
rm -f chat-api/start_api.sh 2>/dev/null || true

log_success "🎯 所有开发服务已停止"
echo ""
echo "💡 提示："
echo "  - 如需重新启动，请运行: ./start-dev-new.sh"
echo "  - 检查服务状态: ./scripts/check-status.sh"
echo ""
