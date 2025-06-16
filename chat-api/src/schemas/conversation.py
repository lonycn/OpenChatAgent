"""
💬 对话相关的数据模型

定义对话相关的请求和响应模型
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from src.models.conversation import ConversationStatus, ConversationPriority
from src.models.base import PaginationResponse


class PaginatedResponse(BaseModel):
    """分页响应基类"""
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    size: int = Field(..., description="每页数量")
    pages: int = Field(..., description="总页数")


class ConversationBase(BaseModel):
    """对话基础模型"""
    title: Optional[str] = Field(None, max_length=200, description="对话标题")
    priority: ConversationPriority = Field(default=ConversationPriority.NORMAL, description="优先级")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="元数据")


class ConversationCreateRequest(ConversationBase):
    """创建对话请求"""
    customer_contact_id: int = Field(..., description="客户联系人ID")


class ConversationUpdateRequest(BaseModel):
    """更新对话请求"""
    title: Optional[str] = Field(None, max_length=200, description="对话标题")
    status: Optional[ConversationStatus] = Field(None, description="状态")
    priority: Optional[ConversationPriority] = Field(None, description="优先级")
    tags: Optional[List[str]] = Field(None, description="标签")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")


class ConversationResponse(BaseModel):
    """对话响应"""
    id: int = Field(..., description="对话ID")
    uuid: str = Field(..., description="对话UUID")
    customer_contact_id: int = Field(..., description="客户联系人ID")
    agent_id: Optional[int] = Field(None, description="客服ID")
    title: Optional[str] = Field(None, description="对话标题")
    status: ConversationStatus = Field(..., description="状态")
    priority: ConversationPriority = Field(..., description="优先级")
    tags: List[str] = Field(default_factory=list, description="标签")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="元数据")
    message_count: int = Field(default=0, description="消息数量")
    last_message_at: Optional[datetime] = Field(None, description="最后消息时间")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    closed_at: Optional[datetime] = Field(None, description="关闭时间")

    class Config:
        from_attributes = True


class ConversationListResponse(PaginatedResponse):
    """对话列表响应"""
    items: List[ConversationResponse] = Field(..., description="对话列表")


class ConversationStatsResponse(BaseModel):
    """对话统计响应"""
    total_conversations: int = Field(..., description="总对话数")
    active_conversations: int = Field(..., description="活跃对话数")
    pending_conversations: int = Field(..., description="待处理对话数")
    closed_conversations: int = Field(..., description="已关闭对话数")
    avg_response_time: float = Field(..., description="平均响应时间（秒）")
    avg_resolution_time: float = Field(..., description="平均解决时间（秒）")
    conversations_today: int = Field(..., description="今日对话数")
    conversations_this_week: int = Field(..., description="本周对话数")
    conversations_this_month: int = Field(..., description="本月对话数")


class ConversationAssignRequest(BaseModel):
    """分配对话请求"""
    agent_id: int = Field(..., description="客服ID")


class ConversationTransferRequest(BaseModel):
    """转移对话请求"""
    target_agent_id: int = Field(..., description="目标客服ID")
    reason: Optional[str] = Field(None, max_length=500, description="转移原因")


class ConversationCloseRequest(BaseModel):
    """关闭对话请求"""
    reason: Optional[str] = Field(None, max_length=500, description="关闭原因")
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5, description="满意度评分")


class ConversationSearchRequest(BaseModel):
    """对话搜索请求"""
    query: str = Field(..., min_length=1, max_length=200, description="搜索关键词")
    status: Optional[ConversationStatus] = Field(None, description="状态过滤")
    priority: Optional[ConversationPriority] = Field(None, description="优先级过滤")
    agent_id: Optional[int] = Field(None, description="客服ID过滤")
    customer_contact_id: Optional[int] = Field(None, description="客户联系人ID过滤")
    date_from: Optional[datetime] = Field(None, description="开始日期")
    date_to: Optional[datetime] = Field(None, description="结束日期")
    tags: Optional[List[str]] = Field(None, description="标签过滤")


class ConversationExportRequest(BaseModel):
    """对话导出请求"""
    format: str = Field(default="csv", description="导出格式")
    filters: Optional[ConversationSearchRequest] = Field(None, description="过滤条件")
    include_messages: bool = Field(default=False, description="是否包含消息")


class ConversationBulkActionRequest(BaseModel):
    """批量操作请求"""
    conversation_ids: List[int] = Field(..., min_items=1, description="对话ID列表")
    action: str = Field(..., description="操作类型")
    params: Optional[Dict[str, Any]] = Field(None, description="操作参数")
