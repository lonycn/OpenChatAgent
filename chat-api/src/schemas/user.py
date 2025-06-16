"""
👤 用户相关的数据模型

定义用户相关的请求和响应模型
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

from src.models.user import UserRole, UserStatus
from src.models.base import PaginationResponse


class PaginatedResponse(BaseModel):
    """分页响应基类"""
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    size: int = Field(..., description="每页数量")
    pages: int = Field(..., description="总页数")


class UserBase(BaseModel):
    """用户基础模型"""
    email: EmailStr = Field(..., description="邮箱地址")
    full_name: str = Field(..., min_length=1, max_length=100, description="姓名")
    avatar_url: Optional[str] = Field(None, description="头像URL")
    timezone: str = Field(default="Asia/Shanghai", description="时区")
    language: str = Field(default="zh-CN", description="语言")


class UserCreateRequest(UserBase):
    """创建用户请求"""
    password: str = Field(..., min_length=6, max_length=128, description="密码")
    role: UserRole = Field(default=UserRole.AGENT, description="用户角色")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="用户状态")


class UserUpdateRequest(BaseModel):
    """更新用户请求"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=100, description="姓名")
    avatar_url: Optional[str] = Field(None, description="头像URL")
    timezone: Optional[str] = Field(None, description="时区")
    language: Optional[str] = Field(None, description="语言")
    role: Optional[UserRole] = Field(None, description="用户角色")
    status: Optional[UserStatus] = Field(None, description="用户状态")


class UserResponse(BaseModel):
    """用户响应"""
    id: int = Field(..., description="用户ID")
    uuid: str = Field(..., description="用户UUID")
    email: EmailStr = Field(..., description="邮箱地址")
    full_name: str = Field(..., description="姓名")
    avatar_url: Optional[str] = Field(None, description="头像URL")
    role: UserRole = Field(..., description="用户角色")
    status: UserStatus = Field(..., description="用户状态")
    timezone: str = Field(..., description="时区")
    language: str = Field(..., description="语言")
    last_login_at: Optional[datetime] = Field(None, description="最后登录时间")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class UserListResponse(PaginatedResponse):
    """用户列表响应"""
    items: List[UserResponse] = Field(..., description="用户列表")


class PasswordChangeRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., min_length=6, max_length=128, description="旧密码")
    new_password: str = Field(..., min_length=6, max_length=128, description="新密码")


class PasswordResetRequest(BaseModel):
    """重置密码请求"""
    email: EmailStr = Field(..., description="邮箱地址")


class PasswordResetConfirmRequest(BaseModel):
    """确认重置密码请求"""
    token: str = Field(..., description="重置令牌")
    new_password: str = Field(..., min_length=6, max_length=128, description="新密码")


class UserStatsResponse(BaseModel):
    """用户统计响应"""
    total_users: int = Field(..., description="总用户数")
    active_users: int = Field(..., description="活跃用户数")
    admin_users: int = Field(..., description="管理员用户数")
    agent_users: int = Field(..., description="客服用户数")
    new_users_today: int = Field(..., description="今日新增用户数")
    new_users_this_week: int = Field(..., description="本周新增用户数")
    new_users_this_month: int = Field(..., description="本月新增用户数")


class UserActivityResponse(BaseModel):
    """用户活动响应"""
    user_id: int = Field(..., description="用户ID")
    action: str = Field(..., description="操作")
    resource: Optional[str] = Field(None, description="资源")
    details: Optional[dict] = Field(None, description="详情")
    ip_address: Optional[str] = Field(None, description="IP地址")
    user_agent: Optional[str] = Field(None, description="用户代理")
    created_at: datetime = Field(..., description="创建时间")

    class Config:
        from_attributes = True


class UserActivityListResponse(PaginatedResponse):
    """用户活动列表响应"""
    items: List[UserActivityResponse] = Field(..., description="活动列表")
