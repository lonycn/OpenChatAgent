"""
💾 会话管理器

管理用户会话状态和生命周期
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import uuid4

from loguru import logger

from src.config.settings import get_settings
from src.core.redis import get_redis_manager
from src.core.exceptions import SessionException
from src.models.session import (
    Session, SessionStatus, SessionCreate, SessionUpdate,
    SessionConfig
)
from src.models.conversation import AgentType
from src.utils.metrics import metrics

settings = get_settings()


class SessionManager:
    """会话管理器"""
    
    def __init__(self, redis_client=None):
        self.redis = redis_client or get_redis_manager()
        self.config = SessionConfig()
        
        # Redis键前缀
        self.session_prefix = "session:"
        self.user_sessions_prefix = "user_sessions:"
        self.session_index_key = "session_index"
        
        # 清理任务
        self._cleanup_task: Optional[asyncio.Task] = None
    
    async def create_session(self, session_data: SessionCreate) -> Session:
        """
        创建新会话
        
        Args:
            session_data: 会话创建数据
            
        Returns:
            创建的会话对象
        """
        try:
            # 生成会话ID
            session_id = str(uuid4())
            
            # 计算过期时间
            expires_at = datetime.now() + timedelta(seconds=self.config.max_session_duration)
            
            # 创建会话对象
            session = Session(
                session_id=session_id,
                user_id=session_data.user_id,
                agent_type=session_data.agent_type,
                status=SessionStatus.ACTIVE,
                session_metadata=session_data.session_metadata or {},
                expires_at=expires_at
            )
            
            # 检查用户会话数限制
            user_sessions = await self.get_user_sessions(session_data.user_id)
            if len(user_sessions) >= settings.MAX_SESSIONS_PER_USER:
                # 关闭最旧的会话
                oldest_session = min(user_sessions, key=lambda s: s.created_at)
                await self.close_session(oldest_session.session_id)
            
            # 保存会话到Redis
            await self._save_session(session)
            
            # 添加到用户会话索引
            await self._add_to_user_sessions(session_data.user_id, session_id)
            
            # 添加到全局会话索引
            await self._add_to_session_index(session_id)
            
            # 更新指标
            metrics.set_active_sessions(await self.get_active_session_count())
            
            logger.info(f"Session created: {session_id} for user: {session_data.user_id}")
            
            # 启动清理任务
            if not self._cleanup_task:
                self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            
            return session
            
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise SessionException(f"创建会话失败: {str(e)}")
    
    async def get_session(self, session_id: str) -> Optional[Session]:
        """
        获取会话
        
        Args:
            session_id: 会话ID
            
        Returns:
            会话对象或None
        """
        try:
            session_key = f"{self.session_prefix}{session_id}"
            session_data = await self.redis.get_json(session_key, "session")
            
            if not session_data:
                return None
            
            session = Session(**session_data)
            
            # 检查会话是否过期
            if session.expires_at and datetime.now() > session.expires_at:
                await self.close_session(session_id)
                return None
            
            return session
            
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None
    
    async def update_session(
        self, 
        session_id: str, 
        update_data: SessionUpdate
    ) -> Optional[Session]:
        """
        更新会话
        
        Args:
            session_id: 会话ID
            update_data: 更新数据
            
        Returns:
            更新后的会话对象
        """
        try:
            session = await self.get_session(session_id)
            if not session:
                raise SessionException(f"会话不存在: {session_id}")
            
            # 更新字段
            update_dict = update_data.model_dump(exclude_none=True)
            for key, value in update_dict.items():
                if hasattr(session, key):
                    setattr(session, key, value)
            
            session.updated_at = datetime.now()
            session.last_activity_at = datetime.now()
            
            # 保存更新
            await self._save_session(session)
            
            logger.info(f"Session updated: {session_id}")
            return session
            
        except SessionException:
            raise
        except Exception as e:
            logger.error(f"Failed to update session {session_id}: {e}")
            raise SessionException(f"更新会话失败: {str(e)}")
    
    async def close_session(self, session_id: str) -> bool:
        """
        关闭会话
        
        Args:
            session_id: 会话ID
            
        Returns:
            是否成功关闭
        """
        try:
            session = await self.get_session(session_id)
            if not session:
                return False
            
            # 更新会话状态
            session.status = SessionStatus.CLOSED
            session.updated_at = datetime.now()
            
            # 保存更新
            await self._save_session(session)
            
            # 从活跃会话索引中移除
            await self._remove_from_user_sessions(session.user_id, session_id)
            await self._remove_from_session_index(session_id)
            
            # 更新指标
            metrics.set_active_sessions(await self.get_active_session_count())
            
            logger.info(f"Session closed: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to close session {session_id}: {e}")
            return False
    
    async def delete_session(self, session_id: str) -> bool:
        """
        删除会话
        
        Args:
            session_id: 会话ID
            
        Returns:
            是否成功删除
        """
        try:
            session = await self.get_session(session_id)
            if not session:
                return False
            
            # 删除会话数据
            session_key = f"{self.session_prefix}{session_id}"
            await self.redis.delete(session_key, "session")
            
            # 从索引中移除
            await self._remove_from_user_sessions(session.user_id, session_id)
            await self._remove_from_session_index(session_id)
            
            logger.info(f"Session deleted: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            return False
    
    async def get_user_sessions(self, user_id: str) -> List[Session]:
        """
        获取用户的所有会话
        
        Args:
            user_id: 用户ID
            
        Returns:
            会话列表
        """
        try:
            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
            session_ids = await self.redis.lrange(user_sessions_key, db="session")
            
            sessions = []
            for session_id in session_ids:
                session = await self.get_session(session_id)
                if session:
                    sessions.append(session)
            
            return sessions
            
        except Exception as e:
            logger.error(f"Failed to get user sessions for {user_id}: {e}")
            return []
    
    async def update_activity(self, session_id: str) -> bool:
        """
        更新会话活动时间
        
        Args:
            session_id: 会话ID
            
        Returns:
            是否成功更新
        """
        try:
            session = await self.get_session(session_id)
            if not session:
                return False
            
            session.last_activity_at = datetime.now()
            await self._save_session(session)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update activity for session {session_id}: {e}")
            return False
    
    async def switch_agent(
        self, 
        session_id: str, 
        agent_type: AgentType,
        reason: str = None
    ) -> Optional[Session]:
        """
        切换会话代理类型
        
        Args:
            session_id: 会话ID
            agent_type: 新的代理类型
            reason: 切换原因
            
        Returns:
            更新后的会话对象
        """
        try:
            session = await self.get_session(session_id)
            if not session:
                raise SessionException(f"会话不存在: {session_id}")
            
            old_agent_type = session.agent_type
            session.agent_type = agent_type
            session.updated_at = datetime.now()
            session.last_activity_at = datetime.now()
            
            # 记录切换信息到元数据
            if "agent_switches" not in session.session_metadata:
                session.session_metadata["agent_switches"] = []

            session.session_metadata["agent_switches"].append({
                "from": old_agent_type.value,
                "to": agent_type.value,
                "reason": reason,
                "timestamp": datetime.now().isoformat()
            })
            
            await self._save_session(session)
            
            logger.info(f"Agent switched for session {session_id}: {old_agent_type.value} -> {agent_type.value}")
            return session
            
        except SessionException:
            raise
        except Exception as e:
            logger.error(f"Failed to switch agent for session {session_id}: {e}")
            raise SessionException(f"切换代理失败: {str(e)}")
    
    async def get_active_session_count(self) -> int:
        """获取活跃会话数"""
        try:
            session_ids = await self.redis.lrange(self.session_index_key, db="session")
            return len(session_ids)
        except Exception:
            return 0
    
    async def cleanup_expired_sessions(self) -> int:
        """清理过期会话"""
        try:
            session_ids = await self.redis.lrange(self.session_index_key, db="session")
            cleaned_count = 0
            
            for session_id in session_ids:
                session = await self.get_session(session_id)
                if not session:
                    # 会话不存在，从索引中移除
                    await self._remove_from_session_index(session_id)
                    cleaned_count += 1
                    continue
                
                # 检查是否过期
                now = datetime.now()
                
                # 检查绝对过期时间
                if session.expires_at and now > session.expires_at:
                    await self.close_session(session_id)
                    cleaned_count += 1
                    continue
                
                # 检查空闲超时
                idle_time = now - session.last_activity_at
                if idle_time.total_seconds() > settings.SESSION_IDLE_TIMEOUT:
                    await self.close_session(session_id)
                    cleaned_count += 1
                    continue
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired sessions")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")
            return 0
    
    async def _save_session(self, session: Session):
        """保存会话到Redis"""
        session_key = f"{self.session_prefix}{session.session_id}"
        session_data = session.model_dump()
        
        # 转换datetime为字符串
        for key, value in session_data.items():
            if isinstance(value, datetime):
                session_data[key] = value.isoformat()
        
        await self.redis.set_json(
            session_key, 
            session_data, 
            expire=self.config.max_session_duration,
            db="session"
        )
    
    async def _add_to_user_sessions(self, user_id: str, session_id: str):
        """添加到用户会话索引"""
        user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
        await self.redis.lpush(user_sessions_key, session_id, db="session")
        await self.redis.expire(user_sessions_key, self.config.max_session_duration, db="session")
    
    async def _remove_from_user_sessions(self, user_id: str, session_id: str):
        """从用户会话索引中移除"""
        user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
        # Redis没有直接的lrem方法，需要手动实现
        session_ids = await self.redis.lrange(user_sessions_key, db="session")
        if session_id in session_ids:
            session_ids.remove(session_id)
            await self.redis.delete(user_sessions_key, db="session")
            for sid in session_ids:
                await self.redis.lpush(user_sessions_key, sid, db="session")
    
    async def _add_to_session_index(self, session_id: str):
        """添加到全局会话索引"""
        await self.redis.lpush(self.session_index_key, session_id, db="session")
    
    async def _remove_from_session_index(self, session_id: str):
        """从全局会话索引中移除"""
        session_ids = await self.redis.lrange(self.session_index_key, db="session")
        if session_id in session_ids:
            session_ids.remove(session_id)
            await self.redis.delete(self.session_index_key, db="session")
            for sid in session_ids:
                await self.redis.lpush(self.session_index_key, sid, db="session")
    
    async def _cleanup_loop(self):
        """清理循环"""
        while True:
            try:
                await asyncio.sleep(settings.SESSION_CLEANUP_INTERVAL)
                await self.cleanup_expired_sessions()
            except Exception as e:
                logger.error(f"Session cleanup loop error: {e}")
    
    async def shutdown(self):
        """关闭会话管理器"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
        
        logger.info("Session manager shutdown complete")


# 全局会话管理器实例（延迟初始化）
session_manager: Optional[SessionManager] = None


def init_session_manager() -> None:
    """初始化会话管理器"""
    global session_manager
    if session_manager is None:
        session_manager = SessionManager()
        logger.info("✅ Session manager initialized")


def get_session_manager() -> SessionManager:
    """获取会话管理器实例"""
    global session_manager
    if session_manager is None:
        init_session_manager()
    return session_manager


