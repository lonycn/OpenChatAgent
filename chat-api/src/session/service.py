"""
💾 会话服务

提供会话相关的业务逻辑处理
"""

from datetime import datetime
from typing import Dict, List, Optional, Any

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import SessionException, NotFoundException
from src.models.session import (
    Session, SessionCreate, SessionUpdate, SessionResponse,
    SessionSwitchAgent, SessionStats, SessionHistory
)
from src.models.conversation import AgentType
from src.session.manager import get_session_manager


class SessionService:
    """会话服务类"""
    
    def __init__(self, db: AsyncSession = None):
        self.db = db
        self.session_manager = get_session_manager()
    
    async def create_session(self, session_data: SessionCreate) -> SessionResponse:
        """
        创建新会话
        
        Args:
            session_data: 会话创建数据
            
        Returns:
            会话响应对象
        """
        try:
            # 创建会话
            session = await self.session_manager.create_session(session_data)
            
            # 转换为响应对象
            return SessionResponse(**session.model_dump())
            
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise SessionException(f"创建会话失败: {str(e)}")
    
    async def get_session(self, session_id: str) -> Optional[SessionResponse]:
        """
        获取会话信息
        
        Args:
            session_id: 会话ID
            
        Returns:
            会话响应对象或None
        """
        try:
            session = await self.session_manager.get_session(session_id)
            if not session:
                return None
            
            return SessionResponse(**session.model_dump())
            
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None
    
    async def update_session(
        self, 
        session_id: str, 
        update_data: SessionUpdate
    ) -> SessionResponse:
        """
        更新会话
        
        Args:
            session_id: 会话ID
            update_data: 更新数据
            
        Returns:
            更新后的会话响应对象
        """
        try:
            session = await self.session_manager.update_session(session_id, update_data)
            if not session:
                raise NotFoundException(f"会话不存在: {session_id}")
            
            return SessionResponse(**session.model_dump())
            
        except NotFoundException:
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
            return await self.session_manager.close_session(session_id)
            
        except Exception as e:
            logger.error(f"Failed to close session {session_id}: {e}")
            raise SessionException(f"关闭会话失败: {str(e)}")
    
    async def delete_session(self, session_id: str) -> bool:
        """
        删除会话
        
        Args:
            session_id: 会话ID
            
        Returns:
            是否成功删除
        """
        try:
            return await self.session_manager.delete_session(session_id)
            
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            raise SessionException(f"删除会话失败: {str(e)}")
    
    async def switch_agent(
        self, 
        session_id: str, 
        switch_data: SessionSwitchAgent
    ) -> SessionResponse:
        """
        切换会话代理
        
        Args:
            session_id: 会话ID
            switch_data: 切换数据
            
        Returns:
            更新后的会话响应对象
        """
        try:
            session = await self.session_manager.switch_agent(
                session_id, 
                switch_data.agent_type,
                switch_data.reason
            )
            
            if not session:
                raise NotFoundException(f"会话不存在: {session_id}")
            
            return SessionResponse(**session.model_dump())
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to switch agent for session {session_id}: {e}")
            raise SessionException(f"切换代理失败: {str(e)}")
    
    async def get_user_sessions(self, user_id: str) -> List[SessionResponse]:
        """
        获取用户的所有会话
        
        Args:
            user_id: 用户ID
            
        Returns:
            会话响应列表
        """
        try:
            sessions = await self.session_manager.get_user_sessions(user_id)
            
            return [SessionResponse(**session.model_dump()) for session in sessions]
            
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
            return await self.session_manager.update_activity(session_id)
            
        except Exception as e:
            logger.error(f"Failed to update activity for session {session_id}: {e}")
            return False
    
    async def get_session_stats(self) -> SessionStats:
        """
        获取会话统计信息
        
        Returns:
            会话统计对象
        """
        try:
            # 获取活跃会话数
            active_sessions = await self.session_manager.get_active_session_count()
            
            # 这里可以添加更多统计逻辑
            # 暂时返回模拟数据
            return SessionStats(
                total_sessions=active_sessions + 100,  # 模拟历史会话
                active_sessions=active_sessions,
                ai_sessions=int(active_sessions * 0.8),  # 假设80%是AI会话
                human_sessions=int(active_sessions * 0.2),  # 假设20%是人工会话
                avg_session_duration=15.5,  # 平均会话时长（分钟）
                avg_messages_per_session=8.2  # 平均每会话消息数
            )
            
        except Exception as e:
            logger.error(f"Failed to get session stats: {e}")
            return SessionStats(
                total_sessions=0,
                active_sessions=0,
                ai_sessions=0,
                human_sessions=0,
                avg_session_duration=0.0,
                avg_messages_per_session=0.0
            )
    
    async def get_session_history(
        self, 
        session_id: str,
        include_messages: bool = True
    ) -> Optional[SessionHistory]:
        """
        获取会话历史
        
        Args:
            session_id: 会话ID
            include_messages: 是否包含消息历史
            
        Returns:
            会话历史对象或None
        """
        try:
            session = await self.session_manager.get_session(session_id)
            if not session:
                return None
            
            # 计算会话持续时间
            duration_minutes = None
            if session.status.value == "closed":
                duration = session.updated_at - session.created_at
                duration_minutes = duration.total_seconds() / 60
            
            # 获取消息历史（这里需要实现消息服务）
            messages = []
            total_messages = 0
            
            if include_messages:
                # 这里应该调用消息服务获取消息历史
                # message_service = MessageService()
                # messages = await message_service.get_session_messages(session_id)
                # total_messages = len(messages)
                
                # 暂时返回模拟数据
                messages = [
                    {
                        "id": 1,
                        "content": "Hello",
                        "sender_type": "contact",
                        "created_at": session.created_at.isoformat()
                    },
                    {
                        "id": 2,
                        "content": "Hi there! How can I help you?",
                        "sender_type": "ai",
                        "created_at": session.created_at.isoformat()
                    }
                ]
                total_messages = len(messages)
            
            return SessionHistory(
                session_id=session_id,
                messages=messages,
                total_messages=total_messages,
                start_time=session.created_at,
                end_time=session.updated_at if session.status.value == "closed" else None,
                duration_minutes=duration_minutes
            )
            
        except Exception as e:
            logger.error(f"Failed to get session history for {session_id}: {e}")
            return None
    
    async def cleanup_expired_sessions(self) -> int:
        """
        清理过期会话
        
        Returns:
            清理的会话数量
        """
        try:
            return await self.session_manager.cleanup_expired_sessions()
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")
            return 0
    
    async def validate_session_access(
        self, 
        session_id: str, 
        user_id: str = None
    ) -> bool:
        """
        验证会话访问权限
        
        Args:
            session_id: 会话ID
            user_id: 用户ID（可选）
            
        Returns:
            是否有访问权限
        """
        try:
            session = await self.session_manager.get_session(session_id)
            if not session:
                return False
            
            # 如果指定了用户ID，检查是否匹配
            if user_id and session.user_id != user_id:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to validate session access: {e}")
            return False
    
    async def get_session_context(self, session_id: str) -> Dict[str, Any]:
        """
        获取会话上下文
        
        Args:
            session_id: 会话ID
            
        Returns:
            会话上下文数据
        """
        try:
            session = await self.session_manager.get_session(session_id)
            if not session:
                return {}
            
            # 构建上下文数据
            context = {
                "session_id": session_id,
                "user_id": session.user_id,
                "agent_type": session.agent_type.value,
                "status": session.status.value,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity_at.isoformat(),
                "metadata": session.session_metadata,
                "context": session.context
            }
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to get session context for {session_id}: {e}")
            return {}
