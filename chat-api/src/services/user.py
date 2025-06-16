"""
👤 用户服务

处理用户相关的业务逻辑
"""

from datetime import datetime
from typing import Dict, List, Optional, Any

from loguru import logger
from sqlalchemy import and_, or_, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import NotFoundException, ValidationException
from src.models.user import User, UserRole, UserStatus
from src.models.base import PaginationResponse


class UserService:
    """用户服务类"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_user(self, user_data: Dict[str, Any]) -> User:
        """
        创建用户
        
        Args:
            user_data: 用户数据
            
        Returns:
            创建的用户对象
        """
        try:
            user = User(**user_data)
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"User created: {user.email} (ID: {user.id})")
            return user
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create user: {e}")
            raise
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        根据ID获取用户
        
        Args:
            user_id: 用户ID
            
        Returns:
            用户对象或None
        """
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get user by ID {user_id}: {e}")
            raise
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        根据邮箱获取用户
        
        Args:
            email: 用户邮箱
            
        Returns:
            用户对象或None
        """
        try:
            stmt = select(User).where(User.email == email)
            result = await self.db.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get user by email {email}: {e}")
            raise
    
    async def get_user_by_uuid(self, uuid: str) -> Optional[User]:
        """
        根据UUID获取用户
        
        Args:
            uuid: 用户UUID
            
        Returns:
            用户对象或None
        """
        try:
            stmt = select(User).where(User.uuid == uuid)
            result = await self.db.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get user by UUID {uuid}: {e}")
            raise
    
    async def update_user(self, user_id: int, user_data: Dict[str, Any]) -> User:
        """
        更新用户信息
        
        Args:
            user_id: 用户ID
            user_data: 更新的用户数据
            
        Returns:
            更新后的用户对象
        """
        try:
            # 检查用户是否存在
            user = await self.get_user_by_id(user_id)
            if not user:
                raise NotFoundException(f"用户不存在: {user_id}")
            
            # 更新用户数据
            for key, value in user_data.items():
                if hasattr(user, key) and value is not None:
                    setattr(user, key, value)
            
            user.updated_at = datetime.now()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"User updated: {user.email} (ID: {user.id})")
            return user
            
        except NotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update user {user_id}: {e}")
            raise
    
    async def update_password(self, user_id: int, password_hash: str) -> bool:
        """
        更新用户密码
        
        Args:
            user_id: 用户ID
            password_hash: 新密码哈希
            
        Returns:
            是否更新成功
        """
        try:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(password_hash=password_hash, updated_at=datetime.now())
            )
            
            result = await self.db.execute(stmt)
            await self.db.commit()
            
            if result.rowcount == 0:
                raise NotFoundException(f"用户不存在: {user_id}")
            
            logger.info(f"Password updated for user ID: {user_id}")
            return True
            
        except NotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update password for user {user_id}: {e}")
            raise
    
    async def update_last_login(self, user_id: int) -> bool:
        """
        更新最后登录时间
        
        Args:
            user_id: 用户ID
            
        Returns:
            是否更新成功
        """
        try:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(last_login_at=datetime.now())
            )
            
            result = await self.db.execute(stmt)
            await self.db.commit()
            
            return result.rowcount > 0
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update last login for user {user_id}: {e}")
            return False
    
    async def delete_user(self, user_id: int) -> bool:
        """
        删除用户
        
        Args:
            user_id: 用户ID
            
        Returns:
            是否删除成功
        """
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                raise NotFoundException(f"用户不存在: {user_id}")
            
            await self.db.delete(user)
            await self.db.commit()
            
            logger.info(f"User deleted: {user.email} (ID: {user.id})")
            return True
            
        except NotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to delete user {user_id}: {e}")
            raise
    
    async def list_users(
        self,
        page: int = 1,
        size: int = 20,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None,
        order: str = "desc"
    ) -> tuple[List[User], PaginationResponse]:
        """
        获取用户列表
        
        Args:
            page: 页码
            size: 每页数量
            filters: 过滤条件
            search: 搜索关键词
            sort: 排序字段
            order: 排序方向
            
        Returns:
            (用户列表, 分页信息)
        """
        try:
            # 构建查询
            stmt = select(User)
            
            # 应用过滤条件
            if filters:
                conditions = []
                
                if filters.get("role"):
                    conditions.append(User.role == UserRole(filters["role"]))
                
                if filters.get("status"):
                    conditions.append(User.status == UserStatus(filters["status"]))
                
                if conditions:
                    stmt = stmt.where(and_(*conditions))
            
            # 应用搜索
            if search:
                search_pattern = f"%{search}%"
                stmt = stmt.where(
                    or_(
                        User.full_name.ilike(search_pattern),
                        User.email.ilike(search_pattern)
                    )
                )
            
            # 应用排序
            if sort:
                sort_column = getattr(User, sort, None)
                if sort_column:
                    if order.lower() == "asc":
                        stmt = stmt.order_by(sort_column.asc())
                    else:
                        stmt = stmt.order_by(sort_column.desc())
            else:
                stmt = stmt.order_by(User.created_at.desc())
            
            # 获取总数
            count_stmt = select(func.count()).select_from(stmt.subquery())
            total_result = await self.db.execute(count_stmt)
            total = total_result.scalar()
            
            # 应用分页
            offset = (page - 1) * size
            stmt = stmt.offset(offset).limit(size)
            
            # 执行查询
            result = await self.db.execute(stmt)
            users = result.scalars().all()
            
            # 创建分页响应
            pagination = PaginationResponse.create(total, page, size)
            
            return list(users), pagination
            
        except Exception as e:
            logger.error(f"Failed to list users: {e}")
            raise
    
    async def get_user_stats(self) -> Dict[str, Any]:
        """
        获取用户统计信息
        
        Returns:
            用户统计数据
        """
        try:
            # 总用户数
            total_stmt = select(func.count(User.id))
            total_result = await self.db.execute(total_stmt)
            total_users = total_result.scalar()
            
            # 按状态统计
            status_stmt = (
                select(User.status, func.count(User.id))
                .group_by(User.status)
            )
            status_result = await self.db.execute(status_stmt)
            status_stats = {status: count for status, count in status_result.fetchall()}
            
            # 按角色统计
            role_stmt = (
                select(User.role, func.count(User.id))
                .group_by(User.role)
            )
            role_result = await self.db.execute(role_stmt)
            role_stats = {role.value: count for role, count in role_result.fetchall()}
            
            # 最近注册用户数（7天内）
            from datetime import timedelta
            week_ago = datetime.now() - timedelta(days=7)
            recent_stmt = (
                select(func.count(User.id))
                .where(User.created_at >= week_ago)
            )
            recent_result = await self.db.execute(recent_stmt)
            recent_users = recent_result.scalar()
            
            return {
                "total_users": total_users,
                "status_distribution": status_stats,
                "role_distribution": role_stats,
                "recent_registrations": recent_users,
            }
            
        except Exception as e:
            logger.error(f"Failed to get user stats: {e}")
            raise
    
    async def change_user_status(self, user_id: int, status: UserStatus) -> User:
        """
        更改用户状态
        
        Args:
            user_id: 用户ID
            status: 新状态
            
        Returns:
            更新后的用户对象
        """
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                raise NotFoundException(f"用户不存在: {user_id}")
            
            user.status = status
            user.updated_at = datetime.now()
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"User status changed: {user.email} -> {status.value}")
            return user
            
        except NotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to change user status {user_id}: {e}")
            raise

    async def get_users(
        self,
        page: int = 1,
        size: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> tuple[List[User], int]:
        """
        获取用户列表（简化版本）

        Args:
            page: 页码
            size: 每页数量
            filters: 过滤条件

        Returns:
            (用户列表, 总数)
        """
        users, pagination = await self.list_users(page=page, size=size, filters=filters)
        return users, pagination.total
