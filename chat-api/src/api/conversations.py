"""
💬 对话管理 API

提供对话相关的API端点
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.api.deps import get_current_user
from src.models.user import User
from src.models.base import PaginationResponse
from src.services.conversation import ConversationService
from src.schemas.conversation import (
    ConversationResponse,
    ConversationCreateRequest,
    ConversationUpdateRequest,
    ConversationListResponse
)

router = APIRouter()


@router.get("/", response_model=ConversationListResponse)
async def list_conversations(
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """获取对话列表"""
    conversation_service = ConversationService(db)
    
    # 构建过滤条件
    filters = {}
    if status:
        filters["status"] = status
    if priority:
        filters["priority"] = priority
    if search:
        filters["search"] = search
    
    # 根据用户角色过滤
    if current_user.role == "agent":
        filters["assignee_id"] = current_user.id
    
    # 获取对话列表
    conversations, total = await conversation_service.get_conversations(
        page=page,
        size=size,
        filters=filters
    )
    
    return ConversationListResponse(
        items=[ConversationResponse.from_orm(conv) for conv in conversations],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )


@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    conversation_create: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """创建新对话"""
    conversation_service = ConversationService(db)
    
    # 创建对话数据
    conversation_data = conversation_create.model_dump()
    conversation_data["assignee_id"] = current_user.id
    conversation_data["contact_id"] = conversation_data.pop("customer_contact_id")
    conversation_data["inbox_id"] = 1  # 默认收件箱
    conversation_data["channel_type"] = "web_widget"  # 默认渠道
    
    # 创建对话
    new_conversation = await conversation_service.create_conversation(conversation_data)
    
    return ConversationResponse.from_orm(new_conversation)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """获取指定对话信息"""
    conversation_service = ConversationService(db)
    conversation = await conversation_service.get_conversation_by_id(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在"
        )
    
    # 检查权限：客服只能查看自己的对话
    if current_user.role == "agent" and conversation.assignee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足"
        )
    
    return ConversationResponse.from_orm(conversation)


@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    conversation_update: ConversationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """更新对话信息"""
    conversation_service = ConversationService(db)
    
    # 获取对话
    conversation = await conversation_service.get_conversation_by_id(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在"
        )
    
    # 检查权限：客服只能更新自己的对话
    if current_user.role == "agent" and conversation.assignee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足"
        )
    
    # 更新对话
    updated_conversation = await conversation_service.update_conversation(
        conversation_id=conversation_id,
        conversation_data=conversation_update.model_dump(exclude_unset=True)
    )
    
    return ConversationResponse.from_orm(updated_conversation)


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """删除对话（需要管理员权限）"""
    # 检查权限
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足"
        )
    
    conversation_service = ConversationService(db)
    
    # 删除对话
    success = await conversation_service.delete_conversation(conversation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在"
        )
    
    return {"message": "对话删除成功"}


@router.post("/{conversation_id}/assign")
async def assign_conversation(
    conversation_id: int,
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """分配对话给客服（需要管理员权限）"""
    # 检查权限
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足"
        )
    
    conversation_service = ConversationService(db)
    
    # 分配对话
    from src.schemas.conversation import ConversationAssignRequest
    assign_request = ConversationAssignRequest(agent_id=agent_id)
    success = await conversation_service.assign_conversation(conversation_id, assign_request.agent_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话或客服不存在"
        )
    
    return {"message": "对话分配成功"}


@router.post("/{conversation_id}/close")
async def close_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """关闭对话"""
    conversation_service = ConversationService(db)
    
    # 获取对话
    conversation = await conversation_service.get_conversation_by_id(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在"
        )
    
    # 检查权限：客服只能关闭自己的对话
    if current_user.role == "agent" and conversation.assignee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足"
        )
    
    # 关闭对话
    success = await conversation_service.close_conversation(conversation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="对话关闭失败"
        )
    
    return {"message": "对话关闭成功"}
