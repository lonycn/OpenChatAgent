#!/bin/bash

# OpenChatAgent 开发环境快速启动脚本
# 作者: OpenChatAgent Contributors

echo "🤖 OpenChatAgent 开发环境启动..."

# 检查是否存在 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  根目录 .env 文件不存在"
    if [ -f ".env.example" ]; then
        echo "📋 从 .env.example 复制创建 .env..."
        cp .env.example .env
        echo "✅ .env 文件已创建，请编辑其中的配置项"
        echo "⚠️  特别注意：请设置正确的 DASHSCOPE_API_KEY"
    else
        echo "❌ .env.example 文件也不存在，请检查项目完整性"
        exit 1
    fi
fi

# 检查 Node.js 版本
node_version=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js 未安装，请先安装 Node.js (>= 16.0.0)"
    exit 1
fi

echo "✅ Node.js 版本: $node_version"

# 检查 npm 版本
npm_version=$(npm -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ npm 版本: $npm_version"

# 检查依赖是否安装
echo "🔍 检查项目依赖..."

if [ ! -d "node_modules" ]; then
    echo "📦 安装根目录依赖..."
    npm install
fi

# 检查各模块依赖
for module in "chat-ui" "chat-core" "ai-service" "chat-session"; do
    if [ -d "$module" ] && [ ! -d "$module/node_modules" ]; then
        echo "📦 安装 $module 依赖..."
        cd "$module" && npm install && cd ..
    fi
done

# 设置各模块环境变量
echo "⚙️  设置环境变量..."
node scripts/setup-env.js

# 检查 Redis 连接（可选）
echo "🔍 检查 Redis 连接..."
redis_check=$(redis-cli ping 2>/dev/null)
if [ "$redis_check" = "PONG" ]; then
    echo "✅ Redis 连接正常"
else
    echo "⚠️  Redis 连接失败，请确保 Redis 服务已启动"
    echo "💡 安装 Redis: brew install redis (macOS) 或 apt install redis-server (Ubuntu)"
    echo "💡 启动 Redis: redis-server"
fi

# 启动所有服务
echo ""
echo "🚀 启动所有开发服务..."
echo "📋 服务列表:"
echo "  - chat-ui (前端): http://localhost:5173"
echo "  - chat-core (API网关): http://localhost:3001"
echo "  - ai-service (AI服务): http://localhost:3002"
echo "  - chat-session (会话): http://localhost:3003"
echo ""
echo "⚠️  按 Ctrl+C 停止所有服务"
echo ""

# 设置信号处理
trap 'echo ""; echo "🛑 收到停止信号，正在清理进程..."; ./scripts/kill-dev.sh; exit 0' INT TERM

# 使用 npm run dev 启动
npm run dev

# 如果 npm run dev 退出，也执行清理
echo "🛑 服务已停止，清理残留进程..."
./scripts/kill-dev.sh 