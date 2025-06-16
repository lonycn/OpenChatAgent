"""
👥 管理相关API

用户管理、对话管理、统计分析等接口
"""

from typing import Dict, List, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_db, get_current_admin, get_current_supervisor,
    get_pagination_params, get_user_filters
)
from src.config.settings import get_settings
from src.core.exceptions import NotFoundException, ValidationException
from src.middleware.logging import log_user_action
from src.models.user import (
    User, UserCreate, UserUpdate, UserResponse, UserListResponse,
    TokenData, UserRole, UserStatus
)
from src.models.base import PaginationParams
from src.services.user import UserService

# 配置
settings = get_settings()

# 创建路由
router = APIRouter()


# ==========================================
# 👥 用户管理
# ==========================================

@router.get("/users", response_model=UserListResponse, summary="获取用户列表")
async def get_users(
    request: Request,
    pagination: PaginationParams = Depends(get_pagination_params),
    filters: Dict[str, Any] = Depends(get_user_filters),
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户列表（需要主管或管理员权限）
    
    - **page**: 页码
    - **size**: 每页数量
    - **role**: 角色过滤（可选）
    - **status**: 状态过滤（可选）
    - **search**: 搜索关键词（可选）
    
    返回用户列表和分页信息
    """
    try:
        user_service = UserService(db)
        
        users, pagination_info = await user_service.list_users(
            page=pagination.page,
            size=pagination.size,
            filters=filters,
            search=filters.get("search")
        )
        
        user_responses = [UserResponse.model_validate(user) for user in users]
        
        return UserListResponse(
            users=user_responses,
            total=pagination_info.total,
            page=pagination_info.page,
            size=pagination_info.size,
            pages=pagination_info.pages
        )
        
    except Exception as e:
        logger.error(f"Get users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户列表失败"
        )


@router.post("/users", response_model=UserResponse, summary="创建用户")
async def create_user(
    request: Request,
    user_create: UserCreate,
    current_user: TokenData = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    创建新用户（需要管理员权限）
    
    - **email**: 用户邮箱
    - **password**: 用户密码
    - **full_name**: 用户姓名
    - **role**: 用户角色
    - **status**: 用户状态
    
    返回创建的用户信息
    """
    try:
        from passlib.context import CryptContext
        
        user_service = UserService(db)
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # 检查邮箱是否已存在
        existing_user = await user_service.get_user_by_email(user_create.email)
        if existing_user:
            raise ValidationException("邮箱已被注册")
        
        # 创建用户数据
        user_data = user_create.model_dump()
        user_data["password_hash"] = pwd_context.hash(user_create.password)
        del user_data["password"]  # 移除明文密码
        
        user = await user_service.create_user(user_data)
        
        # 记录操作日志
        log_user_action(
            request, 
            "create_user", 
            "user", 
            {"created_user_id": user.id, "created_user_email": user.email}
        )
        
        logger.info(f"User created by admin: {user.email} (ID: {user.id})")
        
        return UserResponse.model_validate(user)
        
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Create user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建用户失败"
        )


