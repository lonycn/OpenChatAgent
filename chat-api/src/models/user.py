"""
👤 用户相关数据模型

包括用户、认证、权限等相关模型
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import EmailStr, Field, validator
from sqlalchemy import Boolean, Enum as SQLEnum, Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from .base import BaseModel, TimestampMixin, UUIDMixin


class UserRole(str, Enum):
    """用户角色枚举"""
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    AGENT = "agent"
    GUEST = "guest"


class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class User(Base, TimestampMixin, UUIDMixin):
    """用户数据库模型"""
    
    __tablename__ = "users"
    __table_args__ = {"comment": "用户表"}
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, comment="用户ID")
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, comment="邮箱")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, comment="密码哈希")
    full_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="姓名")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), comment="头像URL")
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole), 
        default=UserRole.AGENT, 
        nullable=False, 
        comment="角色"
    )
    status: Mapped[UserStatus] = mapped_column(
        SQLEnum(UserStatus), 
        default=UserStatus.ACTIVE, 
        nullable=False, 
        comment="状态"
    )
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Shanghai", comment="时区")
    language: Mapped[str] = mapped_column(String(10), default="zh-CN", comment="语言")
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, comment="最后登录时间")
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"


# ==========================================
# Pydantic 模型
# ==========================================

class UserBase(BaseModel):
    """用户基础模型"""
    email: EmailStr = Field(description="邮箱地址")
    full_name: str = Field(min_length=1, max_length=100, description="姓名")
    avatar_url: Optional[str] = Field(default=None, max_length=500, description="头像URL")
    role: UserRole = Field(default=UserRole.AGENT, description="用户角色")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="用户状态")
    timezone: str = Field(default="Asia/Shanghai", max_length=50, description="时区")
    language: str = Field(default="zh-CN", max_length=10, description="语言")


class UserCreate(UserBase):
    """创建用户模型"""
    password: str = Field(min_length=8, max_length=128, description="密码")
    
    @validator("password")
    def validate_password(cls, v):
        """验证密码强度"""
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        if not any(c.isdigit() for c in v):
            raise ValueError("密码必须包含数字")
        if not any(c.isalpha() for c in v):
            raise ValueError("密码必须包含字母")
        return v


class UserUpdate(BaseModel):
    """更新用户模型"""
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=100, description="姓名")
    avatar_url: Optional[str] = Field(default=None, max_length=500, description="头像URL")
    role: Optional[UserRole] = Field(default=None, description="用户角色")
    status: Optional[UserStatus] = Field(default=None, description="用户状态")
    timezone: Optional[str] = Field(default=None, max_length=50, description="时区")
    language: Optional[str] = Field(default=None, max_length=10, description="语言")


class UserResponse(UserBase):
    """用户响应模型"""
    id: int = Field(description="用户ID")
    uuid: str = Field(description="用户UUID")
    last_login_at: Optional[datetime] = Field(default=None, description="最后登录时间")
    created_at: datetime = Field(description="创建时间")
    updated_at: datetime = Field(description="更新时间")


class UserLogin(BaseModel):
    """用户登录模型"""
    email: EmailStr = Field(description="邮箱地址")
    password: str = Field(min_length=1, description="密码")


class UserChangePassword(BaseModel):
    """修改密码模型"""
    old_password: str = Field(min_length=1, description="旧密码")
    new_password: str = Field(min_length=8, max_length=128, description="新密码")
    
    @validator("new_password")
    def validate_new_password(cls, v):
        """验证新密码强度"""
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        if not any(c.isdigit() for c in v):
            raise ValueError("密码必须包含数字")
        if not any(c.isalpha() for c in v):
            raise ValueError("密码必须包含字母")
        return v


class Token(BaseModel):
    """令牌模型"""
    access_token: str = Field(description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(description="过期时间（秒）")
    refresh_token: Optional[str] = Field(default=None, description="刷新令牌")


class TokenData(BaseModel):
    """令牌数据模型"""
    user_id: int = Field(description="用户ID")
    email: str = Field(description="邮箱")
    role: UserRole = Field(description="用户角色")
    exp: datetime = Field(description="过期时间")


class RefreshToken(BaseModel):
    """刷新令牌模型"""
    refresh_token: str = Field(description="刷新令牌")


class UserProfile(BaseModel):
    """用户资料模型"""
    full_name: str = Field(min_length=1, max_length=100, description="姓名")
    avatar_url: Optional[str] = Field(default=None, max_length=500, description="头像URL")
    timezone: str = Field(max_length=50, description="时区")
    language: str = Field(max_length=10, description="语言")


class UserListResponse(BaseModel):
    """用户列表响应模型"""
    users: List[UserResponse] = Field(description="用户列表")
    total: int = Field(description="总数量")
    page: int = Field(description="当前页码")
    size: int = Field(description="每页数量")
    pages: int = Field(description="总页数")
