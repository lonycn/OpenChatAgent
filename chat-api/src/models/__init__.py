"""
📊 Chat API 数据模型

统一的数据模型定义，包括数据库模型和 Pydantic 模型
"""

from .base import *
from .user import *
from .conversation import *
from .message import *
from .session import *

__all__ = [
    # Base models
    "BaseModel",
    "TimestampMixin",
    "UUIDMixin",
    
    # User models
    "User",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserLogin",
    "Token",
    
    # Conversation models
    "Conversation",
    "ConversationCreate",
    "ConversationUpdate",
    "ConversationResponse",
    "CustomerContact",
    "CustomerContactCreate",
    "CustomerContactResponse",
    
    # Message models
    "Message",
    "MessageCreate",
    "MessageUpdate",
    "MessageResponse",
    "MessageType",
    "SenderType",
    
    # Session models
    "Session",
    "SessionCreate",
    "SessionUpdate",
    "SessionResponse",
    "AgentType",
    "SessionStatus",
]
