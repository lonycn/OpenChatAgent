"""
💬 对话相关数据模型

包括对话、客户联系人等相关模型
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any

from pydantic import Field, EmailStr
from sqlalchemy import (
    Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, 
    String, Text, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from .base import BaseModel, TimestampMixin, UUIDMixin


class ConversationStatus(str, Enum):
    """对话状态枚举"""
    OPEN = "open"
    PENDING = "pending"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ConversationPriority(str, Enum):
    """对话优先级枚举"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ChannelType(str, Enum):
    """渠道类型枚举"""
    WEB_WIDGET = "web_widget"
    FACEBOOK = "facebook"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    API = "api"


class AgentType(str, Enum):
    """代理类型枚举"""
    AI = "ai"
    HUMAN = "human"


class CustomerContact(Base, TimestampMixin, UUIDMixin):
    """客户联系人数据库模型"""
    
    __tablename__ = "customer_contacts"
    __table_args__ = {"comment": "客户联系人表"}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, comment="客户ID")
    name: Mapped[Optional[str]] = mapped_column(String(100), comment="客户姓名")
    email: Mapped[Optional[str]] = mapped_column(String(255), comment="邮箱")
    phone: Mapped[Optional[str]] = mapped_column(String(20), comment="电话")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), comment="头像URL")
    custom_attributes: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, comment="自定义属性")
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="首次访问时间")
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="最后访问时间")
    
    def __repr__(self) -> str:
        return f"<CustomerContact(id={self.id}, name='{self.name}', email='{self.email}')>"


class Conversation(Base, TimestampMixin, UUIDMixin):
    """对话数据库模型"""
    
    __tablename__ = "conversations"
    __table_args__ = {"comment": "对话表"}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, comment="对话ID")
    contact_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("customer_contacts.id", ondelete="CASCADE"), 
        nullable=False, 
        comment="客户ID"
    )
    assignee_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey("users.id", ondelete="SET NULL"), 
        comment="指派客服ID"
    )
    inbox_id: Mapped[int] = mapped_column(Integer, nullable=False, comment="收件箱ID")
    status: Mapped[ConversationStatus] = mapped_column(
        SQLEnum(ConversationStatus), 
        default=ConversationStatus.OPEN, 
        nullable=False, 
        comment="对话状态"
    )
    priority: Mapped[ConversationPriority] = mapped_column(
        SQLEnum(ConversationPriority), 
        default=ConversationPriority.MEDIUM, 
        nullable=False, 
        comment="优先级"
    )
    channel_type: Mapped[ChannelType] = mapped_column(
        SQLEnum(ChannelType), 
        nullable=False, 
        comment="渠道类型"
    )
    current_agent_type: Mapped[AgentType] = mapped_column(
        SQLEnum(AgentType), 
        default=AgentType.AI, 
        nullable=False, 
        comment="当前代理类型"
    )
    agent_switched_at: Mapped[Optional[datetime]] = mapped_column(DateTime, comment="代理切换时间")
    first_reply_at: Mapped[Optional[datetime]] = mapped_column(DateTime, comment="首次回复时间")
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.now, 
        comment="最后活动时间"
    )
    
    # 关系
    contact: Mapped["CustomerContact"] = relationship("CustomerContact", lazy="select")
    
    def __repr__(self) -> str:
        return f"<Conversation(id={self.id}, status='{self.status}', agent_type='{self.current_agent_type}')>"


# ==========================================
# Pydantic 模型
# ==========================================

class CustomerContactBase(BaseModel):
    """客户联系人基础模型"""
    name: Optional[str] = Field(default=None, max_length=100, description="客户姓名")
    email: Optional[EmailStr] = Field(default=None, description="邮箱")
    phone: Optional[str] = Field(default=None, max_length=20, description="电话")
    avatar_url: Optional[str] = Field(default=None, max_length=500, description="头像URL")
    custom_attributes: Optional[Dict[str, Any]] = Field(default=None, description="自定义属性")


