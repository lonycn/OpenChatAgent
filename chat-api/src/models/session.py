"""
💾 会话相关数据模型

包括会话状态、会话管理等相关模型
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field, validator
from .base import BaseModel
from .conversation import AgentType


class SessionStatus(str, Enum):
    """会话状态枚举"""
    ACTIVE = "active"
    IDLE = "idle"
    CLOSED = "closed"
    EXPIRED = "expired"


class Session(BaseModel):
    """会话模型"""
    session_id: str = Field(description="会话ID")
    user_id: str = Field(description="用户ID")
    conversation_id: Optional[int] = Field(default=None, description="对话ID")
    agent_type: AgentType = Field(default=AgentType.AI, description="代理类型")
    status: SessionStatus = Field(default=SessionStatus.ACTIVE, description="会话状态")
    context: Dict[str, Any] = Field(default_factory=dict, description="会话上下文")
    session_metadata: Dict[str, Any] = Field(default_factory=dict, description="会话元数据")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    last_activity_at: datetime = Field(default_factory=datetime.now, description="最后活动时间")
    expires_at: Optional[datetime] = Field(default=None, description="过期时间")


class SessionCreate(BaseModel):
    """创建会话模型"""
    user_id: str = Field(description="用户ID")
    agent_type: AgentType = Field(default=AgentType.AI, description="代理类型")
    session_metadata: Optional[Dict[str, Any]] = Field(default=None, description="会话元数据")
    
    @validator("user_id")
    def validate_user_id(cls, v):
        """验证用户ID"""
        if not v or not v.strip():
            raise ValueError("用户ID不能为空")
        return v.strip()


class SessionUpdate(BaseModel):
    """更新会话模型"""
    agent_type: Optional[AgentType] = Field(default=None, description="代理类型")
    status: Optional[SessionStatus] = Field(default=None, description="会话状态")
    context: Optional[Dict[str, Any]] = Field(default=None, description="会话上下文")
    session_metadata: Optional[Dict[str, Any]] = Field(default=None, description="会话元数据")


class SessionResponse(Session):
    """会话响应模型"""
    pass


class SessionSwitchAgent(BaseModel):
    """切换代理模型"""
    agent_type: AgentType = Field(description="代理类型")
    reason: Optional[str] = Field(default=None, max_length=255, description="切换原因")


class SessionContext(BaseModel):
    """会话上下文模型"""
    messages: List[Dict[str, Any]] = Field(default_factory=list, description="消息历史")
    user_info: Dict[str, Any] = Field(default_factory=dict, description="用户信息")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="用户偏好")
    variables: Dict[str, Any] = Field(default_factory=dict, description="会话变量")


class SessionStats(BaseModel):
    """会话统计模型"""
    total_sessions: int = Field(description="总会话数")
    active_sessions: int = Field(description="活跃会话数")
    ai_sessions: int = Field(description="AI会话数")
    human_sessions: int = Field(description="人工会话数")
    avg_session_duration: float = Field(description="平均会话时长（分钟）")
    avg_messages_per_session: float = Field(description="平均每会话消息数")


class SessionListResponse(BaseModel):
    """会话列表响应模型"""
    sessions: List[SessionResponse] = Field(description="会话列表")
    total: int = Field(description="总数量")
    page: int = Field(description="当前页码")
    size: int = Field(description="每页数量")
    pages: int = Field(description="总页数")


class SessionHistory(BaseModel):
    """会话历史模型"""
    session_id: str = Field(description="会话ID")
    messages: List[Dict[str, Any]] = Field(description="消息历史")
    total_messages: int = Field(description="总消息数")
    start_time: datetime = Field(description="开始时间")
    end_time: Optional[datetime] = Field(default=None, description="结束时间")
    duration_minutes: Optional[float] = Field(default=None, description="持续时间（分钟）")


class SessionCleanup(BaseModel):
    """会话清理模型"""
    expired_sessions: int = Field(description="过期会话数")
    idle_sessions: int = Field(description="空闲会话数")
    cleaned_sessions: int = Field(description="清理的会话数")
    cleanup_time: datetime = Field(default_factory=datetime.now, description="清理时间")


class SessionMetrics(BaseModel):
    """会话指标模型"""
    session_id: str = Field(description="会话ID")
    message_count: int = Field(description="消息数量")
    duration_seconds: int = Field(description="持续时间（秒）")
    agent_switches: int = Field(description="代理切换次数")
    user_satisfaction: Optional[float] = Field(default=None, description="用户满意度")
    resolution_status: Optional[str] = Field(default=None, description="解决状态")


class SessionEvent(BaseModel):
    """会话事件模型"""
    session_id: str = Field(description="会话ID")
    event_type: str = Field(description="事件类型")
    event_data: Dict[str, Any] = Field(description="事件数据")
    timestamp: datetime = Field(default_factory=datetime.now, description="事件时间")


class SessionConfig(BaseModel):
    """会话配置模型"""
    max_idle_time: int = Field(default=1800, description="最大空闲时间（秒）")
    max_session_duration: int = Field(default=7200, description="最大会话时长（秒）")
    auto_close_idle: bool = Field(default=True, description="自动关闭空闲会话")
    enable_context_persistence: bool = Field(default=True, description="启用上下文持久化")
    max_context_size: int = Field(default=10000, description="最大上下文大小（字符）")
    cleanup_interval: int = Field(default=300, description="清理间隔（秒）")
