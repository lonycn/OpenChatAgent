"""
💬 对话服务

处理对话相关的业务逻辑
"""

from datetime import datetime
from typing import Dict, List, Optional, Any

from loguru import logger
from sqlalchemy import and_, or_, select, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import NotFoundException, ValidationException
from src.models.conversation import (
    Conversation, ConversationCreate, ConversationUpdate, ConversationResponse,
    ConversationStatus, ConversationPriority, AgentType, ChannelType,
    CustomerContact, CustomerContactCreate, CustomerContactResponse,
    ConversationSwitchAgent, ConversationStats
)
from src.models.base import PaginationResponse


class ConversationService:
    """对话服务类"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_conversation(
        self, 
        conversation_data: ConversationCreate
    ) -> Conversation:
        """
        创建对话
        
        Args:
            conversation_data: 对话创建数据
            
        Returns:
            创建的对话对象
        """
        try:
            conversation = Conversation(**conversation_data.model_dump())
            self.db.add(conversation)
            await self.db.commit()
            await self.db.refresh(conversation)
            
            logger.info(f"Conversation created: {conversation.id}")
            return conversation
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create conversation: {e}")
            raise
    
    async def get_conversation_by_id(self, conversation_id: int) -> Optional[Conversation]:
        """
        根据ID获取对话
        
        Args:
            conversation_id: 对话ID
            
        Returns:
            对话对象或None
        """
        try:
            stmt = select(Conversation).where(Conversation.id == conversation_id)
            result = await self.db.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get conversation by ID {conversation_id}: {e}")
            raise
    
    async def update_conversation(
        self, 
        conversation_id: int, 
        update_data: ConversationUpdate
    ) -> Conversation:
        """
        更新对话
        
        Args:
            conversation_id: 对话ID
            update_data: 更新数据
            
        Returns:
            更新后的对话对象
        """
        try:
            conversation = await self.get_conversation_by_id(conversation_id)
            if not conversation:
                raise NotFoundException(f"对话不存在: {conversation_id}")
            
            # 更新字段
            update_dict = update_data.model_dump(exclude_none=True)
            for key, value in update_dict.items():
                if hasattr(conversation, key):
                    setattr(conversation, key, value)
            
            conversation.updated_at = datetime.now()
            conversation.last_activity_at = datetime.now()
            
            await self.db.commit()
            await self.db.refresh(conversation)
            
            logger.info(f"Conversation updated: {conversation_id}")
            return conversation
            
        except NotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update conversation {conversation_id}: {e}")
            raise
    
    async def switch_agent(
        self, 
        conversation_id: int, 
        switch_data: ConversationSwitchAgent
    ) -> Conversation:
        """
        切换对话代理
        
        Args:
            conversation_id: 对话ID
            switch_data: 切换数据
            
        Returns:
            更新后的对话对象
        """
        try:
            conversation = await self.get_conversation_by_id(conversation_id)
            if not conversation:
                raise NotFoundException(f"对话不存在: {conversation_id}")
            
            old_agent_type = conversation.current_agent_type
            conversation.current_agent_type = switch_data.agent_type
            conversation.assignee_id = switch_data.assignee_id
            conversation.agent_switched_at = datetime.now()
            conversation.updated_at = datetime.now()
            conversation.last_activity_at = datetime.now()
            
            await self.db.commit()
            await self.db.refresh(conversation)
            
            logger.info(f"Agent switched for conversation {conversation_id}: {old_agent_type.value} -> {switch_data.agent_type.value}")
            return conversation
            
        except NotFoundException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to switch agent for conversation {conversation_id}: {e}")
            raise
    
    async def list_conversations(
        self,
        page: int = 1,
        size: int = 20,
        filters: Optional[Dict[str, Any]] = None,
        assignee_id: int = None
    ) -> tuple[List[Conversation], PaginationResponse]:
        """
        获取对话列表
        
        Args:
            page: 页码
            size: 每页数量
            filters: 过滤条件
            assignee_id: 指派客服ID
            
        Returns:
            (对话列表, 分页信息)
        """
        try:
            # 构建查询
            stmt = select(Conversation)
            
            # 应用过滤条件
            conditions = []
            
            if assignee_id:
                conditions.append(Conversation.assignee_id == assignee_id)
            
            if filters:
                if filters.get("status"):
                    conditions.append(Conversation.status == ConversationStatus(filters["status"]))

                if filters.get("priority"):
                    conditions.append(Conversation.priority == ConversationPriority(filters["priority"]))

                if filters.get("assignee_id"):
                    conditions.append(Conversation.assignee_id == filters["assignee_id"])
            
            if conditions:
                stmt = stmt.where(and_(*conditions))
            
            # 按创建时间排序
            stmt = stmt.order_by(desc(Conversation.created_at))
            
            # 获取总数
            count_stmt = select(func.count()).select_from(stmt.subquery())
            total_result = await self.db.execute(count_stmt)
            total = total_result.scalar()
            
            # 应用分页
            offset = (page - 1) * size
            stmt = stmt.offset(offset).limit(size)
            
            # 执行查询
            result = await self.db.execute(stmt)
            conversations = result.scalars().all()
            
            # 创建分页响应
            pagination = PaginationResponse.create(total, page, size)
            
            return list(conversations), pagination
            
        except Exception as e:
            logger.error(f"Failed to list conversations: {e}")
            raise
    
    async def get_conversation_stats(self) -> ConversationStats:
        """
        获取对话统计信息
        
        Returns:
            对话统计对象
        """
        try:
            # 总对话数
            total_stmt = select(func.count(Conversation.id))
            total_result = await self.db.execute(total_stmt)
            total_conversations = total_result.scalar()
            
            # 进行中对话数
            open_stmt = select(func.count(Conversation.id)).where(
                Conversation.status == ConversationStatus.OPEN
            )
            open_result = await self.db.execute(open_stmt)
            open_conversations = open_result.scalar()

            # 已解决对话数
            resolved_stmt = select(func.count(Conversation.id)).where(
                Conversation.status == ConversationStatus.RESOLVED
            )
            resolved_result = await self.db.execute(resolved_stmt)
            resolved_conversations = resolved_result.scalar()

            # AI处理数
            ai_stmt = select(func.count(Conversation.id)).where(
                Conversation.current_agent_type == AgentType.AI
            )
            ai_result = await self.db.execute(ai_stmt)
            ai_handled = ai_result.scalar()

            # 人工处理数
            human_stmt = select(func.count(Conversation.id)).where(
                Conversation.current_agent_type == AgentType.HUMAN
            )
            human_result = await self.db.execute(human_stmt)
            human_handled = human_result.scalar()
            
            # 计算解决率
            resolution_rate = resolved_conversations / total_conversations if total_conversations > 0 else 0
            
            return ConversationStats(
                total_conversations=total_conversations,
                open_conversations=open_conversations,
                resolved_conversations=resolved_conversations,
                ai_handled=ai_handled,
                human_handled=human_handled,
                avg_response_time=2.5,  # 模拟数据
                customer_satisfaction=4.2,  # 模拟数据
                resolution_rate=resolution_rate
            )
            
        except Exception as e:
            logger.error(f"Failed to get conversation stats: {e}")
            raise
    
    async def create_conversation_for_session(self, session_id: str) -> Conversation:
        """
        为会话创建对话
        
        Args:
            session_id: 会话ID
            
        Returns:
            创建的对话对象
        """
        try:
            # 获取会话信息
            from src.session.manager import get_session_manager
            session_manager = get_session_manager()
            session = await session_manager.get_session(session_id)
            
            if not session:
                raise NotFoundException(f"会话不存在: {session_id}")
            
            # 创建或获取客户联系人
            contact = await self._get_or_create_contact(session.user_id)
            
            # 创建对话数据
            conversation_data = ConversationCreate(
                contact_id=contact.id,
                inbox_id=1,  # 默认收件箱
                status=ConversationStatus.OPEN,
                priority=ConversationPriority.MEDIUM,
                channel_type=ChannelType.WEB_WIDGET,
                current_agent_type=session.agent_type
            )
            
            conversation = await self.create_conversation(conversation_data)
            
            # 更新会话的对话ID
            session.conversation_id = conversation.id
            await session_manager._save_session(session)
            
            return conversation
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to create conversation for session {session_id}: {e}")
            raise
    
    async def _get_or_create_contact(self, user_id: str) -> CustomerContact:
        """获取或创建客户联系人"""
        try:
            # 尝试根据用户ID查找现有联系人
            stmt = select(CustomerContact).where(
                CustomerContact.custom_attributes.contains({"user_id": user_id})
            )
            result = await self.db.execute(stmt)
            contact = result.scalar_one_or_none()
            
            if contact:
                return contact
            
            # 创建新联系人
            contact_data = {
                "name": f"用户_{user_id[:8]}",
                "custom_attributes": {"user_id": user_id}
            }
            
            contact = CustomerContact(**contact_data)
            self.db.add(contact)
            await self.db.commit()
            await self.db.refresh(contact)
            
            logger.info(f"Customer contact created: {contact.id} for user: {user_id}")
            return contact
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to get or create contact for user {user_id}: {e}")
            raise
    
    async def create_customer_contact(
        self, 
        contact_data: CustomerContactCreate
    ) -> CustomerContact:
        """
        创建客户联系人
        
        Args:
            contact_data: 联系人创建数据
            
        Returns:
            创建的联系人对象
        """
        try:
            contact = CustomerContact(**contact_data.model_dump())
            self.db.add(contact)
            await self.db.commit()
            await self.db.refresh(contact)
            
            logger.info(f"Customer contact created: {contact.id}")
            return contact
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create customer contact: {e}")
            raise
    
    async def get_customer_contact_by_id(
        self, 
        contact_id: int
    ) -> Optional[CustomerContact]:
        """
        根据ID获取客户联系人
        
        Args:
            contact_id: 联系人ID
            
        Returns:
            联系人对象或None
        """
        try:
            stmt = select(CustomerContact).where(CustomerContact.id == contact_id)
            result = await self.db.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get customer contact by ID {contact_id}: {e}")
            raise
    
    async def update_last_activity(self, conversation_id: int) -> bool:
        """
        更新对话最后活动时间
        
        Args:
            conversation_id: 对话ID
            
        Returns:
            是否更新成功
        """
        try:
            stmt = (
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(last_activity_at=datetime.now())
            )
            
            result = await self.db.execute(stmt)
            await self.db.commit()
            
            return result.rowcount > 0
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update last activity for conversation {conversation_id}: {e}")
            return False

    async def get_conversations(
        self,
        page: int = 1,
        size: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> tuple[List[Conversation], int]:
        """
        获取对话列表（简化版本）

        Args:
            page: 页码
            size: 每页数量
            filters: 过滤条件

        Returns:
            (对话列表, 总数)
        """
        conversations, pagination = await self.list_conversations(page=page, size=size, filters=filters)
        return conversations, pagination.total

    async def create_conversation_from_dict(self, conversation_data: Dict[str, Any]) -> Conversation:
        """
        创建对话（接受字典参数）

        Args:
            conversation_data: 对话数据字典

        Returns:
            创建的对话对象
        """
        try:
            # 设置默认值
            conversation_data.setdefault("status", ConversationStatus.OPEN)
            conversation_data.setdefault("priority", ConversationPriority.NORMAL)
            conversation_data.setdefault("created_at", datetime.now())
            conversation_data.setdefault("updated_at", datetime.now())

            conversation = Conversation(**conversation_data)
            self.db.add(conversation)
            await self.db.commit()
            await self.db.refresh(conversation)

            logger.info(f"Conversation created: {conversation.id}")
            return conversation

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create conversation: {e}")
            raise

    async def update_conversation(
        self,
        conversation_id: int,
        conversation_data: Dict[str, Any]
    ) -> Optional[Conversation]:
        """
        更新对话（接受字典参数）

        Args:
            conversation_id: 对话ID
            conversation_data: 更新数据字典

        Returns:
            更新后的对话对象或None
        """
        try:
            conversation = await self.get_conversation_by_id(conversation_id)
            if not conversation:
                return None

            # 更新字段
            for key, value in conversation_data.items():
                if hasattr(conversation, key):
                    setattr(conversation, key, value)

            conversation.updated_at = datetime.now()

            await self.db.commit()
            await self.db.refresh(conversation)

            logger.info(f"Conversation updated: {conversation_id}")
            return conversation

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update conversation {conversation_id}: {e}")
            raise

    async def delete_conversation(self, conversation_id: int) -> bool:
        """
        删除对话

        Args:
            conversation_id: 对话ID

        Returns:
            是否删除成功
        """
        try:
            conversation = await self.get_conversation_by_id(conversation_id)
            if not conversation:
                return False

            await self.db.delete(conversation)
            await self.db.commit()

            logger.info(f"Conversation deleted: {conversation_id}")
            return True

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to delete conversation {conversation_id}: {e}")
            raise

    async def assign_conversation(self, conversation_id: int, agent_id: int) -> bool:
        """
        分配对话给客服

        Args:
            conversation_id: 对话ID
            agent_id: 客服ID

        Returns:
            是否分配成功
        """
        try:
            conversation = await self.get_conversation_by_id(conversation_id)
            if not conversation:
                return False

            conversation.agent_id = agent_id
            conversation.updated_at = datetime.now()

            await self.db.commit()

            logger.info(f"Conversation {conversation_id} assigned to agent {agent_id}")
            return True

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to assign conversation {conversation_id}: {e}")
            raise

    async def close_conversation(self, conversation_id: int) -> bool:
        """
        关闭对话

        Args:
            conversation_id: 对话ID

        Returns:
            是否关闭成功
        """
        try:
            conversation = await self.get_conversation_by_id(conversation_id)
            if not conversation:
                return False

            conversation.status = ConversationStatus.CLOSED
            conversation.updated_at = datetime.now()

            await self.db.commit()

            logger.info(f"Conversation closed: {conversation_id}")
            return True

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to close conversation {conversation_id}: {e}")
            raise
