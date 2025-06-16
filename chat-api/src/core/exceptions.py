"""
❌ Chat API 异常处理系统

统一的异常定义和处理机制
"""

from typing import Any, Dict, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.models.base import ErrorResponse


# ==========================================
# 🔧 自定义异常类
# ==========================================

class ChatAPIException(Exception):
    """Chat API 基础异常类"""
    
    def __init__(
        self,
        message: str,
        code: str = "CHAT_API_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(ChatAPIException):
    """数据验证异常"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class AuthenticationException(ChatAPIException):
    """认证异常"""
    
    def __init__(self, message: str = "认证失败", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )


class AuthorizationException(ChatAPIException):
    """授权异常"""
    
    def __init__(self, message: str = "权限不足", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class NotFoundException(ChatAPIException):
    """资源不存在异常"""
    
    def __init__(self, message: str = "资源不存在", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class ConflictException(ChatAPIException):
    """资源冲突异常"""
    
    def __init__(self, message: str = "资源冲突", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details
        )


class RateLimitException(ChatAPIException):
    """限流异常"""
    
    def __init__(self, message: str = "请求过于频繁", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details
        )


class DatabaseException(ChatAPIException):
    """数据库异常"""
    
    def __init__(self, message: str = "数据库操作失败", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class RedisException(ChatAPIException):
    """Redis 异常"""
    
    def __init__(self, message: str = "缓存操作失败", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="REDIS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class AIServiceException(ChatAPIException):
    """AI 服务异常"""
    
    def __init__(self, message: str = "AI服务调用失败", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="AI_SERVICE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class SessionException(ChatAPIException):
    """会话异常"""
    
    def __init__(self, message: str = "会话操作失败", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="SESSION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class WebSocketException(ChatAPIException):
    """WebSocket 异常"""
    
    def __init__(self, message: str = "WebSocket连接异常", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="WEBSOCKET_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


# ==========================================
# 🔧 异常处理器
# ==========================================

async def chat_api_exception_handler(request: Request, exc: ChatAPIException) -> JSONResponse:
    """Chat API 异常处理器"""
    logger.error(f"ChatAPIException: {exc.code} - {exc.message}", extra={
        "code": exc.code,
        "status_code": exc.status_code,
        "details": exc.details,
        "path": request.url.path,
        "method": request.method,
    })
    
    error_response = ErrorResponse.create(
        code=exc.code,
        message=exc.message,
        details=exc.details
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(mode='json')
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """HTTP 异常处理器"""
    logger.warning(f"HTTPException: {exc.status_code} - {exc.detail}", extra={
        "status_code": exc.status_code,
        "path": request.url.path,
        "method": request.method,
    })
    
    error_response = ErrorResponse.create(
        code="HTTP_ERROR",
        message=exc.detail,
        details={"status_code": exc.status_code}
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(mode='json')
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """数据验证异常处理器"""
    logger.warning(f"ValidationError: {exc.errors()}", extra={
        "errors": exc.errors(),
        "path": request.url.path,
        "method": request.method,
    })
    
    # 格式化验证错误
    formatted_errors = []
    for error in exc.errors():
        formatted_errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    
    error_response = ErrorResponse.create(
        code="VALIDATION_ERROR",
        message="请求参数验证失败",
        details={"errors": formatted_errors}
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump(mode='json')
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """SQLAlchemy 异常处理器"""
    logger.error(f"SQLAlchemyError: {str(exc)}", extra={
        "error": str(exc),
        "path": request.url.path,
        "method": request.method,
    })
    
    # 处理完整性约束错误
    if isinstance(exc, IntegrityError):
        error_response = ErrorResponse.create(
            code="INTEGRITY_ERROR",
            message="数据完整性约束违反",
            details={"error": str(exc.orig) if hasattr(exc, 'orig') else str(exc)}
        )
        status_code = status.HTTP_409_CONFLICT
    else:
        error_response = ErrorResponse.create(
            code="DATABASE_ERROR",
            message="数据库操作失败",
            details={"error": str(exc)}
        )
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    return JSONResponse(
        status_code=status_code,
        content=error_response.model_dump(mode='json')
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """通用异常处理器"""
    logger.error(f"UnhandledException: {type(exc).__name__} - {str(exc)}", extra={
        "exception_type": type(exc).__name__,
        "error": str(exc),
        "path": request.url.path,
        "method": request.method,
    })
    
    error_response = ErrorResponse.create(
        code="INTERNAL_SERVER_ERROR",
        message="服务器内部错误",
        details={"error": str(exc)}
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump(mode='json')
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """
    设置异常处理器
    """
    # 自定义异常处理器
    app.add_exception_handler(ChatAPIException, chat_api_exception_handler)
    
    # HTTP 异常处理器
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    
    # 数据验证异常处理器
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # SQLAlchemy 异常处理器
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    
    # 通用异常处理器
    app.add_exception_handler(Exception, general_exception_handler)
    
    logger.info("✅ Exception handlers configured")


# ==========================================
# 🔧 异常工具函数
# ==========================================

def raise_not_found(resource: str, identifier: Any = None) -> None:
    """抛出资源不存在异常"""
    message = f"{resource}不存在"
    if identifier:
        message += f": {identifier}"
    raise NotFoundException(message, details={"resource": resource, "identifier": identifier})


def raise_validation_error(field: str, message: str) -> None:
    """抛出验证错误异常"""
    raise ValidationException(
        message=f"字段验证失败: {field}",
        details={"field": field, "message": message}
    )


def raise_permission_denied(action: str, resource: str = None) -> None:
    """抛出权限不足异常"""
    message = f"无权限执行操作: {action}"
    if resource:
        message += f" (资源: {resource})"
    raise AuthorizationException(message, details={"action": action, "resource": resource})


def raise_rate_limit_exceeded(limit: int, window: int) -> None:
    """抛出限流异常"""
    raise RateLimitException(
        message=f"请求频率超限: {limit}次/{window}秒",
        details={"limit": limit, "window": window}
    )
