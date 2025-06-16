"""
🔧 API 依赖注入

提供通用的依赖注入函数
"""

from typing import Generator, Optional

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.redis import redis_manager
from src.middleware.auth import (
    get_current_user,
    require_auth,
    require_admin,
    require_supervisor,
    require_agent,
    is_authenticated
)
from src.models.user import TokenData
from src.models.base import PaginationParams


# ==========================================
# 🔧 数据库依赖
# ==========================================

async def get_db() -> AsyncSession:
    """获取数据库会话"""
    async with get_db_session() as session:
        yield session


def get_redis():
    """获取Redis管理器"""
    return redis_manager


# ==========================================
# 🔐 认证依赖
# ==========================================

def get_current_user_optional(request: Request) -> Optional[TokenData]:
    """获取当前用户（可选）"""
    return get_current_user(request)


def get_current_user_required(request: Request) -> TokenData:
    """获取当前用户（必需）"""
    return require_auth(request)


def get_current_admin(request: Request) -> TokenData:
    """获取当前管理员用户"""
    return require_admin(request)


def get_current_supervisor(request: Request) -> TokenData:
    """获取当前主管用户"""
    return require_supervisor(request)


def get_current_agent(request: Request) -> TokenData:
    """获取当前客服用户"""
    return require_agent(request)


def check_authenticated(request: Request) -> bool:
    """检查是否已认证"""
    return is_authenticated(request)


# ==========================================
# 📋 分页依赖
# ==========================================

def get_pagination_params(
    page: int = 1,
    size: int = 20
) -> PaginationParams:
    """获取分页参数"""
    return PaginationParams(page=page, size=size)


# ==========================================
# 🔍 查询依赖
# ==========================================

def get_search_params(
    q: Optional[str] = None,
    sort: Optional[str] = None,
    order: str = "desc"
) -> dict:
    """获取搜索参数"""
    return {
        "query": q,
        "sort": sort,
        "order": order
    }


# ==========================================
# 📊 过滤依赖
# ==========================================

def get_conversation_filters(
    status: Optional[str] = None,
    agent_type: Optional[str] = None,
    assignee_id: Optional[int] = None,
    priority: Optional[str] = None,
    channel_type: Optional[str] = None
) -> dict:
    """获取对话过滤参数"""
    filters = {}
    if status:
        filters["status"] = status
    if agent_type:
        filters["agent_type"] = agent_type
    if assignee_id:
        filters["assignee_id"] = assignee_id
    if priority:
        filters["priority"] = priority
    if channel_type:
        filters["channel_type"] = channel_type
    return filters


def get_message_filters(
    conversation_id: Optional[int] = None,
    sender_type: Optional[str] = None,
    message_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> dict:
    """获取消息过滤参数"""
    filters = {}
    if conversation_id:
        filters["conversation_id"] = conversation_id
    if sender_type:
        filters["sender_type"] = sender_type
    if message_type:
        filters["message_type"] = message_type
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    return filters


def get_user_filters(
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
) -> dict:
    """获取用户过滤参数"""
    filters = {}
    if role:
        filters["role"] = role
    if status:
        filters["status"] = status
    if search:
        filters["search"] = search
    return filters


# ==========================================
# 🔧 请求上下文依赖
# ==========================================

def get_request_context(request: Request) -> dict:
    """获取请求上下文"""
    return {
        "request_id": getattr(request.state, "request_id", None),
        "user": get_current_user(request),
        "client_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "path": request.url.path,
        "method": request.method,
    }


# ==========================================
# 📊 业务依赖
# ==========================================

async def get_session_service():
    """获取会话服务"""
    from src.services.session import SessionService
    return SessionService()


async def get_conversation_service():
    """获取对话服务"""
    from src.services.conversation import ConversationService
    return ConversationService()


async def get_message_service():
    """获取消息服务"""
    from src.services.message import MessageService
    return MessageService()


async def get_user_service():
    """获取用户服务"""
    from src.services.user import UserService
    return UserService()


async def get_ai_service():
    """获取AI服务"""
    from src.services.ai import AIService
    return AIService()


# ==========================================
# 🔧 常用依赖组合
# ==========================================

# 数据库 + 用户认证
DatabaseWithAuth = Depends(get_db), Depends(get_current_user_required)

# 数据库 + 管理员认证
DatabaseWithAdmin = Depends(get_db), Depends(get_current_admin)

# 分页 + 搜索
PaginationWithSearch = Depends(get_pagination_params), Depends(get_search_params)
