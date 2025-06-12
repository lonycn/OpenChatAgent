@echo off
setlocal enabledelayedexpansion

echo 🤖 OpenChatAgent 开发环境启动...

REM 检查是否存在 .env 文件
if not exist ".env" (
    echo ⚠️ 根目录 .env 文件不存在
    if exist ".env.example" (
        echo 📋 从 .env.example 复制创建 .env...
        copy ".env.example" ".env" >nul
        echo ✅ .env 文件已创建，请编辑其中的配置项
        echo ⚠️ 特别注意：请设置正确的 DASHSCOPE_API_KEY
    ) else (
        echo ❌ .env.example 文件也不存在，请检查项目完整性
        pause
        exit /b 1
    )
)

REM 检查 Node.js 版本
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js ^(^>= 16.0.0^)
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set node_version=%%i
echo ✅ Node.js 版本: !node_version!

REM 检查 npm 版本
npm -v >nul 2>&1
if errorlevel 1 (
    echo ❌ npm 未安装
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set npm_version=%%i
echo ✅ npm 版本: !npm_version!

REM 检查依赖是否安装
echo 🔍 检查项目依赖...

if not exist "node_modules" (
    echo 📦 安装根目录依赖...
    npm install
)

REM 检查各模块依赖
for %%m in (chat-ui chat-core ai-service chat-session) do (
    if exist "%%m" (
        if not exist "%%m\node_modules" (
            echo 📦 安装 %%m 依赖...
            cd "%%m"
            npm install
            cd ..
        )
    )
)

REM 设置各模块环境变量
echo ⚙️ 设置环境变量...
node scripts/setup-env.js

REM 检查 Redis 连接（可选）
echo 🔍 检查 Redis 连接...
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Redis 连接失败，请确保 Redis 服务已启动
    echo 💡 Windows Redis 下载: https://github.com/microsoftarchive/redis/releases
) else (
    echo ✅ Redis 连接正常
)

REM 启动所有服务
echo.
echo 🚀 启动所有开发服务...
echo 📋 服务列表:
echo   - chat-ui (用户前端): http://localhost:8001
echo   - chat-core (API网关): http://localhost:8002
echo   - ai-service (AI服务): http://localhost:8003
echo   - chat-session (会话服务): http://localhost:8004
echo   - admin-api (管理后台API): http://localhost:8005
echo   - admin-ui (管理后台前端): http://localhost:8006
echo.
echo ⚠️ 按 Ctrl+C 停止所有服务
echo.

REM 使用 npm run dev 启动
npm run dev

pause 