#!/bin/bash

# OpenChatAgent 开发进程清理脚本

echo "🛑 停止 OpenChatAgent 开发进程..."

# 停止所有相关的 npm 进程
echo "📋 查找并停止 npm 进程..."
pkill -f "npm.*dev" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
pkill -f "vite" 2>/dev/null

# 停止特定端口的进程
echo "🔌 释放端口..."
for port in 3001 3002 3003 5173; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "  停止端口 $port 上的进程 (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

# 等待进程完全停止
sleep 2

# 检查是否还有残留进程
echo "🔍 检查残留进程..."
remaining=$(ps aux | grep -E "(npm.*dev|nodemon|vite)" | grep -v grep | wc -l)
if [ $remaining -gt 0 ]; then
    echo "⚠️  发现 $remaining 个残留进程，强制清理..."
    ps aux | grep -E "(npm.*dev|nodemon|vite)" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
else
    echo "✅ 所有进程已清理完毕"
fi

echo "🎉 OpenChatAgent 开发进程清理完成！" 