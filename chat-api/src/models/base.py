"""
🏗️ 基础数据模型

提供通用的基础模型类和混入类
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel as PydanticBaseModel, Field, ConfigDict
from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from src.core.database import Base


class BaseModel(PydanticBaseModel):
    """Pydantic 基础模型"""
    
    model_config = ConfigDict(
        # 允许从 ORM 对象创建
        from_attributes=True,
        # 验证赋值
        validate_assignment=True,
        # 使用枚举值
        use_enum_values=True,
        # JSON 编码器
        json_encoders={
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v),
        }
    )


class TimestampMixin:
    """时间戳混入类"""
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )


class UUIDMixin:
    """UUID 混入类"""
    
    uuid: Mapped[str] = mapped_column(
        CHAR(36),
        default=lambda: str(uuid.uuid4()),
        unique=True,
        nullable=False,
        comment="UUID"
    )


class BaseResponse(BaseModel):
    """基础响应模型"""
    
    success: bool = Field(default=True, description="请求是否成功")
    message: Optional[str] = Field(default=None, description="响应消息")
    timestamp: datetime = Field(default_factory=datetime.now, description="响应时间")


class PaginationParams(BaseModel):
    """分页参数模型"""
    
    page: int = Field(default=1, ge=1, description="页码")
    size: int = Field(default=20, ge=1, le=100, description="每页数量")
    
    @property
    def offset(self) -> int:
        """计算偏移量"""
        return (self.page - 1) * self.size


class PaginationResponse(BaseModel):
    """分页响应模型"""
    
    total: int = Field(description="总数量")
    page: int = Field(description="当前页码")
    size: int = Field(description="每页数量")
    pages: int = Field(description="总页数")
    has_next: bool = Field(description="是否有下一页")
    has_prev: bool = Field(description="是否有上一页")
    
    @classmethod
    def create(cls, total: int, page: int, size: int) -> "PaginationResponse":
        """创建分页响应"""
        pages = (total + size - 1) // size
        return cls(
            total=total,
            page=page,
            size=size,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1,
        )


class ErrorResponse(BaseModel):
    """错误响应模型"""
    
    success: bool = Field(default=False, description="请求是否成功")
    error: Dict[str, Any] = Field(description="错误信息")
    timestamp: datetime = Field(default_factory=datetime.now, description="响应时间")
    
    @classmethod
    def create(
        cls,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> "ErrorResponse":
        """创建错误响应"""
        return cls(
            error={
                "code": code,
                "message": message,
                "details": details or {},
            }
        )


class HealthResponse(BaseModel):
    """健康检查响应模型"""
    
    status: str = Field(description="服务状态")
    version: str = Field(description="服务版本")
    timestamp: datetime = Field(default_factory=datetime.now, description="检查时间")
    services: Dict[str, Any] = Field(default_factory=dict, description="依赖服务状态")
    
    @classmethod
    def create(
        cls,
        status: str,
        version: str,
        services: Optional[Dict[str, Any]] = None
    ) -> "HealthResponse":
        """创建健康检查响应"""
        return cls(
            status=status,
            version=version,
            services=services or {},
        )
