"""
🔴 Chat API Redis 核心模块

提供 Redis 连接、缓存管理和会话存储
支持异步操作和连接池管理
"""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Union

import redis.asyncio as redis
from loguru import logger
from redis.asyncio import ConnectionPool, Redis

from src.config.settings import get_settings

# 获取配置
settings = get_settings()

# 全局变量
redis_client: Optional[Redis] = None
session_redis: Optional[Redis] = None
cache_redis: Optional[Redis] = None
queue_redis: Optional[Redis] = None


async def init_redis() -> None:
    """
    初始化 Redis 连接
    创建不同用途的 Redis 客户端
    """
    global redis_client, session_redis, cache_redis, queue_redis
    
    try:
        logger.info("🔄 Initializing Redis connections...")
        
        # 解析 Redis URL
        redis_url = settings.REDIS_URL
        
        # 创建连接池
        pool = ConnectionPool.from_url(
            redis_url,
            max_connections=settings.REDIS_POOL_SIZE,
            socket_timeout=settings.REDIS_POOL_TIMEOUT,
            socket_connect_timeout=settings.REDIS_POOL_TIMEOUT,
            retry_on_timeout=True,
            health_check_interval=30,
            decode_responses=True,  # 自动解码响应
        )
        
        # 主 Redis 客户端
        redis_client = Redis(connection_pool=pool)
        
        # 会话存储 Redis 客户端
        session_pool = ConnectionPool.from_url(
            redis_url.replace(f"/{redis_url.split('/')[-1]}", f"/{settings.REDIS_SESSION_DB}"),
            max_connections=settings.REDIS_POOL_SIZE,
            decode_responses=True,
        )
        session_redis = Redis(connection_pool=session_pool)
        
        # 缓存 Redis 客户端
        cache_pool = ConnectionPool.from_url(
            redis_url.replace(f"/{redis_url.split('/')[-1]}", f"/{settings.REDIS_CACHE_DB}"),
            max_connections=settings.REDIS_POOL_SIZE,
            decode_responses=True,
        )
        cache_redis = Redis(connection_pool=cache_pool)
        
        # 队列 Redis 客户端
        queue_pool = ConnectionPool.from_url(
            redis_url.replace(f"/{redis_url.split('/')[-1]}", f"/{settings.REDIS_QUEUE_DB}"),
            max_connections=settings.REDIS_POOL_SIZE,
            decode_responses=True,
        )
        queue_redis = Redis(connection_pool=queue_pool)
        
        # 测试连接
        await _test_connections()
        
        logger.info("✅ Redis connections initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Redis: {e}")
        raise


async def close_redis() -> None:
    """
    关闭 Redis 连接
    清理资源
    """
    global redis_client, session_redis, cache_redis, queue_redis
    
    try:
        logger.info("🔄 Closing Redis connections...")
        
        clients = [redis_client, session_redis, cache_redis, queue_redis]
        for client in clients:
            if client:
                await client.close()
        
        redis_client = session_redis = cache_redis = queue_redis = None
        
        logger.info("✅ Redis connections closed")
        
    except Exception as e:
        logger.error(f"❌ Error closing Redis: {e}")


async def _test_connections() -> None:
    """
    测试 Redis 连接
    确保所有连接正常工作
    """
    try:
        # 测试主连接
        await redis_client.ping()
        logger.info("✅ Main Redis connection test passed")
        
        # 测试会话连接
        await session_redis.ping()
        logger.info("✅ Session Redis connection test passed")
        
        # 测试缓存连接
        await cache_redis.ping()
        logger.info("✅ Cache Redis connection test passed")
        
        # 测试队列连接
        await queue_redis.ping()
        logger.info("✅ Queue Redis connection test passed")
        
    except Exception as e:
        logger.error(f"❌ Redis connection test failed: {e}")
        raise


