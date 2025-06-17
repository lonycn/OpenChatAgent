#!/bin/bash

# Chat Admin 开发环境启动脚本
# 基于 Vue 3 + Element Plus + Vite

set -e

echo "🚀 启动 Chat Admin 开发环境..."

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js (推荐版本 >= 16)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "⚠️  警告: Node.js 版本过低 (当前: $(node -v))，推荐使用 Node.js 16 或更高版本"
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 未找到 pnpm，正在安装..."
    npm install -g pnpm
fi

# 进入项目目录
cd "$(dirname "$0")"

# 检查是否需要安装依赖
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.pnpm/lock.yaml" ]; then
    echo "📦 安装项目依赖..."
    pnpm install
else
    echo "✅ 依赖已安装，跳过安装步骤"
fi

# 检查端口占用并清理
check_and_kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "🔄 端口 $port 被占用 (PID: $pid)，正在清理..."
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# 清理可能占用的端口
check_and_kill_port 4000
check_and_kill_port 4001

echo "🌟 启动开发服务器..."
echo "📍 访问地址: http://localhost:4001"
echo "📍 网络地址: http://$(ipconfig getifaddr en0):4001"
echo "🛑 按 Ctrl+C 停止服务"
echo ""

# 启动开发服务器
pnpm dev
