"""
👥 管理相关API

用户管理、对话管理、统计分析等接口
"""

from typing import Dict, List, Any, Optional

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
from src.models.conversation import (
    Conversation, ConversationResponse, ConversationListResponse,
    ConversationStatus, ConversationPriority, AgentType
)
from src.models.message import (
    Message, MessageResponse, MessageCreate, MessageListResponse,
    MessageType, SenderType
)
from src.models.base import PaginationParams
from src.services.user import UserService
from src.services.conversation import ConversationService
from src.services.message import MessageService

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


@router.post("/users/{user_id}/reset-password", summary="重置用户密码")
async def reset_user_password(
    request: Request,
    user_id: int,
    new_password: str,
    current_user: TokenData = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    重置指定用户的密码（需要管理员权限）

    - **user_id**: 用户ID
    - **new_password**: 新密码

    返回操作结果
    """
    try:
        from passlib.context import CryptContext

        user_service = UserService(db)
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        # 检查用户是否存在
        user = await user_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 加密新密码
        hashed_password = pwd_context.hash(new_password)

        # 更新密码
        update_data = UserUpdate(password_hash=hashed_password)
        await user_service.update_user(user_id, update_data)

        # 记录操作日志
        log_user_action(
            request,
            "reset_password",
            "user",
            {"user_id": user_id}
        )

        logger.info(f"Password reset for user {user_id} by admin {current_user.user_id}")

        return {
            "success": True,
            "message": "密码重置成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="重置密码失败"
        )


@router.get("/permissions", summary="获取所有可用权限")
async def get_available_permissions(
    request: Request,
    current_user: TokenData = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    获取系统中所有可用的权限列表（需要管理员权限）

    返回权限列表
    """
    try:
        # 定义系统权限列表
        permissions = [
            {"code": "user.read", "name": "查看用户", "description": "查看用户信息"},
            {"code": "user.create", "name": "创建用户", "description": "创建新用户"},
            {"code": "user.update", "name": "更新用户", "description": "更新用户信息"},
            {"code": "user.delete", "name": "删除用户", "description": "删除用户"},
            {"code": "conversation.read", "name": "查看会话", "description": "查看会话信息"},
            {"code": "conversation.manage", "name": "管理会话", "description": "管理会话状态"},
            {"code": "message.read", "name": "查看消息", "description": "查看消息内容"},
            {"code": "message.send", "name": "发送消息", "description": "发送消息"},
            {"code": "analytics.read", "name": "查看统计", "description": "查看统计数据"},
            {"code": "system.admin", "name": "系统管理", "description": "系统管理权限"},
        ]

        return {
            "success": True,
            "data": {
                "permissions": permissions
            }
        }

    except Exception as e:
        logger.error(f"Get available permissions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取权限列表失败"
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


# ==========================================
# 💬 会话管理
# ==========================================

@router.get("/conversations", response_model=ConversationListResponse, summary="获取会话列表")
async def get_conversations(
    request: Request,
    pagination: PaginationParams = Depends(get_pagination_params),
    status: Optional[str] = None,
    assignee_id: Optional[int] = None,
    priority: Optional[str] = None,
    channel_type: Optional[str] = None,
    current_agent_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    获取会话列表（需要主管或管理员权限）

    - **page**: 页码
    - **size**: 每页数量
    - **status**: 会话状态过滤
    - **assignee_id**: 指派客服ID过滤
    - **priority**: 优先级过滤
    - **channel_type**: 渠道类型过滤
    - **current_agent_type**: 当前代理类型过滤
    - **search**: 搜索关键词

    返回会话列表和分页信息
    """
    try:
        conversation_service = ConversationService(db)

        # 构建过滤条件
        filters = {}
        if status:
            filters["status"] = status
        if assignee_id:
            filters["assignee_id"] = assignee_id
        if priority:
            filters["priority"] = priority
        if channel_type:
            filters["channel_type"] = channel_type
        if current_agent_type:
            filters["current_agent_type"] = current_agent_type

        conversations, pagination_info = await conversation_service.list_conversations(
            page=pagination.page,
            size=pagination.size,
            filters=filters,
            search=search
        )

        return ConversationListResponse(
            conversations=[ConversationResponse.model_validate(conv) for conv in conversations],
            pagination=pagination_info
        )

    except Exception as e:
        logger.error(f"Get conversations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取会话列表失败"
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse, summary="获取会话详情")
async def get_conversation_detail(
    request: Request,
    conversation_id: int,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    获取指定会话的详细信息（需要主管或管理员权限）

    - **conversation_id**: 会话ID

    返回会话详细信息
    """
    try:
        conversation_service = ConversationService(db)
        conversation = await conversation_service.get_conversation_by_id(conversation_id)

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会话不存在"
            )

        return ConversationResponse.model_validate(conversation)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get conversation detail error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取会话详情失败"
        )


@router.post("/conversations/{conversation_id}/takeover", summary="接管会话")
async def takeover_conversation(
    request: Request,
    conversation_id: int,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    接管会话（切换为人工服务）

    - **conversation_id**: 会话ID

    返回更新后的会话信息
    """
    try:
        conversation_service = ConversationService(db)

        # 检查会话是否存在
        conversation = await conversation_service.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会话不存在"
            )

        # 接管会话
        updated_conversation = await conversation_service.takeover_conversation(
            conversation_id, current_user.user_id
        )

        # 记录操作日志
        log_user_action(
            request,
            "takeover_conversation",
            "conversation",
            {"conversation_id": conversation_id}
        )

        logger.info(f"Conversation {conversation_id} taken over by user {current_user.user_id}")

        return {
            "success": True,
            "data": {
                "conversation": ConversationResponse.model_validate(updated_conversation),
                "message": "会话接管成功"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Takeover conversation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="接管会话失败"
        )


@router.post("/conversations/{conversation_id}/assign", summary="分配会话")
async def assign_conversation(
    request: Request,
    conversation_id: int,
    assignee_id: int,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    分配会话给指定客服

    - **conversation_id**: 会话ID
    - **assignee_id**: 指派的客服ID

    返回更新后的会话信息
    """
    try:
        conversation_service = ConversationService(db)

        # 检查会话是否存在
        conversation = await conversation_service.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会话不存在"
            )

        # 分配会话
        updated_conversation = await conversation_service.assign_conversation(
            conversation_id, assignee_id
        )

        # 记录操作日志
        log_user_action(
            request,
            "assign_conversation",
            "conversation",
            {"conversation_id": conversation_id, "assignee_id": assignee_id}
        )

        logger.info(f"Conversation {conversation_id} assigned to user {assignee_id}")

        return {
            "success": True,
            "data": {
                "conversation": ConversationResponse.model_validate(updated_conversation),
                "message": "会话分配成功"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assign conversation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="分配会话失败"
        )


@router.put("/conversations/{conversation_id}/status", summary="更新会话状态")
async def update_conversation_status(
    request: Request,
    conversation_id: int,
    new_status: str,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    更新会话状态

    - **conversation_id**: 会话ID
    - **new_status**: 新状态 (open, pending, resolved, closed)

    返回更新后的会话信息
    """
    try:
        conversation_service = ConversationService(db)

        # 检查会话是否存在
        conversation = await conversation_service.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会话不存在"
            )

        # 验证状态值
        try:
            status_enum = ConversationStatus(new_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的状态值"
            )

        # 更新状态
        updated_conversation = await conversation_service.update_conversation_status(
            conversation_id, status_enum
        )

        # 记录操作日志
        log_user_action(
            request,
            "update_conversation_status",
            "conversation",
            {"conversation_id": conversation_id, "new_status": new_status}
        )

        logger.info(f"Conversation {conversation_id} status updated to {new_status}")

        return {
            "success": True,
            "data": {
                "conversation": ConversationResponse.model_validate(updated_conversation),
                "message": "会话状态更新成功"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update conversation status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新会话状态失败"
        )


# ==========================================
# 📨 消息管理
# ==========================================

@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse, summary="获取会话消息")
async def get_conversation_messages(
    request: Request,
    conversation_id: int,
    pagination: PaginationParams = Depends(get_pagination_params),
    include_private: bool = False,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    获取指定会话的消息列表

    - **conversation_id**: 会话ID
    - **page**: 页码
    - **size**: 每页数量
    - **include_private**: 是否包含私有消息

    返回消息列表和分页信息
    """
    try:
        message_service = MessageService(db)

        messages, pagination_info = await message_service.list_messages_by_conversation(
            conversation_id=conversation_id,
            page=pagination.page,
            size=pagination.size,
            include_private=include_private
        )

        return MessageListResponse(
            messages=[MessageResponse.model_validate(msg) for msg in messages],
            pagination=pagination_info
        )

    except Exception as e:
        logger.error(f"Get conversation messages error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取消息列表失败"
        )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, summary="发送消息")
async def send_message(
    request: Request,
    conversation_id: int,
    message_data: MessageCreate,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    在指定会话中发送消息

    - **conversation_id**: 会话ID
    - **content**: 消息内容
    - **message_type**: 消息类型
    - **is_private**: 是否为私有消息

    返回发送的消息信息
    """
    try:
        message_service = MessageService(db)

        # 设置发送者信息
        message_data.conversation_id = conversation_id
        message_data.sender_type = SenderType.AGENT
        message_data.sender_id = current_user.user_id

        message = await message_service.create_message(message_data)

        # 记录操作日志
        log_user_action(
            request,
            "send_message",
            "message",
            {"conversation_id": conversation_id, "message_id": message.id}
        )

        logger.info(f"Message sent by user {current_user.user_id} in conversation {conversation_id}")

        return MessageResponse.model_validate(message)

    except Exception as e:
        logger.error(f"Send message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="发送消息失败"
        )


@router.post("/conversations/{conversation_id}/notes", response_model=MessageResponse, summary="添加私有备注")
async def add_conversation_note(
    request: Request,
    conversation_id: int,
    content: str,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    为会话添加私有备注

    - **conversation_id**: 会话ID
    - **content**: 备注内容

    返回创建的备注消息
    """
    try:
        message_service = MessageService(db)

        # 创建私有备注
        note_data = MessageCreate(
            conversation_id=conversation_id,
            sender_type=SenderType.AGENT,
            sender_id=current_user.user_id,
            content=content,
            message_type=MessageType.TEXT,
            is_private=True
        )

        note = await message_service.create_message(note_data)

        # 记录操作日志
        log_user_action(
            request,
            "add_note",
            "message",
            {"conversation_id": conversation_id, "note_id": note.id}
        )

        logger.info(f"Note added by user {current_user.user_id} to conversation {conversation_id}")

        return MessageResponse.model_validate(note)

    except Exception as e:
        logger.error(f"Add note error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="添加备注失败"
        )


@router.post("/conversations/{conversation_id}/switch-agent", summary="切换代理类型")
async def switch_agent_type(
    request: Request,
    conversation_id: int,
    agent_type: str,
    current_user: TokenData = Depends(get_current_supervisor),
    db: AsyncSession = Depends(get_db)
):
    """
    切换会话的代理类型（AI/人工）

    - **conversation_id**: 会话ID
    - **agent_type**: 代理类型 (ai, human)

    返回更新后的会话信息
    """
    try:
        conversation_service = ConversationService(db)

        # 检查会话是否存在
        conversation = await conversation_service.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会话不存在"
            )

        # 验证代理类型
        try:
            agent_type_enum = AgentType(agent_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的代理类型"
            )

        # 切换代理类型
        updated_conversation = await conversation_service.switch_agent_type(
            conversation_id, agent_type_enum
        )

        # 记录操作日志
        log_user_action(
            request,
            "switch_agent_type",
            "conversation",
            {"conversation_id": conversation_id, "agent_type": agent_type}
        )

        logger.info(f"Conversation {conversation_id} agent type switched to {agent_type}")

        return {
            "success": True,
            "data": {
                "conversation": ConversationResponse.model_validate(updated_conversation),
                "message": "代理类型切换成功"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Switch agent type error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="切换代理类型失败"
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