@router.get("/users/{user_id}", response_model=UserResponse, summary="获取用户详情")
async def get_user(
    request: Request,
    user_id: int,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    获取指定用户的详细信息（需要主管或管理员权限）
    
    - **user_id**: 用户ID
    
    返回用户详细信息
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        return UserResponse.model_validate(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户信息失败"
        )


@router.put("/users/{user_id}", response_model=UserResponse, summary="更新用户")
async def update_user(
    request: Request,
    user_id: int,
    user_update: UserUpdate,
    current_user: TokenData = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    更新用户信息（需要管理员权限）
    
    - **user_id**: 用户ID
    - **full_name**: 用户姓名（可选）
    - **role**: 用户角色（可选）
    - **status**: 用户状态（可选）
    
    返回更新后的用户信息
    """
    try:
        user_service = UserService(db)
        
        # 过滤None值
        update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise ValidationException("没有提供更新数据")
        
        user = await user_service.update_user(user_id, update_data)
        
        # 记录操作日志
        log_user_action(
            request, 
            "update_user", 
            "user", 
            {"updated_user_id": user_id, "update_data": update_data}
        )
        
        logger.info(f"User updated by admin: {user.email} (ID: {user.id})")
        
        return UserResponse.model_validate(user)
        
    except (NotFoundException, ValidationException):
        raise
    except Exception as e:
        logger.error(f"Update user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新用户失败"
        )


@router.delete("/users/{user_id}", summary="删除用户")
async def delete_user(
    request: Request,
    user_id: int,
    current_user: TokenData = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    删除用户（需要管理员权限）
    
    - **user_id**: 用户ID
    
    返回删除结果
    """
    try:
        user_service = UserService(db)
        
        # 不能删除自己
        if user_id == current_user.user_id:
            raise ValidationException("不能删除自己的账户")
        
        # 获取用户信息用于日志
        user = await user_service.get_user_by_id(user_id)
        if not user:
            raise NotFoundException(f"用户不存在: {user_id}")
        
        await user_service.delete_user(user_id)
        
        # 记录操作日志
        log_user_action(
            request, 
            "delete_user", 
            "user", 
            {"deleted_user_id": user_id, "deleted_user_email": user.email}
        )
        
        logger.info(f"User deleted by admin: {user.email} (ID: {user.id})")
        
        return {"message": "用户删除成功"}
        
    except (NotFoundException, ValidationException):
        raise
    except Exception as e:
        logger.error(f"Delete user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除用户失败"
        )


@router.post("/users/{user_id}/status", response_model=UserResponse, summary="更改用户状态")
async def change_user_status(
    request: Request,
    user_id: int,
    status_data: Dict[str, str],
    current_user: TokenData = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    更改用户状态（需要管理员权限）
    
    - **user_id**: 用户ID
    - **status**: 新状态（active/inactive/suspended）
    
    返回更新后的用户信息
    """
    try:
        user_service = UserService(db)
        
        new_status = status_data.get("status")
        if not new_status:
            raise ValidationException("缺少状态参数")
        
        try:
            status_enum = UserStatus(new_status)
        except ValueError:
            raise ValidationException(f"无效的状态值: {new_status}")
        
        # 不能禁用自己
        if user_id == current_user.user_id and status_enum != UserStatus.ACTIVE:
            raise ValidationException("不能禁用自己的账户")
        
        user = await user_service.change_user_status(user_id, status_enum)
        
        # 记录操作日志
        log_user_action(
            request, 
            "change_user_status", 
            "user", 
            {"user_id": user_id, "new_status": new_status}
        )
        
        logger.info(f"User status changed: {user.email} -> {new_status}")
        
        return UserResponse.model_validate(user)
        
    except (NotFoundException, ValidationException):
        raise
    except Exception as e:
        logger.error(f"Change user status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更改用户状态失败"
        )


# ==========================================
# 📊 统计分析
# ==========================================

@router.get("/analytics/dashboard", summary="获取仪表板数据")
async def get_dashboard_analytics(
    request: Request,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    获取管理仪表板统计数据（需要主管或管理员权限）
    
    返回各种统计指标
    """
    try:
        user_service = UserService(db)
        
        # 获取用户统计
        user_stats = await user_service.get_user_stats()
        
        # 这里可以添加更多统计数据
        # conversation_stats = await conversation_service.get_stats()
        # message_stats = await message_service.get_stats()
        
        dashboard_data = {
            "users": user_stats,
            "conversations": {
                "total_conversations": 156,
                "active_conversations": 23,
                "ai_handled": 134,
                "human_handled": 22,
                "avg_response_time": 2.5
            },
            "messages": {
                "total_messages": 1024,
                "today_messages": 89,
                "avg_messages_per_conversation": 6.5
            },
            "performance": {
                "customer_satisfaction": 4.2,
                "resolution_rate": 0.89,
                "first_response_time": 1.8
            }
        }
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Get dashboard analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取统计数据失败"
        )


@router.get("/analytics/users", summary="获取用户统计")
async def get_user_analytics(
    request: Request,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户相关统计数据（需要主管或管理员权限）
    
    返回用户统计信息
    """
    try:
        user_service = UserService(db)
        user_stats = await user_service.get_user_stats()
        
        return user_stats
        
    except Exception as e:
        logger.error(f"Get user analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户统计失败"
        )
