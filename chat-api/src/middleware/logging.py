"""
📝 日志中间件

记录请求和响应信息，提供结构化日志
"""

import json
import time
import uuid
from typing import Any, Dict

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from src.config.settings import get_settings

settings = get_settings()


class LoggingMiddleware(BaseHTTPMiddleware):
    """日志中间件"""
    
    # 不记录日志的路径
    SKIP_PATHS = {
        "/health",
        "/metrics",
        "/favicon.ico",
    }
    
    # 不记录日志的路径前缀
    SKIP_PREFIXES = {
        "/static/",
        "/docs",
        "/redoc",
        "/openapi.json",
    }
    
    async def dispatch(self, request: Request, call_next):
        """处理请求"""
        # 生成请求ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # 检查是否需要记录日志
        if self._should_skip_logging(request.url.path):
            response = await call_next(request)
            return response
        
        # 记录请求开始
        start_time = time.time()
        request_data = await self._extract_request_data(request)
        
        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "headers": self._filter_headers(dict(request.headers)),
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("user-agent"),
                "user_id": getattr(request.state, "user", {}).get("user_id") if hasattr(request.state, "user") else None,
                "body_size": request_data.get("body_size", 0),
                "event_type": "request_start",
            }
        )
        
        try:
            # 处理请求
            response = await call_next(request)
            
            # 计算处理时间
            process_time = time.time() - start_time
            
            # 记录请求完成
            logger.info(
                "Request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "url": str(request.url),
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "process_time": round(process_time, 4),
                    "response_size": self._get_response_size(response),
                    "user_id": getattr(request.state, "user", {}).get("user_id") if hasattr(request.state, "user") else None,
                    "event_type": "request_complete",
                }
            )
            
            # 添加响应头
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)
            
            # 检查慢请求
            if process_time > settings.SLOW_REQUEST_THRESHOLD:
                logger.warning(
                    "Slow request detected",
                    extra={
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "process_time": process_time,
                        "threshold": settings.SLOW_REQUEST_THRESHOLD,
                        "event_type": "slow_request",
                    }
                )
            
            return response
            
        except Exception as e:
            # 计算处理时间
            process_time = time.time() - start_time
            
            # 记录请求错误
            logger.error(
                "Request failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "url": str(request.url),
                    "path": request.url.path,
                    "process_time": round(process_time, 4),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "user_id": getattr(request.state, "user", None).user_id if hasattr(request.state, "user") and getattr(request.state, "user", None) else None,
                    "event_type": "request_error",
                }
            )
            
            raise
    
    def _should_skip_logging(self, path: str) -> bool:
        """检查是否应该跳过日志记录"""
        # 检查完全匹配
        if path in self.SKIP_PATHS:
            return True
        
        # 检查前缀匹配
        for prefix in self.SKIP_PREFIXES:
            if path.startswith(prefix):
                return True
        
        return False
    
    async def _extract_request_data(self, request: Request) -> Dict[str, Any]:
        """提取请求数据"""
        data = {}
        
        try:
            # 获取请求体大小
            if hasattr(request, "_body"):
                body = request._body
            else:
                body = await request.body()
                request._body = body  # 缓存请求体
            
            data["body_size"] = len(body) if body else 0
            
            # 记录请求体内容（仅在调试模式下）
            if settings.DEBUG and body and data["body_size"] < 1024:  # 小于1KB
                try:
                    content_type = request.headers.get("content-type", "")
                    if "application/json" in content_type:
                        data["body"] = json.loads(body.decode())
                    elif "application/x-www-form-urlencoded" in content_type:
                        data["body"] = body.decode()
                except Exception:
                    pass  # 忽略解析错误
            
        except Exception as e:
            logger.warning(f"Failed to extract request data: {e}")
        
        return data
    
    def _filter_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """过滤敏感头信息"""
        sensitive_headers = {
            "authorization",
            "cookie",
            "x-api-key",
            "x-auth-token",
        }
        
        filtered = {}
        for key, value in headers.items():
            if key.lower() in sensitive_headers:
                filtered[key] = "***FILTERED***"
            else:
                filtered[key] = value
        
        return filtered
    
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
    
    def _get_response_size(self, response: Response) -> int:
        """获取响应大小"""
        try:
            content_length = response.headers.get("content-length")
            if content_length:
                return int(content_length)
        except Exception:
            pass
        
        return 0


def get_request_id(request: Request) -> str:
    """获取请求ID"""
    return getattr(request.state, "request_id", "unknown")


def log_user_action(
    request: Request,
    action: str,
    resource: str = None,
    details: Dict[str, Any] = None
):
    """记录用户操作"""
    user = getattr(request.state, "user", None)
    
    logger.info(
        f"User action: {action}",
        extra={
            "request_id": get_request_id(request),
            "user_id": user.user_id if user else None,
            "user_email": user.email if user else None,
            "action": action,
            "resource": resource,
            "details": details or {},
            "event_type": "user_action",
        }
    )


def log_business_event(
    event_type: str,
    data: Dict[str, Any],
    request: Request = None
):
    """记录业务事件"""
    extra_data = {
        "event_type": "business_event",
        "business_event_type": event_type,
        "data": data,
    }
    
    if request:
        extra_data["request_id"] = get_request_id(request)
        user = getattr(request.state, "user", None)
        if user:
            extra_data["user_id"] = user.user_id
    
    logger.info(f"Business event: {event_type}", extra=extra_data)
