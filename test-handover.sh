#!/bin/bash

# 转人工功能测试脚本
# 用于测试 chat-front 转人工到 chat-admin 的完整流程

echo "🚀 开始测试转人工功能..."

# 检查必要的端口是否可用
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ $service 正在端口 $port 运行"
        return 0
    else
        echo "❌ $service 未在端口 $port 运行"
        return 1
    fi
}

# 启动服务函数
start_service() {
    local service=$1
    local port=$2
    local dir=$3
    local command=$4
    
    echo "🔄 启动 $service..."
    cd "$dir"
    
    if [[ "$service" == "chat-api" ]]; then
        # 检查虚拟环境
        if [[ ! -d "venv" ]]; then
            echo "📦 创建虚拟环境..."
            python3 -m venv venv
        fi
        
        source venv/bin/activate
        
        # 安装依赖
        if [[ ! -f "venv/.deps_installed" ]]; then
            echo "📦 安装 Python 依赖..."
            pip install -r requirements.txt
            touch venv/.deps_installed
        fi
        
        # 启动 API 服务
        echo "🚀 启动 chat-api 服务..."
        uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
        API_PID=$!
        echo "chat-api PID: $API_PID"
        
    elif [[ "$service" == "chat-front" ]]; then
        # 检查 node_modules
        if [[ ! -d "node_modules" ]]; then
            echo "📦 安装 Node.js 依赖..."
            npm install
        fi
        
        # 启动前端服务
        echo "🚀 启动 chat-front 服务..."
        npm run dev &
        FRONT_PID=$!
        echo "chat-front PID: $FRONT_PID"
        
    elif [[ "$service" == "chat-admin" ]]; then
        # 检查 node_modules
        if [[ ! -d "node_modules" ]]; then
            echo "📦 安装 Node.js 依赖..."
            npm install
        fi
        
        # 启动管理后台
        echo "🚀 启动 chat-admin 服务..."
        npm run dev &
        ADMIN_PID=$!
        echo "chat-admin PID: $ADMIN_PID"
    fi
    
    cd - > /dev/null
}

# 等待服务启动
wait_for_service() {
    local port=$1
    local service=$2
    local max_wait=30
    local count=0
    
    echo "⏳ 等待 $service 启动..."
    while ! check_port $port "$service" && [ $count -lt $max_wait ]; do
        sleep 2
        count=$((count + 1))
        echo "   等待中... ($count/$max_wait)"
    done
    
    if [ $count -eq $max_wait ]; then
        echo "❌ $service 启动超时"
        return 1
    fi
    
    echo "✅ $service 启动成功"
    return 0
}

# 清理函数
cleanup() {
    echo "🧹 清理进程..."
    
    if [[ -n "$API_PID" ]]; then
        kill $API_PID 2>/dev/null
        echo "已停止 chat-api (PID: $API_PID)"
    fi
    
    if [[ -n "$FRONT_PID" ]]; then
        kill $FRONT_PID 2>/dev/null
        echo "已停止 chat-front (PID: $FRONT_PID)"
    fi
    
    if [[ -n "$ADMIN_PID" ]]; then
        kill $ADMIN_PID 2>/dev/null
        echo "已停止 chat-admin (PID: $ADMIN_PID)"
    fi
    
    # 清理可能残留的进程
    pkill -f "uvicorn.*chat-api" 2>/dev/null
    pkill -f "vite.*chat-front" 2>/dev/null
    pkill -f "vite.*chat-admin" 2>/dev/null
    
    echo "✅ 清理完成"
}

# 设置信号处理
trap cleanup EXIT INT TERM

# 主流程
main() {
    echo "🔍 检查当前服务状态..."
    
    # 检查服务是否已经运行
    if check_port 8000 "chat-api" && check_port 5173 "chat-front" && check_port 5174 "chat-admin"; then
        echo "✅ 所有服务都已运行"
    else
        echo "🚀 启动必要的服务..."
        
        # 启动 chat-api
        if ! check_port 8000 "chat-api"; then
            start_service "chat-api" 8000 "./chat-api"
            wait_for_service 8000 "chat-api" || exit 1
        fi
        
        # 启动 chat-front
        if ! check_port 5173 "chat-front"; then
            start_service "chat-front" 5173 "./chat-front"
            wait_for_service 5173 "chat-front" || exit 1
        fi
        
        # 启动 chat-admin
        if ! check_port 5174 "chat-admin"; then
            start_service "chat-admin" 5174 "./chat-admin"
            wait_for_service 5174 "chat-admin" || exit 1
        fi
    fi
    
    echo ""
    echo "🎉 所有服务启动完成！"
    echo ""
    echo "📋 服务地址："
    echo "   🔧 chat-api:   http://localhost:8000"
    echo "   📱 chat-front: http://localhost:5173"
    echo "   👥 chat-admin: http://localhost:5174"
    echo ""
    echo "📖 测试步骤："
    echo "   1. 打开 chat-front (http://localhost:5173)"
    echo "   2. 发送消息与AI对话"
    echo "   3. 点击'转人工'按钮"
    echo "   4. 打开 chat-admin (http://localhost:5174)"
    echo "   5. 查看转人工请求并进行人工回复"
    echo ""
    echo "🔍 API 文档: http://localhost:8000/docs"
    echo ""
    echo "按 Ctrl+C 停止所有服务..."
    
    # 保持脚本运行
    while true; do
        sleep 5
        
        # 检查服务是否还在运行
        if ! check_port 8000 "chat-api" || ! check_port 5173 "chat-front" || ! check_port 5174 "chat-admin"; then
            echo "⚠️  检测到服务异常，正在重启..."
            break
        fi
    done
}

# 运行主函数
main
