#!/bin/bash

# OpenChatAgent v3.0 强制清理所有开发进程的脚本
# 用于清理可能残留的开发服务进程

echo "🛑 强制清理所有开发进程..."

# 清理 Python 相关进程
echo "  🐍 清理 Python 进程..."
pkill -f "python.*run.py" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null
pkill -f "fastapi" 2>/dev/null

# 清理 Node.js 相关进程
echo "  🔄 清理 Node.js 进程..."
pkill -f "npm.*dev" 2>/dev/null
pkill -f "vite.*8001" 2>/dev/null
pkill -f "max.*dev" 2>/dev/null
pkill -f "webpack" 2>/dev/null
pkill -f "umi" 2>/dev/null

# 清理可能的端口占用
echo "  🔌 释放端口..."
for port in 8000 8001 8006; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "    释放端口 $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

# 清理临时文件
echo "  🗑️  清理临时文件..."
rm -f .dev_pids 2>/dev/null
rm -f chat-api/start_api.sh 2>/dev/null

# 等待进程完全停止
sleep 2

echo "✅ 清理完成"
echo ""
echo "💡 提示："
echo "  - 如需重新启动开发环境，请运行: ./start-dev-new.sh"
echo "  - 如需查看服务状态，请运行: ./scripts/check-status.sh"
echo ""
