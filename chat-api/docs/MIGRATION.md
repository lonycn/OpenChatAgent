# 🔄 Chat API 迁移指南

## 📋 目录
- [迁移概述](#迁移概述)
- [数据迁移](#数据迁移)
- [服务迁移](#服务迁移)
- [配置迁移](#配置迁移)
- [测试验证](#测试验证)
- [回滚方案](#回滚方案)

## 🎯 迁移概述

### 📊 迁移范围
从多个 Node.js 微服务迁移到统一的 Python 服务：

| 原服务 | 端口 | 新模块 | 迁移状态 |
|--------|------|--------|----------|
| chat-core | 8001 | websocket/ | ✅ 规划完成 |
| ai-service | 8003 | ai/ | ✅ 规划完成 |
| chat-session | 8004 | session/ | ✅ 规划完成 |
| chat-admin | 8005 | admin/ | ✅ 规划完成 |

### 🎯 迁移目标
- **统一技术栈**: Node.js → Python
- **简化架构**: 4个服务 → 1个服务
- **提升性能**: 异步处理 + 连接池优化
- **增强可维护性**: 统一代码风格和规范

### ⏱️ 迁移时间线
- **第1-2周**: 数据迁移和基础框架
- **第3-4周**: 核心功能实现
- **第5-6周**: 测试和优化
- **第7-8周**: 生产部署和切换

## 💾 数据迁移

### 🗄️ 数据库结构对比

#### MySQL 数据 (保持不变)
```sql
-- 现有表结构保持不变
- users (用户表)
- customer_contacts (客户表)  
- conversations (对话表)
- messages (消息表)
- labels (标签表)
- teams (团队表)
```

#### Redis 数据结构调整
```python
# 原 Node.js 格式
session:{session_id} = {
  "userId": "user123",
  "agent": "ai",
  "context": {...}
}

# 新 Python 格式  
session:{session_id} = {
  "user_id": "user123",
  "agent_type": "ai", 
  "context": {...},
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### 📋 数据迁移脚本

#### 1️⃣ Redis 数据迁移
```python
# scripts/migrate_redis.py
import redis
import json
from datetime import datetime

async def migrate_redis_sessions():
    """迁移 Redis 会话数据"""
    old_redis = redis.Redis(host='localhost', port=6379, db=0)
    new_redis = redis.Redis(host='localhost', port=6379, db=1)
    
    # 获取所有会话键
    session_keys = old_redis.keys('session:*')
    
    for key in session_keys:
        old_data = json.loads(old_redis.get(key))
        
        # 转换数据格式
        new_data = {
            'user_id': old_data.get('userId'),
            'agent_type': old_data.get('agent', 'ai'),
            'context': old_data.get('context', {}),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # 写入新格式
        new_redis.set(key, json.dumps(new_data))
        print(f"Migrated {key}")
    
    print(f"Migrated {len(session_keys)} sessions")

if __name__ == "__main__":
    import asyncio
    asyncio.run(migrate_redis_sessions())
```

#### 2️⃣ 配置数据迁移
```python
# scripts/migrate_config.py
import json
import yaml

def migrate_env_config():
    """迁移环境配置"""
    # Node.js .env 映射到 Python .env
    node_env_mapping = {
        'PORT': 'PORT',
        'DB_HOST': 'DATABASE_URL',  # 需要格式转换
        'REDIS_HOST': 'REDIS_URL',  # 需要格式转换
        'JWT_SECRET': 'JWT_SECRET_KEY',
        'DASHSCOPE_API_KEY': 'DASHSCOPE_API_KEY'
    }
    
    # 读取原配置
    with open('../.env', 'r') as f:
        old_config = {}
        for line in f:
            if '=' in line:
                key, value = line.strip().split('=', 1)
                old_config[key] = value
    
    # 生成新配置
    new_config = {}
    for old_key, new_key in node_env_mapping.items():
        if old_key in old_config:
            if new_key == 'DATABASE_URL':
                # 转换数据库URL格式
                host = old_config.get('DB_HOST', 'localhost')
                port = old_config.get('DB_PORT', '3306')
                user = old_config.get('DB_USER', 'root')
                password = old_config.get('DB_PASSWORD', '')
                database = old_config.get('DB_NAME', 'chat_api')
                new_config[new_key] = f"mysql+asyncmy://{user}:{password}@{host}:{port}/{database}"
            elif new_key == 'REDIS_URL':
                # 转换Redis URL格式
                host = old_config.get('REDIS_HOST', 'localhost')
                port = old_config.get('REDIS_PORT', '6379')
                new_config[new_key] = f"redis://{host}:{port}/0"
            else:
                new_config[new_key] = old_config[old_key]
    
    # 写入新配置
    with open('chat-api/.env', 'w') as f:
        for key, value in new_config.items():
            f.write(f"{key}={value}\n")
    
    print("Configuration migrated successfully")

if __name__ == "__main__":
    migrate_env_config()
```

## 🔧 服务迁移

### 📡 WebSocket 服务迁移

#### Node.js 原实现
```javascript
// chat-core/src/services/MessageRouter.js
class MessageRouter {
  async routeMessage(message) {
    const session = await this.sessionManager.getSession(message.sessionId);
    if (session.agent === 'ai') {
      return await this.aiService.sendMessage(message.sessionId, message.text);
    } else {
      return await this.forwardToHuman(message);
    }
  }
}
```

#### Python 新实现
```python
# src/websocket/router.py
class MessageRouter:
    async def route_message(self, message: Message) -> Response:
        session = await self.session_service.get_session(message.session_id)
        if session.agent_type == 'ai':
            return await self.ai_service.send_message(message.session_id, message.content)
        else:
            return await self.forward_to_human(message)
```

### 🤖 AI 服务迁移

#### Node.js 原实现
```javascript
// ai-service/src/client.js
class DashScopeClient {
  async sendMessage(sessionId, message) {
    const response = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      model: 'qwen-turbo',
      input: { messages: [{ role: 'user', content: message }] }
    });
    return response.data.output.text;
  }
}
```

#### Python 新实现
```python
# src/ai/dashscope.py
class DashScopeClient:
    async def send_message(self, session_id: str, message: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                json={
                    'model': 'qwen-turbo',
                    'input': {'messages': [{'role': 'user', 'content': message}]}
                },
                headers={'Authorization': f'Bearer {self.api_key}'}
            )
            return response.json()['output']['text']
```

### 💾 会话服务迁移

#### Node.js 原实现
```javascript
// chat-session/src/managers/SessionManager.js
class SessionManager {
  async createSession(userId, metadata = {}) {
    const sessionId = uuidv4();
    const sessionData = {
      userId,
      agent: 'ai',
      metadata,
      createdAt: new Date().toISOString()
    };
    await this.redis.set(`session:${sessionId}`, JSON.stringify(sessionData));
    return { sessionId, ...sessionData };
  }
}
```

#### Python 新实现
```python
# src/session/manager.py
class SessionManager:
    async def create_session(self, user_id: str, metadata: dict = None) -> Session:
        session_id = str(uuid4())
        session_data = Session(
            session_id=session_id,
            user_id=user_id,
            agent_type='ai',
            metadata=metadata or {},
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        await self.redis.set(f"session:{session_id}", session_data.json())
        return session_data
```

## ⚙️ 配置迁移

### 📋 环境变量对照表

| Node.js 配置 | Python 配置 | 说明 |
|-------------|-------------|------|
| `PORT` | `PORT` | 服务端口 |
| `DB_HOST` | `DATABASE_URL` | 数据库连接 |
| `REDIS_HOST` | `REDIS_URL` | Redis连接 |
| `JWT_SECRET` | `JWT_SECRET_KEY` | JWT密钥 |
| `DASHSCOPE_API_KEY` | `DASHSCOPE_API_KEY` | AI服务密钥 |

### 🔧 配置文件迁移

#### package.json → pyproject.toml
```toml
[project]
name = "chat-api"
version = "1.0.0"
description = "Unified Chat API Service"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn>=0.24.0",
    "websockets>=12.0",
    "sqlalchemy>=2.0.0",
    "redis>=5.0.0",
    "httpx>=0.25.0"
]

[project.scripts]
start = "uvicorn src.main:app --host 0.0.0.0 --port 8000"
dev = "uvicorn src.main:app --reload --host 0.0.0.0 --port 8000"
```

## 🧪 测试验证

### 📋 迁移测试清单

#### 1️⃣ 功能测试
```python
# tests/test_migration.py
import pytest
import asyncio
from src.main import app
from fastapi.testclient import TestClient

def test_websocket_connection():
    """测试WebSocket连接"""
    client = TestClient(app)
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({"type": "ping"})
        data = websocket.receive_json()
        assert data["type"] == "pong"

async def test_ai_service():
    """测试AI服务"""
    from src.ai.dashscope import DashScopeClient
    client = DashScopeClient(api_key="test-key")
    # Mock测试
    response = await client.send_message("test-session", "Hello")
    assert isinstance(response, str)

async def test_session_management():
    """测试会话管理"""
    from src.session.manager import SessionManager
    manager = SessionManager()
    session = await manager.create_session("test-user")
    assert session.user_id == "test-user"
    assert session.agent_type == "ai"
```

#### 2️⃣ 性能测试
```python
# tests/test_performance.py
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

async def test_concurrent_requests():
    """测试并发请求性能"""
    start_time = time.time()
    
    # 模拟100个并发请求
    tasks = []
    for i in range(100):
        task = asyncio.create_task(make_request(f"test-{i}"))
        tasks.append(task)
    
    await asyncio.gather(*tasks)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"100 concurrent requests completed in {duration:.2f} seconds")
    assert duration < 10  # 应该在10秒内完成
```

#### 3️⃣ 数据一致性测试
```python
# tests/test_data_consistency.py
async def test_session_data_consistency():
    """测试会话数据一致性"""
    # 创建会话
    session = await session_manager.create_session("test-user")
    
    # 从Redis读取
    redis_data = await redis_client.get(f"session:{session.session_id}")
    redis_session = json.loads(redis_data)
    
    # 验证数据一致性
    assert redis_session["user_id"] == session.user_id
    assert redis_session["agent_type"] == session.agent_type
```

## 🔄 回滚方案

### 📋 回滚准备

#### 1️⃣ 数据备份
```bash
# 备份MySQL数据
mysqldump -u root -p chat_api > backup_before_migration.sql

# 备份Redis数据
redis-cli --rdb backup_redis.rdb

# 备份配置文件
cp -r config/ config_backup/
```

#### 2️⃣ 服务回滚脚本
```bash
#!/bin/bash
# scripts/rollback.sh

echo "Starting rollback process..."

# 停止新服务
docker-compose -f docker-compose.new.yml down

# 恢复原服务
docker-compose -f docker-compose.old.yml up -d

# 恢复数据库
mysql -u root -p chat_api < backup_before_migration.sql

# 恢复Redis
redis-cli --rdb backup_redis.rdb

# 恢复配置
cp -r config_backup/* config/

echo "Rollback completed successfully"
```

### 🚨 回滚触发条件
- 新服务启动失败
- 关键功能异常
- 性能严重下降
- 数据丢失或损坏

### ⏱️ 回滚时间窗口
- **自动回滚**: 5分钟内检测到严重问题
- **手动回滚**: 30分钟内决策
- **完全回滚**: 2小时内完成

## 📊 迁移监控

### 📈 关键指标
- **服务可用性**: 99.9%+
- **响应时间**: <100ms (P95)
- **错误率**: <0.1%
- **WebSocket连接**: 稳定性监控

### 🔍 监控脚本
```python
# scripts/monitor_migration.py
import asyncio
import httpx
import time

async def monitor_service_health():
    """监控服务健康状态"""
    while True:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8000/health")
                if response.status_code == 200:
                    print(f"✅ Service healthy at {time.strftime('%Y-%m-%d %H:%M:%S')}")
                else:
                    print(f"❌ Service unhealthy: {response.status_code}")
        except Exception as e:
            print(f"❌ Service check failed: {e}")
        
        await asyncio.sleep(30)  # 每30秒检查一次

if __name__ == "__main__":
    asyncio.run(monitor_service_health())
```

这个迁移指南提供了完整的迁移流程，确保从Node.js到Python的平滑过渡。
