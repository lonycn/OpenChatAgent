# 🚀 Chat API 部署指南

## 📋 目录
- [环境要求](#环境要求)
- [本地开发](#本地开发)
- [Docker 部署](#docker-部署)
- [生产环境](#生产环境)
- [监控配置](#监控配置)
- [故障排查](#故障排查)

## 🔧 环境要求

### 🐍 Python 环境
- **Python**: 3.11+
- **pip**: 最新版本
- **虚拟环境**: venv 或 conda

### 💾 数据库要求
- **MySQL**: 8.0+
- **Redis**: 6.0+

### 🌐 系统要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+)
- **内存**: 最小 2GB，推荐 4GB+
- **CPU**: 最小 2核，推荐 4核+
- **磁盘**: 最小 20GB，推荐 50GB+

## 💻 本地开发

### 1️⃣ 克隆项目
```bash
git clone <repository-url>
cd chat-api
```

### 2️⃣ 创建虚拟环境
```bash
# 使用 venv
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 或使用 conda
conda create -n chat-api python=3.11
conda activate chat-api
```

### 3️⃣ 安装依赖
```bash
pip install -r requirements.txt
```

### 4️⃣ 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 应用配置
APP_NAME=Chat API
APP_VERSION=1.0.0
DEBUG=true
SECRET_KEY=your-secret-key-here

# 服务配置
HOST=0.0.0.0
PORT=8000
WORKERS=1

# 数据库配置
DATABASE_URL=mysql+asyncmy://user:password@localhost:3306/chat_api
REDIS_URL=redis://localhost:6379/0

# AI 服务配置
DASHSCOPE_API_KEY=your-dashscope-api-key
OPENAI_API_KEY=your-openai-api-key  # 可选

# JWT 配置
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### 5️⃣ 初始化数据库
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE chat_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行迁移
python scripts/migrate.py

# 创建初始数据
python scripts/seed.py
```

### 6️⃣ 启动服务
```bash
# 开发模式
python src/main.py

# 或使用 uvicorn
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 7️⃣ 验证部署
```bash
# 健康检查
curl http://localhost:8000/health

# API 文档
open http://localhost:8000/docs
```

## 🐳 Docker 部署

### 📦 Docker Compose (推荐)
```yaml
# docker-compose.yml
version: '3.8'

services:
  chat-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=mysql+asyncmy://chat_user:chat_pass@mysql:3306/chat_api
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - mysql
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: chat_api
      MYSQL_USER: chat_user
      MYSQL_PASSWORD: chat_pass
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - chat-api

volumes:
  mysql_data:
  redis_data:
```

### 🚀 启动服务
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f chat-api

# 停止服务
docker-compose down
```

### 🔧 Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY src/ ./src/
COPY scripts/ ./scripts/

# 创建必要目录
RUN mkdir -p logs uploads

# 设置环境变量
ENV PYTHONPATH=/app

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🏭 生产环境

### 🔒 安全配置

#### 1️⃣ 环境变量
```env
# 生产环境配置
DEBUG=false
SECRET_KEY=complex-random-secret-key
JWT_SECRET_KEY=another-complex-secret-key

# 数据库连接池
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=30

# Redis 连接池
REDIS_POOL_SIZE=20

# 安全配置
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

#### 2️⃣ Nginx 配置
```nginx
# nginx.conf
upstream chat_api {
    server chat-api:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # WebSocket 支持
    location /ws {
        proxy_pass http://chat_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 接口
    location / {
        proxy_pass http://chat_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 文件上传大小限制
        client_max_body_size 10M;
    }
}
```

### 📊 性能优化

#### 1️⃣ 应用配置
```bash
# 使用 Gunicorn + Uvicorn
pip install gunicorn

# 启动命令
gunicorn src.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log \
  --log-level info
```

#### 2️⃣ 数据库优化
```sql
-- MySQL 配置优化
SET GLOBAL innodb_buffer_pool_size = 1073741824;  -- 1GB
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 67108864;  -- 64MB

-- 创建索引
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);
CREATE INDEX idx_conversations_status_updated ON conversations(status, updated_at);
```

#### 3️⃣ Redis 配置
```conf
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 📊 监控配置

### 📈 Prometheus 监控
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'chat-api'
    static_configs:
      - targets: ['chat-api:8000']
    metrics_path: '/metrics'
```

### 📊 Grafana 仪表板
```json
{
  "dashboard": {
    "title": "Chat API Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### 📝 日志聚合
```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /app/logs/*.log
  fields:
    service: chat-api
  fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

## 🔍 故障排查

### 🚨 常见问题

#### 1️⃣ 服务启动失败
```bash
# 检查日志
docker-compose logs chat-api

# 检查端口占用
netstat -tlnp | grep 8000

# 检查环境变量
docker-compose exec chat-api env | grep DATABASE_URL
```

#### 2️⃣ 数据库连接失败
```bash
# 测试数据库连接
mysql -h localhost -u chat_user -p chat_api

# 检查数据库状态
docker-compose exec mysql mysqladmin status
```

#### 3️⃣ Redis 连接失败
```bash
# 测试 Redis 连接
redis-cli -h localhost ping

# 检查 Redis 状态
docker-compose exec redis redis-cli info
```

#### 4️⃣ WebSocket 连接问题
```bash
# 检查 WebSocket 连接
wscat -c ws://localhost:8000/ws

# 检查 Nginx 配置
nginx -t
```

### 📊 性能问题排查
```bash
# 查看系统资源
top
htop
iostat

# 查看应用性能
docker stats

# 查看数据库性能
mysql -e "SHOW PROCESSLIST;"
mysql -e "SHOW ENGINE INNODB STATUS;"
```

### 🔧 维护命令
```bash
# 备份数据库
mysqldump -u root -p chat_api > backup_$(date +%Y%m%d).sql

# 清理日志
find logs/ -name "*.log" -mtime +7 -delete

# 重启服务
docker-compose restart chat-api

# 更新服务
docker-compose pull
docker-compose up -d
```

这个部署指南涵盖了从开发到生产的完整部署流程，确保服务的稳定运行。
