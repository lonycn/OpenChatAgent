"""
📨 消息相关数据模型

包括消息、消息类型等相关模型
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field
from sqlalchemy import (
    Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, 
    String, Text, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from .base import BaseModel, TimestampMixin, UUIDMixin, PaginationResponse


class MessageType(str, Enum):
    """消息类型枚举"""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"
    EVENT = "event"
    AUDIO = "audio"
    VIDEO = "video"


class SenderType(str, Enum):
    """发送者类型枚举"""
    CONTACT = "contact"
    AGENT = "agent"
    AI = "ai"
    SYSTEM = "system"


class Message(Base, TimestampMixin, UUIDMixin):
    """消息数据库模型"""
    
    __tablename__ = "messages"
    __table_args__ = {"comment": "消息表"}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, comment="消息ID")
    conversation_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("conversations.id", ondelete="CASCADE"), 
        nullable=False, 
        comment="对话ID"
    )
    sender_type: Mapped[SenderType] = mapped_column(
        SQLEnum(SenderType), 
        nullable=False, 
        comment="发送者类型"
    )
    sender_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey("users.id", ondelete="SET NULL"), 
        comment="发送者ID"
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="消息内容")
    message_type: Mapped[MessageType] = mapped_column(
        SQLEnum(MessageType), 
        default=MessageType.TEXT, 
        nullable=False, 
        comment="消息类型"
    )
    message_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, comment="消息元数据")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否私有消息")
    
    # 关系
    conversation: Mapped["Conversation"] = relationship("Conversation", lazy="select")
    
    def __repr__(self) -> str:
        return f"<Message(id={self.id}, type='{self.message_type}', sender='{self.sender_type}')>"


# ==========================================
# Pydantic 模型
# ==========================================

class MessageBase(BaseModel):
    """消息基础模型"""
    conversation_id: int = Field(description="对话ID")
    sender_type: SenderType = Field(description="发送者类型")
    sender_id: Optional[int] = Field(default=None, description="发送者ID")
    content: str = Field(min_length=1, description="消息内容")
    message_type: MessageType = Field(default=MessageType.TEXT, description="消息类型")
    message_metadata: Optional[Dict[str, Any]] = Field(default=None, description="消息元数据")
    is_private: bool = Field(default=False, description="是否私有消息")


class MessageCreate(MessageBase):
    """创建消息模型"""
    pass


class MessageUpdate(BaseModel):
    """更新消息模型"""
    content: Optional[str] = Field(default=None, min_length=1, description="消息内容")
    message_metadata: Optional[Dict[str, Any]] = Field(default=None, description="消息元数据")
    is_private: Optional[bool] = Field(default=None, description="是否私有消息")


class MessageResponse(MessageBase):
    """消息响应模型"""
    id: int = Field(description="消息ID")
    uuid: str = Field(description="消息UUID")
    created_at: datetime = Field(description="创建时间")
    updated_at: datetime = Field(description="更新时间")


class MessageSend(BaseModel):
    """发送消息模型"""
    session_id: Optional[str] = Field(default=None, description="会话ID")
    conversation_id: Optional[int] = Field(default=None, description="对话ID")
    content: str = Field(min_length=1, max_length=4000, description="消息内容")
    message_type: MessageType = Field(default=MessageType.TEXT, description="消息类型")
    message_metadata: Optional[Dict[str, Any]] = Field(default=None, description="消息元数据")


class MessageListResponse(BaseModel):
    """消息列表响应模型"""
    messages: List[MessageResponse] = Field(description="消息列表")
    pagination: "PaginationResponse" = Field(description="分页信息")


class WebSocketMessage(BaseModel):
    """WebSocket 消息模型"""
    type: str = Field(description="消息类型")
    data: Dict[str, Any] = Field(description="消息数据")
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")


class WebSocketMessageSend(BaseModel):
    """WebSocket 发送消息模型"""
    type: str = Field(description="消息类型")
    session_id: str = Field(description="会话ID")
    content: str = Field(min_length=1, description="消息内容")
    message_type: MessageType = Field(default=MessageType.TEXT, description="消息类型")


class WebSocketAuth(BaseModel):
    """WebSocket 认证模型"""
    type: str = Field(default="auth", description="消息类型")
    token: Optional[str] = Field(default=None, description="认证令牌")
    session_id: Optional[str] = Field(default=None, description="会话ID")


class WebSocketResponse(BaseModel):
    """WebSocket 响应模型"""
    type: str = Field(description="响应类型")
    data: Dict[str, Any] = Field(description="响应数据")
    success: bool = Field(default=True, description="是否成功")
    error: Optional[str] = Field(default=None, description="错误信息")
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")


class AIStreamResponse(BaseModel):
    """AI 流式响应模型"""
    type: str = Field(default="ai_stream", description="响应类型")
    session_id: str = Field(description="会话ID")
    content: str = Field(description="内容片段")
    full_content: str = Field(description="完整内容")
    is_complete: bool = Field(description="是否完成")
    message_metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")


class TypingIndicator(BaseModel):
    """正在输入指示器模型"""
    type: str = Field(default="typing", description="消息类型")
    session_id: str = Field(description="会话ID")
    sender_type: SenderType = Field(description="发送者类型")
    is_typing: bool = Field(description="是否正在输入")


class MessageFeedback(BaseModel):
    """消息反馈模型"""
    message_id: int = Field(description="消息ID")
    rating: int = Field(ge=1, le=5, description="评分 (1-5)")
    comment: Optional[str] = Field(default=None, max_length=500, description="评论")
    feedback_type: str = Field(description="反馈类型")


class MessageSearch(BaseModel):
    """消息搜索模型"""
    query: str = Field(min_length=1, description="搜索关键词")
    conversation_id: Optional[int] = Field(default=None, description="对话ID")
    sender_type: Optional[SenderType] = Field(default=None, description="发送者类型")
    message_type: Optional[MessageType] = Field(default=None, description="消息类型")
    start_date: Optional[datetime] = Field(default=None, description="开始日期")
    end_date: Optional[datetime] = Field(default=None, description="结束日期")
    limit: int = Field(default=20, ge=1, le=100, description="返回数量限制")
