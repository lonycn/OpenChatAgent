# 🚀 Chat API 快速启动指南

本指南将帮助你在5分钟内启动Chat API服务。

## 📋 前置要求

- **Python**: 3.11+
- **MySQL**: 8.0+ (本机安装，用户名: root, 密码: 123456)
- **Redis**: 7.0+ (可选，使用Docker)
- **Git**: 用于克隆项目

## 🔧 快速安装

### 1. 克隆项目

```bash
git clone <repository-url>
cd chat-api
```

### 2. 创建虚拟环境

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：

```env
# 基础配置
APP_NAME=Chat API
ENVIRONMENT=development
DEBUG=true

# 数据库配置（使用本机MySQL）
DATABASE_URL=mysql+asyncmy://root:123456@localhost:3306/chat_api

# Redis配置
REDIS_URL=redis://localhost:6379/0

# JWT配置
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# AI服务配置（可选）
DASHSCOPE_API_KEY=your-dashscope-api-key
OPENAI_API_KEY=your-openai-api-key
```

### 5. 创建数据库

```bash
# 连接MySQL创建数据库
mysql -u root -p123456 -e "CREATE DATABASE chat_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 6. 初始化数据库

```bash
python scripts/init_db.py
```

### 7. 启动Redis（如果没有本机Redis）

```bash
# 使用Docker启动Redis
docker run -d --name chat-redis -p 6379:6379 redis:7-alpine
```

### 8. 启动服务

```bash
python run.py
```

或者使用uvicorn：

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## 🎉 验证安装

### 1. 检查服务状态

访问健康检查端点：
```bash
curl http://localhost:8000/health
```

### 2. 查看API文档

打开浏览器访问：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 3. 测试用户注册

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test User",
    "role": "agent"
  }'
```

### 4. 测试用户登录

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### 5. 测试WebSocket连接

使用WebSocket客户端连接：
```
ws://localhost:8000/ws
```

发送认证消息：
```json
{
  "type": "auth",
  "session_id": "test-session-123"
}
```

## 🔐 默认用户账户

数据库初始化后会创建以下默认账户：

### 管理员账户
- **邮箱**: admin@chatapi.com
- **密码**: admin123456
- **角色**: admin

### 测试客服账户
- **邮箱**: agent@chatapi.com
- **密码**: agent123456
- **角色**: agent

## 🐳 Docker 快速启动

如果你偏好使用Docker：

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f chat-api

# 停止服务
docker-compose down
```

## 📊 监控和指标

启动后可以访问：

- **应用指标**: http://localhost:8000/metrics
- **Prometheus**: http://localhost:9091 (如果使用Docker Compose)
- **Grafana**: http://localhost:3000 (如果使用Docker Compose，用户名/密码: admin/admin)

## 🧪 运行测试

```bash
# 安装测试依赖
pip install pytest pytest-asyncio

# 运行测试
pytest

# 运行特定测试
pytest tests/test_auth.py

# 生成覆盖率报告
pytest --cov=src --cov-report=html
```

## 🔧 常见问题

### Q: 数据库连接失败
A: 确保MySQL服务正在运行，用户名密码正确，数据库已创建。

### Q: Redis连接失败
A: 确保Redis服务正在运行，或使用Docker启动Redis。

### Q: AI服务不可用
A: 检查AI服务API密钥是否正确配置，网络是否可以访问AI服务。

### Q: WebSocket连接失败
A: 确保防火墙允许8000端口，检查WebSocket客户端配置。

## 📚 下一步

- 阅读 [API文档](docs/API.md) 了解详细的接口说明
- 查看 [架构文档](docs/ARCHITECTURE.md) 了解系统设计
- 参考 [部署指南](docs/DEPLOYMENT.md) 进行生产环境部署

## 🆘 获取帮助

如果遇到问题：

1. 查看日志文件：`logs/app.log`
2. 检查服务状态：`http://localhost:8000/health`
3. 查看项目文档：`docs/` 目录
4. 提交Issue：项目GitHub页面

---

🎉 恭喜！你已经成功启动了Chat API服务。现在可以开始使用统一的聊天服务平台了！
