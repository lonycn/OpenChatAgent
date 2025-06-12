#!/bin/bash

# OpenChatAgent PM2 进程管理启动脚本
# 提供可视化监控和高级进程管理功能

echo "🚀 OpenChatAgent PM2 进程管理器启动..."

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 未安装，正在安装..."
    npm install -g pm2
fi

echo "✅ PM2 版本: $(pm2 -v)"

# 同步环境配置
echo "⚙️  同步环境配置..."
node scripts/sync-env.js

# 清理可能残留的PM2进程
echo "🛑 清理可能残留的PM2进程..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# 等待进程完全停止
sleep 3

# 创建日志目录
mkdir -p logs

echo "🚀 启动所有服务 (使用 PM2)..."
pm2 start ecosystem.config.js

echo ""
echo "📊 服务状态："
pm2 status

echo ""
echo "🌐 访问地址："
echo "  - chat-ui (用户前端): http://localhost:8001"
echo "  - chat-core (API网关): http://localhost:8002"
echo "  - ai-service (AI服务): http://localhost:8003"
echo "  - chat-session (会话服务): http://localhost:8004"
echo "  - chat-admin (管理后台API): http://localhost:8005"
echo "  - chat-admin-ui (管理后台前端): http://localhost:8006"

echo ""
echo "📋 PM2 管理命令："
echo "  pm2 status           - 查看所有服务状态"
echo "  pm2 logs             - 查看所有日志"
echo "  pm2 logs [name]      - 查看指定服务日志"
echo "  pm2 monit            - 打开监控界面 (终端)"
echo "  pm2 plus             - 开启 PM2+ 网页监控"
echo "  pm2 restart all      - 重启所有服务"
echo "  pm2 stop all         - 停止所有服务"
echo "  pm2 delete all       - 删除所有服务"

echo ""
echo "🎯 快速操作："
echo "  npm run pm2:status   - 查看状态"
echo "  npm run pm2:logs     - 查看日志"
echo "  npm run pm2:monit    - 监控界面"
echo "  npm run pm2:stop     - 停止服务"

echo ""
echo "💡 提示："
echo "  - 使用 'pm2 monit' 打开终端监控界面"
echo "  - 使用 'pm2 plus' 注册免费的网页监控"
echo "  - 所有日志文件保存在 ./logs/ 目录"

echo ""
echo "✅ PM2 启动完成！所有服务正在后台运行..." 