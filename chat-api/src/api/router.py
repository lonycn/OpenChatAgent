"""
🌐 API 主路由

整合所有API路由模块
"""

from fastapi import APIRouter

from .auth import router as auth_router
from .chat import router as chat_router
from .admin import router as admin_router

# 创建主API路由
api_router = APIRouter()

# 包含子路由
api_router.include_router(
    auth_router,
    prefix="/auth",
    tags=["认证"]
)

api_router.include_router(
    chat_router,
    prefix="/chat",
    tags=["聊天"]
)

api_router.include_router(
    admin_router,
    prefix="/admin",
    tags=["管理"]
)
