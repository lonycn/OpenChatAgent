"""
🛡️ 限流中间件

基于Redis的API请求限流
"""

import time
from typing import Dict, Optional

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from src.config.settings import get_settings
from src.core.exceptions import RateLimitException
from src.core.redis import redis_manager

settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """限流中间件"""
    
    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis = redis_client or redis_manager
        
        # 路径特定的限流配置
        self.path_limits = {
            "/api/v1/auth/login": {
                "requests": settings.AUTH_RATE_LIMIT,
                "window": 60,  # 1分钟
            },
            "/api/v1/chat/messages": {
                "requests": settings.MESSAGE_RATE_LIMIT,
                "window": 60,  # 1分钟
            },
            "/api/v1/admin": {
                "requests": settings.ADMIN_RATE_LIMIT,
                "window": 60,  # 1分钟
            },
        }
        
        # 默认限流配置
        self.default_limit = {
            "requests": settings.RATE_LIMIT_REQUESTS,
            "window": settings.RATE_LIMIT_WINDOW,
        }
    
    async def dispatch(self, request: Request, call_next):
        """处理请求"""
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)
        
        try:
            # 获取客户端标识
            client_id = self._get_client_id(request)
            
            # 获取限流配置
            limit_config = self._get_limit_config(request.url.path)
            
            # 检查限流
            await self._check_rate_limit(client_id, request.url.path, limit_config)
            
            # 继续处理请求
            response = await call_next(request)
            
            # 添加限流头信息
            self._add_rate_limit_headers(response, client_id, request.url.path, limit_config)
            
            return response
            
        except RateLimitException:
            raise
        except Exception as e:
            logger.error(f"Rate limit middleware error: {e}")
            return await call_next(request)
    
    def _get_client_id(self, request: Request) -> str:
        """获取客户端标识"""
        # 优先使用用户ID（如果已认证）
        user = getattr(request.state, "user", None)
        if user and hasattr(user, "user_id"):
            return f"user:{user.user_id}"
        
        # 使用IP地址
        client_ip = self._get_client_ip(request)
        return f"ip:{client_ip}"
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP地址"""
        # 检查代理头
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # 返回直接连接的IP
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    def _get_limit_config(self, path: str) -> Dict[str, int]:
        """获取路径的限流配置"""
        # 检查精确匹配
        if path in self.path_limits:
            return self.path_limits[path]
        
        # 检查前缀匹配
        for pattern, config in self.path_limits.items():
            if path.startswith(pattern):
                return config
        
        # 返回默认配置
        return self.default_limit
    
    async def _check_rate_limit(
        self, 
        client_id: str, 
        path: str, 
        limit_config: Dict[str, int]
    ) -> None:
        """检查限流"""
        try:
            # 构建Redis键
            key = f"rate_limit:{client_id}:{path}"
            window = limit_config["window"]
            max_requests = limit_config["requests"]
            
            # 获取当前时间窗口
            current_time = int(time.time())
            window_start = current_time - (current_time % window)
            
            # 使用滑动窗口算法
            if not self.redis.client:
                logger.warning("Redis client not available for rate limiting")
                return False

            pipe = await self.redis.client.pipeline()
            
            # 移除过期的请求记录
            await pipe.zremrangebyscore(key, 0, current_time - window)
            
            # 获取当前窗口内的请求数
            current_requests = await pipe.zcard(key)
            
            if current_requests >= max_requests:
                # 获取重置时间
                reset_time = window_start + window
                
                raise RateLimitException(
                    message=f"请求频率超限: {max_requests}次/{window}秒",
                    details={
                        "limit": max_requests,
                        "window": window,
                        "current": current_requests,
                        "reset_time": reset_time,
                    }
                )
            
            # 记录当前请求
            await pipe.zadd(key, {str(current_time): current_time})
            await pipe.expire(key, window)
            await pipe.execute()
            
        except RateLimitException:
            raise
        except Exception as e:
            logger.warning(f"Rate limit check error: {e}")
            # 限流检查失败时不阻止请求
    
    def _add_rate_limit_headers(
        self, 
        response: Response, 
        client_id: str, 
        path: str, 
        limit_config: Dict[str, int]
    ) -> None:
        """添加限流头信息"""
        try:
            max_requests = limit_config["requests"]
            window = limit_config["window"]
            
            # 添加限流头
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Window"] = str(window)
            
            # 获取剩余请求数（异步操作，这里简化处理）
            response.headers["X-RateLimit-Remaining"] = str(max_requests - 1)
            
            # 重置时间
            current_time = int(time.time())
            window_start = current_time - (current_time % window)
            reset_time = window_start + window
            response.headers["X-RateLimit-Reset"] = str(reset_time)
            
        except Exception as e:
            logger.warning(f"Failed to add rate limit headers: {e}")


class RateLimiter:
    """限流器工具类"""
    
    def __init__(self, redis_client=None):
        self.redis = redis_client or redis_manager
    
    async def is_allowed(
        self, 
        key: str, 
        limit: int, 
        window: int,
        identifier: str = None
    ) -> tuple[bool, Dict[str, int]]:
        """
        检查是否允许请求
        
        Args:
            key: 限流键
            limit: 请求限制数
            window: 时间窗口（秒）
            identifier: 标识符（可选）
        
        Returns:
            (是否允许, 限流信息)
        """
        try:
            full_key = f"rate_limit:{key}"
            if identifier:
                full_key += f":{identifier}"
            
            current_time = int(time.time())
            
            # 使用滑动窗口算法
            if not self.redis.client:
                logger.warning("Redis client not available for rate limiting")
                return 0

            pipe = await self.redis.client.pipeline()
            
            # 移除过期记录
            await pipe.zremrangebyscore(full_key, 0, current_time - window)
            
            # 获取当前请求数
            current_count = await pipe.zcard(full_key)
            
            if current_count >= limit:
                return False, {
                    "allowed": False,
                    "limit": limit,
                    "current": current_count,
                    "window": window,
                    "reset_time": current_time + window,
                }
            
            # 记录当前请求
            await pipe.zadd(full_key, {str(current_time): current_time})
            await pipe.expire(full_key, window)
            await pipe.execute()
            
            return True, {
                "allowed": True,
                "limit": limit,
                "current": current_count + 1,
                "remaining": limit - current_count - 1,
                "window": window,
                "reset_time": current_time + window,
            }
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # 出错时允许请求
            return True, {
                "allowed": True,
                "error": str(e),
            }
    
    async def reset(self, key: str, identifier: str = None) -> bool:
        """重置限流计数"""
        try:
            full_key = f"rate_limit:{key}"
            if identifier:
                full_key += f":{identifier}"
            
            await self.redis.delete(full_key)
            return True
            
        except Exception as e:
            logger.error(f"Rate limiter reset error: {e}")
            return False


# 创建全局限流器实例
rate_limiter = RateLimiter()