class RedisManager:
    """
    Redis 管理器
    提供高级 Redis 操作方法
    """
    
    def __init__(self):
        self.client = redis_client
        self.session = session_redis
        self.cache = cache_redis
        self.queue = queue_redis
    
    # ==========================================
    # 🔧 基础操作
    # ==========================================
    
    async def get(self, key: str, db: str = "main") -> Optional[str]:
        """获取值"""
        client = self._get_client(db)
        return await client.get(key)
    
    async def set(
        self, 
        key: str, 
        value: Union[str, dict, list], 
        expire: Optional[int] = None,
        db: str = "main"
    ) -> bool:
        """设置值"""
        client = self._get_client(db)
        
        # 序列化复杂数据类型
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False)
        
        return await client.set(key, value, ex=expire)
    
    async def delete(self, key: str, db: str = "main") -> int:
        """删除键"""
        client = self._get_client(db)
        return await client.delete(key)
    
    async def exists(self, key: str, db: str = "main") -> bool:
        """检查键是否存在"""
        client = self._get_client(db)
        return bool(await client.exists(key))
    
    async def expire(self, key: str, seconds: int, db: str = "main") -> bool:
        """设置过期时间"""
        client = self._get_client(db)
        return await client.expire(key, seconds)
    
    async def ttl(self, key: str, db: str = "main") -> int:
        """获取剩余过期时间"""
        client = self._get_client(db)
        return await client.ttl(key)
    
    # ==========================================
    # 📊 JSON 操作
    # ==========================================
    
    async def get_json(self, key: str, db: str = "main") -> Optional[Union[dict, list]]:
        """获取 JSON 数据"""
        value = await self.get(key, db)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.warning(f"⚠️ Failed to decode JSON for key: {key}")
                return None
        return None
    
    async def set_json(
        self, 
        key: str, 
        value: Union[dict, list], 
        expire: Optional[int] = None,
        db: str = "main"
    ) -> bool:
        """设置 JSON 数据"""
        return await self.set(key, value, expire, db)
    
    # ==========================================
    # 📝 哈希操作
    # ==========================================
    
    async def hget(self, key: str, field: str, db: str = "main") -> Optional[str]:
        """获取哈希字段值"""
        client = self._get_client(db)
        return await client.hget(key, field)
    
    async def hset(self, key: str, field: str, value: str, db: str = "main") -> int:
        """设置哈希字段值"""
        client = self._get_client(db)
        return await client.hset(key, field, value)
    
    async def hgetall(self, key: str, db: str = "main") -> Dict[str, str]:
        """获取所有哈希字段"""
        client = self._get_client(db)
        return await client.hgetall(key)
    
    async def hdel(self, key: str, *fields: str, db: str = "main") -> int:
        """删除哈希字段"""
        client = self._get_client(db)
        return await client.hdel(key, *fields)
    
    # ==========================================
    # 📋 列表操作
    # ==========================================
    
    async def lpush(self, key: str, *values: str, db: str = "main") -> int:
        """左侧推入列表"""
        client = self._get_client(db)
        return await client.lpush(key, *values)
    
    async def rpush(self, key: str, *values: str, db: str = "main") -> int:
        """右侧推入列表"""
        client = self._get_client(db)
        return await client.rpush(key, *values)
    
    async def lpop(self, key: str, db: str = "main") -> Optional[str]:
        """左侧弹出列表"""
        client = self._get_client(db)
        return await client.lpop(key)
    
    async def rpop(self, key: str, db: str = "main") -> Optional[str]:
        """右侧弹出列表"""
        client = self._get_client(db)
        return await client.rpop(key)
    
    async def lrange(self, key: str, start: int = 0, end: int = -1, db: str = "main") -> List[str]:
        """获取列表范围"""
        client = self._get_client(db)
        return await client.lrange(key, start, end)
    
    async def llen(self, key: str, db: str = "main") -> int:
        """获取列表长度"""
        client = self._get_client(db)
        return await client.llen(key)
    
    # ==========================================
    # 🔢 计数器操作
    # ==========================================
    
    async def incr(self, key: str, amount: int = 1, db: str = "main") -> int:
        """递增计数器"""
        client = self._get_client(db)
        return await client.incr(key, amount)
    
    async def decr(self, key: str, amount: int = 1, db: str = "main") -> int:
        """递减计数器"""
        client = self._get_client(db)
        return await client.decr(key, amount)
    
    # ==========================================
    # 🔍 模式操作
    # ==========================================
    
    async def keys(self, pattern: str = "*", db: str = "main") -> List[str]:
        """获取匹配的键"""
        client = self._get_client(db)
        return await client.keys(pattern)
    
    async def scan(self, cursor: int = 0, match: str = "*", count: int = 10, db: str = "main"):
        """扫描键"""
        client = self._get_client(db)
        return await client.scan(cursor, match, count)
    
    # ==========================================
    # 📊 统计信息
    # ==========================================
    
    async def info(self, section: str = "all", db: str = "main") -> Dict[str, Any]:
        """获取 Redis 信息"""
        client = self._get_client(db)
        return await client.info(section)
    
    async def dbsize(self, db: str = "main") -> int:
        """获取数据库大小"""
        client = self._get_client(db)
        return await client.dbsize()
    
    async def memory_usage(self, key: str, db: str = "main") -> Optional[int]:
        """获取键的内存使用量"""
        client = self._get_client(db)
        try:
            return await client.memory_usage(key)
        except Exception:
            return None
    
    # ==========================================
    # 🔧 工具方法
    # ==========================================
    
    def _get_client(self, db: str) -> Redis:
        """获取指定的 Redis 客户端"""
        clients = {
            "main": self.client,
            "session": self.session,
            "cache": self.cache,
            "queue": self.queue,
        }
        
        client = clients.get(db)
        if not client:
            raise ValueError(f"Unknown Redis database: {db}")
        
        return client
    
    async def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # 测试所有连接
            results = {}
            for name, client in [
                ("main", self.client),
                ("session", self.session),
                ("cache", self.cache),
                ("queue", self.queue),
            ]:
                try:
                    if client is None:
                        results[name] = {
                            "status": "unhealthy",
                            "error": "Client not initialized"
                        }
                        continue

                    await client.ping()
                    info = await client.info("memory")
                    results[name] = {
                        "status": "healthy",
                        "memory_used": info.get("used_memory_human", "unknown"),
                        "connected_clients": info.get("connected_clients", 0),
                    }
                except Exception as e:
                    results[name] = {
                        "status": "unhealthy",
                        "error": str(e),
                    }
            
            response_time = (asyncio.get_event_loop().time() - start_time) * 1000
            
            return {
                "status": "healthy" if all(r["status"] == "healthy" for r in results.values()) else "unhealthy",
                "response_time_ms": round(response_time, 2),
                "databases": results,
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
            }


# Redis 管理器实例（延迟初始化）
redis_manager: Optional[RedisManager] = None


def get_redis_manager() -> RedisManager:
    """获取 Redis 管理器实例"""
    global redis_manager
    if redis_manager is None:
        redis_manager = RedisManager()
    return redis_manager


# 导出常用函数和类
__all__ = [
    "init_redis",
    "close_redis",
    "RedisManager",
    "get_redis_manager",
    "redis_client",
    "session_redis",
    "cache_redis",
    "queue_redis",
]