class CustomerContactCreate(CustomerContactBase):
    """创建客户联系人模型"""
    pass


class CustomerContactUpdate(BaseModel):
    """更新客户联系人模型"""
    name: Optional[str] = Field(default=None, max_length=100, description="客户姓名")
    email: Optional[EmailStr] = Field(default=None, description="邮箱")
    phone: Optional[str] = Field(default=None, max_length=20, description="电话")
    avatar_url: Optional[str] = Field(default=None, max_length=500, description="头像URL")
    custom_attributes: Optional[Dict[str, Any]] = Field(default=None, description="自定义属性")


class CustomerContactResponse(CustomerContactBase):
    """客户联系人响应模型"""
    id: int = Field(description="客户ID")
    uuid: str = Field(description="客户UUID")
    first_seen_at: datetime = Field(description="首次访问时间")
    last_seen_at: datetime = Field(description="最后访问时间")
    created_at: datetime = Field(description="创建时间")
    updated_at: datetime = Field(description="更新时间")


class ConversationBase(BaseModel):
    """对话基础模型"""
    contact_id: int = Field(description="客户ID")
    assignee_id: Optional[int] = Field(default=None, description="指派客服ID")
    inbox_id: int = Field(description="收件箱ID")
    status: ConversationStatus = Field(default=ConversationStatus.OPEN, description="对话状态")
    priority: ConversationPriority = Field(default=ConversationPriority.MEDIUM, description="优先级")
    channel_type: ChannelType = Field(description="渠道类型")
    current_agent_type: AgentType = Field(default=AgentType.AI, description="当前代理类型")


class ConversationCreate(ConversationBase):
    """创建对话模型"""
    pass


class ConversationUpdate(BaseModel):
    """更新对话模型"""
    assignee_id: Optional[int] = Field(default=None, description="指派客服ID")
    status: Optional[ConversationStatus] = Field(default=None, description="对话状态")
    priority: Optional[ConversationPriority] = Field(default=None, description="优先级")
    current_agent_type: Optional[AgentType] = Field(default=None, description="当前代理类型")


class ConversationResponse(ConversationBase):
    """对话响应模型"""
    id: int = Field(description="对话ID")
    uuid: str = Field(description="对话UUID")
    agent_switched_at: Optional[datetime] = Field(default=None, description="代理切换时间")
    first_reply_at: Optional[datetime] = Field(default=None, description="首次回复时间")
    last_activity_at: datetime = Field(description="最后活动时间")
    created_at: datetime = Field(description="创建时间")
    updated_at: datetime = Field(description="更新时间")
    
    # 关联数据
    contact: Optional[CustomerContactResponse] = Field(default=None, description="客户信息")


class ConversationSwitchAgent(BaseModel):
    """切换代理模型"""
    agent_type: AgentType = Field(description="代理类型")
    assignee_id: Optional[int] = Field(default=None, description="指派客服ID")
    reason: Optional[str] = Field(default=None, max_length=255, description="切换原因")


class ConversationListResponse(BaseModel):
    """对话列表响应模型"""
    conversations: List[ConversationResponse] = Field(description="对话列表")
    total: int = Field(description="总数量")
    page: int = Field(description="当前页码")
    size: int = Field(description="每页数量")
    pages: int = Field(description="总页数")


class ConversationStats(BaseModel):
    """对话统计模型"""
    total_conversations: int = Field(description="总对话数")
    open_conversations: int = Field(description="进行中对话数")
    resolved_conversations: int = Field(description="已解决对话数")
    ai_handled: int = Field(description="AI处理数")
    human_handled: int = Field(description="人工处理数")
    avg_response_time: float = Field(description="平均响应时间（分钟）")
    customer_satisfaction: Optional[float] = Field(default=None, description="客户满意度")
    resolution_rate: float = Field(description="解决率")
