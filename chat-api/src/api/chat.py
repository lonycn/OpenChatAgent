"""
💬 聊天相关API

会话管理、消息发送等接口
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_db, get_current_user_optional, get_current_user_required,
    get_pagination_params
)
from src.config.settings import get_settings
from src.core.exceptions import NotFoundException, ValidationException
from src.middleware.logging import log_user_action
from src.models.session import (
    SessionCreate, SessionResponse, SessionUpdate, SessionSwitchAgent
)
from src.models.message import MessageSend, MessageResponse
from src.models.user import TokenData
from src.models.base import PaginationParams

# 配置
settings = get_settings()

# 创建路由
router = APIRouter()


@router.post("/sessions", response_model=SessionResponse, summary="创建会话")
async def create_session(
    request: Request,
    session_create: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[TokenData] = Depends(get_current_user_optional)
):
    """
    创建新的聊天会话
    
    - **user_id**: 用户ID（访客ID或用户标识）
    - **agent_type**: 代理类型（ai/human）
    - **metadata**: 会话元数据（可选）
    
    返回创建的会话信息
    """
    try:
        # 这里需要实现会话服务
        # session_service = SessionService()
        # session = await session_service.create_session(session_create)
        
        # 临时返回模拟数据
        import uuid
        from datetime import datetime
        from src.models.conversation import AgentType
        
        session_data = SessionResponse(
            session_id=str(uuid.uuid4()),
            user_id=session_create.user_id,
            agent_type=session_create.agent_type,
            status="active",
            context={},
            metadata=session_create.metadata or {},
            created_at=datetime.now(),
            updated_at=datetime.now(),
            last_activity_at=datetime.now()
        )
        
        # 记录操作日志
        log_user_action(
            request, 
            "create_session", 
            "session", 
            {"session_id": session_data.session_id, "user_id": session_create.user_id}
        )
        
        logger.info(f"Session created: {session_data.session_id} for user: {session_create.user_id}")
        
        return session_data
        
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Create session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建会话失败"
        )


@router.get("/sessions/{session_id}", response_model=SessionResponse, summary="获取会话信息")
async def get_session(
    request: Request,
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[TokenData] = Depends(get_current_user_optional)
):
    """
    获取指定会话的详细信息
    
    - **session_id**: 会话ID
    
    返回会话详细信息
    """
    try:
        # 这里需要实现会话服务
        # session_service = SessionService()
        # session = await session_service.get_session(session_id)
        
        # 临时返回模拟数据
        from datetime import datetime
        from src.models.conversation import AgentType
        
        session_data = SessionResponse(
            session_id=session_id,
            user_id="guest_123",
            agent_type=AgentType.AI,
            status="active",
            context={"message_count": 5},
            metadata={"source": "web"},
            created_at=datetime.now(),
            updated_at=datetime.now(),
            last_activity_at=datetime.now()
        )
        
        return session_data
        
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    except Exception as e:
        logger.error(f"Get session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取会话信息失败"
        )


@router.put("/sessions/{session_id}", response_model=SessionResponse, summary="更新会话")
async def update_session(
    request: Request,
    session_id: str,
    session_update: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[TokenData] = Depends(get_current_user_optional)
):
    """
    更新会话信息
    
    - **session_id**: 会话ID
    - **agent_type**: 代理类型（可选）
    - **status**: 会话状态（可选）
    - **context**: 会话上下文（可选）
    - **metadata**: 会话元数据（可选）
    
    返回更新后的会话信息
    """
    try:
        # 这里需要实现会话服务
        # session_service = SessionService()
        # session = await session_service.update_session(session_id, session_update)
        
        # 记录操作日志
        log_user_action(
            request, 
            "update_session", 
            "session", 
            {"session_id": session_id}
        )
        
        # 临时返回模拟数据
        from datetime import datetime
        from src.models.conversation import AgentType
        
        session_data = SessionResponse(
            session_id=session_id,
            user_id="guest_123",
            agent_type=session_update.agent_type or AgentType.AI,
            status=session_update.status or "active",
            context=session_update.context or {},
            metadata=session_update.metadata or {},
            created_at=datetime.now(),
            updated_at=datetime.now(),
            last_activity_at=datetime.now()
        )
        
        logger.info(f"Session updated: {session_id}")
        
        return session_data
        
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    except Exception as e:
        logger.error(f"Update session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新会话失败"
        )


@router.post("/sessions/{session_id}/switch-agent", response_model=SessionResponse, summary="切换代理")
async def switch_agent(
    request: Request,
    session_id: str,
    switch_data: SessionSwitchAgent,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user_required)
):
    """
    切换会话的代理类型（AI/人工）
    
    - **session_id**: 会话ID
    - **agent_type**: 目标代理类型
    - **reason**: 切换原因（可选）
    
    返回更新后的会话信息
    """
    try:
        # 这里需要实现会话服务
        # session_service = SessionService()
        # session = await session_service.switch_agent(session_id, switch_data)
        
        # 记录操作日志
        log_user_action(
            request, 
            "switch_agent", 
            "session", 
            {
                "session_id": session_id, 
                "agent_type": switch_data.agent_type.value,
                "reason": switch_data.reason
            }
        )
        
        # 临时返回模拟数据
        from datetime import datetime
        
        session_data = SessionResponse(
            session_id=session_id,
            user_id="guest_123",
            agent_type=switch_data.agent_type,
            status="active",
            context={"agent_switched": True},
            metadata={"switch_reason": switch_data.reason},
            created_at=datetime.now(),
            updated_at=datetime.now(),
            last_activity_at=datetime.now()
        )
        
        logger.info(f"Agent switched for session {session_id}: {switch_data.agent_type.value}")
        
        return session_data
        
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    except Exception as e:
        logger.error(f"Switch agent error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="切换代理失败"
        )


@router.post("/messages", response_model=MessageResponse, summary="发送消息")
async def send_message(
    request: Request,
    message_data: MessageSend,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[TokenData] = Depends(get_current_user_optional)
):
    """
    发送聊天消息
    
    - **session_id**: 会话ID（可选，如果提供conversation_id则忽略）
    - **conversation_id**: 对话ID（可选）
    - **content**: 消息内容
    - **message_type**: 消息类型（默认为text）
    - **metadata**: 消息元数据（可选）
    
    返回发送的消息信息
    """
    try:
        # 这里需要实现消息服务
        # message_service = MessageService()
        # message = await message_service.send_message(message_data, current_user)
        
        # 记录操作日志
        log_user_action(
            request, 
            "send_message", 
            "message", 
            {
                "session_id": message_data.session_id,
                "conversation_id": message_data.conversation_id,
                "message_type": message_data.message_type.value
            }
        )
        
        # 临时返回模拟数据
        import uuid
        from datetime import datetime
        from src.models.message import SenderType
        
        message_response = MessageResponse(
            id=1,
            uuid=str(uuid.uuid4()),
            conversation_id=message_data.conversation_id or 1,
            sender_type=SenderType.CONTACT,
            sender_id=current_user.user_id if current_user else None,
            content=message_data.content,
            message_type=message_data.message_type,
            metadata=message_data.metadata,
            is_private=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        logger.info(f"Message sent: {message_response.id}")
        
        return message_response
        
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Send message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="发送消息失败"
        )


@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse], summary="获取会话消息")
async def get_session_messages(
    request: Request,
    session_id: str,
    pagination: PaginationParams = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[TokenData] = Depends(get_current_user_optional)
):
    """
    获取指定会话的消息历史
    
    - **session_id**: 会话ID
    - **page**: 页码（默认1）
    - **size**: 每页数量（默认20）
    
    返回消息列表
    """
    try:
        # 这里需要实现消息服务
        # message_service = MessageService()
        # messages = await message_service.get_session_messages(session_id, pagination)
        
        # 临时返回模拟数据
        import uuid
        from datetime import datetime
        from src.models.message import SenderType, MessageType
        
        messages = [
            MessageResponse(
                id=i,
                uuid=str(uuid.uuid4()),
                conversation_id=1,
                sender_type=SenderType.CONTACT if i % 2 == 0 else SenderType.AI,
                sender_id=None,
                content=f"这是第 {i} 条消息",
                message_type=MessageType.TEXT,
                metadata={},
                is_private=False,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            for i in range(1, min(pagination.size + 1, 6))  # 最多返回5条模拟消息
        ]
        
        return messages
        
    except NotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    except Exception as e:
        logger.error(f"Get session messages error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取消息失败"
        )
