"""
📨 消息服务

处理消息相关的业务逻辑
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, AsyncGenerator

from loguru import logger
from sqlalchemy import and_, or_, select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import NotFoundException, ValidationException
from src.models.message import (
    Message, MessageCreate, MessageUpdate, MessageResponse,
    MessageSend, MessageType, SenderType, WebSocketMessageSend
)
from src.models.base import PaginationResponse
from src.ai.service import ai_service
from src.session.manager import get_session_manager
from src.websocket.manager import websocket_manager


class MessageService:
    """消息服务类"""
    
    def __init__(self, db: AsyncSession = None):
        self.db = db
        self.session_manager = get_session_manager()
    
    async def create_message(self, message_data: MessageCreate) -> Message:
        """
        创建消息
        
        Args:
            message_data: 消息创建数据
            
        Returns:
            创建的消息对象
        """
        try:
            message = Message(**message_data.model_dump())
            self.db.add(message)
            await self.db.commit()
            await self.db.refresh(message)
            
            logger.info(f"Message created: {message.id}")
            return message
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create message: {e}")
            raise
    
    async def get_message_by_id(self, message_id: int) -> Optional[Message]:
        """
        根据ID获取消息
        
        Args:
            message_id: 消息ID
            
        Returns:
            消息对象或None
        """
        try:
            stmt = select(Message).where(Message.id == message_id)
            result = await self.db.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get message by ID {message_id}: {e}")
            raise
    
    async def get_conversation_messages(
        self,
        conversation_id: int,
        page: int = 1,
        size: int = 20,
        include_private: bool = False
    ) -> tuple[List[Message], PaginationResponse]:
        """
        获取对话的消息列表
        
        Args:
            conversation_id: 对话ID
            page: 页码
            size: 每页数量
            include_private: 是否包含私有消息
            
        Returns:
            (消息列表, 分页信息)
        """
        try:
            # 构建查询
            stmt = select(Message).where(Message.conversation_id == conversation_id)
            
            # 是否包含私有消息
            if not include_private:
                stmt = stmt.where(Message.is_private == False)
            
            # 按创建时间排序
            stmt = stmt.order_by(desc(Message.created_at))
            
            # 获取总数
            count_stmt = select(func.count()).select_from(stmt.subquery())
            total_result = await self.db.execute(count_stmt)
            total = total_result.scalar()
            
            # 应用分页
            offset = (page - 1) * size
            stmt = stmt.offset(offset).limit(size)
            
            # 执行查询
            result = await self.db.execute(stmt)
            messages = result.scalars().all()
            
            # 创建分页响应
            pagination = PaginationResponse.create(total, page, size)
            
            return list(messages), pagination
            
        except Exception as e:
            logger.error(f"Failed to get conversation messages: {e}")
            raise
    
    async def send_message(
        self, 
        message_data: MessageSend,
        sender_id: int = None
    ) -> MessageResponse:
        """
        发送消息
        
        Args:
            message_data: 消息发送数据
            sender_id: 发送者ID
            
        Returns:
            消息响应对象
        """
        try:
            # 确定对话ID
            conversation_id = message_data.conversation_id
            
            if not conversation_id and message_data.session_id:
                # 从会话获取对话ID
                session = await self.session_manager.get_session(message_data.session_id)
                if session and session.conversation_id:
                    conversation_id = session.conversation_id
                else:
                    # 创建新对话
                    conversation_id = await self._create_conversation_for_session(
                        message_data.session_id
                    )
            
            if not conversation_id:
                raise ValidationException("无法确定对话ID")
            
            # 创建消息
            create_data = MessageCreate(
                conversation_id=conversation_id,
                sender_type=SenderType.CONTACT,
                sender_id=sender_id,
                content=message_data.content,
                message_type=message_data.message_type,
                message_metadata=message_data.message_metadata or {}
            )
            
            message = await self.create_message(create_data)
            
            # 更新会话活动时间
            if message_data.session_id:
                await self.session_manager.update_activity(message_data.session_id)
            
            # 发送WebSocket通知
            await self._send_websocket_notification(message, message_data.session_id)
            
            # 处理AI回复 - 使用独立的异步任务和数据库会话
            if message_data.session_id:
                import asyncio
                asyncio.create_task(_process_ai_response_async(
                    message_data.session_id,
                    conversation_id,
                    message_data.content
                ))
            
            return MessageResponse.model_validate(message)
            
        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise ValidationException(f"发送消息失败: {str(e)}")
    
    async def process_websocket_message(
        self,
        ws_message: WebSocketMessageSend,
        connection_id: str
    ) -> MessageResponse:
        """
        处理WebSocket消息
        
        Args:
            ws_message: WebSocket消息数据
            connection_id: 连接ID
            
        Returns:
            消息响应对象
        """
        try:
            # 获取连接信息
            connection = websocket_manager.get_connection(connection_id)
            if not connection or not connection.authenticated:
                raise ValidationException("连接未认证")
            
            # 转换为消息发送数据
            message_data = MessageSend(
                session_id=ws_message.session_id,
                content=ws_message.content,
                message_type=ws_message.message_type
            )
            
            # 发送消息
            return await self.send_message(message_data)
            
        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"Failed to process WebSocket message: {e}")
            raise ValidationException(f"处理WebSocket消息失败: {str(e)}")
    
    async def get_session_messages(
        self,
        session_id: str,
        page: int = 1,
        size: int = 20
    ) -> List[MessageResponse]:
        """
        获取会话消息
        
        Args:
            session_id: 会话ID
            page: 页码
            size: 每页数量
            
        Returns:
            消息响应列表
        """
        try:
            # 获取会话信息
            session = await self.session_manager.get_session(session_id)
            if not session:
                raise NotFoundException(f"会话不存在: {session_id}")
            
            if not session.conversation_id:
                return []  # 会话还没有对话
            
            # 获取对话消息
            messages, _ = await self.get_conversation_messages(
                session.conversation_id, page, size
            )
            
            return [MessageResponse.model_validate(msg) for msg in messages]
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to get session messages: {e}")
            return []
    
    async def _create_conversation_for_session(self, session_id: str) -> int:
        """为会话创建对话"""
        try:
            from src.services.conversation import ConversationService

            # 创建对话服务实例
            conversation_service = ConversationService(self.db)

            # 为会话创建对话
            conversation = await conversation_service.create_conversation_for_session(session_id)

            logger.info(f"Created conversation {conversation.id} for session {session_id}")
            return conversation.id

        except Exception as e:
            logger.error(f"Failed to create conversation for session {session_id}: {e}")
            raise
    
    async def _send_websocket_notification(
        self, 
        message: Message, 
        session_id: str = None
    ):
        """发送WebSocket通知"""
        try:
            # 构建WebSocket消息
            ws_message = {
                "type": "message",
                "data": {
                    "message_id": message.id,
                    "conversation_id": message.conversation_id,
                    "sender_type": message.sender_type.value,
                    "content": message.content,
                    "message_type": message.message_type.value,
                    "created_at": message.created_at.isoformat()
                }
            }
            
            # 发送到会话
            if session_id:
                await websocket_manager.send_to_session(session_id, ws_message)
            
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification: {e}")
    



async def _process_ai_response_async(
    session_id: str,
    conversation_id: int,
    user_message: str
):
    """
    独立的异步AI回复处理函数
    使用独立的数据库会话，避免会话冲突
    """
    try:
        from src.core.database import get_db_session
        from src.session.manager import get_session_manager

        logger.info(f"Processing AI response for session {session_id}")

        # 使用独立的数据库会话
        async with get_db_session() as db_session:
            # 创建新的MessageService实例
            message_service = MessageService(db_session)
            session_manager = get_session_manager()

            # 获取会话信息
            session = await session_manager.get_session(session_id)
            if not session:
                logger.warning(f"Session {session_id} not found")
                return

            # 检查是否是AI会话（默认为AI会话）
            agent_type = getattr(session, 'agent_type', None)
            if agent_type and hasattr(agent_type, 'value'):
                agent_type_value = agent_type.value
            elif isinstance(agent_type, str):
                agent_type_value = agent_type
            else:
                agent_type_value = "ai"  # 默认为AI

            if agent_type_value != "ai":
                logger.info(f"Session {session_id} is not AI session, skipping AI response")
                return

            # 获取对话历史
            messages, _ = await message_service.get_conversation_messages(conversation_id, size=10)

            # 构建AI对话上下文
            ai_context = ai_service.build_conversation_context([
                {
                    "content": msg.content,
                    "sender_type": msg.sender_type.value if hasattr(msg.sender_type, 'value') else str(msg.sender_type),
                    "created_at": msg.created_at
                }
                for msg in reversed(messages)  # 按时间顺序
            ])

            # 获取系统提示词
            system_prompt = ai_service.get_default_system_prompt()

            logger.info(f"Sending AI request for session {session_id}")

            # 发送正在输入状态
            typing_message = {
                "type": "typing",
                "data": {
                    "session_id": session_id,
                    "sender_type": "ai",
                    "is_typing": True
                }
            }
            await websocket_manager.send_to_session(session_id, typing_message)

            # 流式获取AI回复
            full_response = ""
            chunk_count = 0

            async for chunk in ai_service.stream_chat_completion(
                user_message,
                conversation_history=ai_context,
                system_prompt=system_prompt
            ):
                full_response += chunk
                chunk_count += 1

                # 发送流式响应
                stream_message = {
                    "type": "ai_stream",
                    "data": {
                        "session_id": session_id,
                        "content": chunk,
                        "full_content": full_response,
                        "is_complete": False
                    }
                }
                await websocket_manager.send_to_session(session_id, stream_message)

            logger.info(f"AI response completed for session {session_id}, chunks: {chunk_count}, length: {len(full_response)}")

            # 如果没有收到任何回复，使用默认回复
            if not full_response:
                full_response = "抱歉，我现在无法回答您的问题。请稍后再试或联系人工客服。"
                logger.warning(f"No AI response received for session {session_id}, using default response")

            # 停止正在输入状态
            typing_message["data"]["is_typing"] = False
            await websocket_manager.send_to_session(session_id, typing_message)

            # 保存AI回复消息
            ai_message_data = MessageCreate(
                conversation_id=conversation_id,
                sender_type=SenderType.AI,
                content=full_response,
                message_type=MessageType.TEXT,
                message_metadata={"ai_provider": "auto", "chunks": chunk_count}
            )

            ai_message = await message_service.create_message(ai_message_data)

            # 发送完整AI回复
            complete_message = {
                "type": "ai_stream",
                "data": {
                    "session_id": session_id,
                    "content": "",
                    "full_content": full_response,
                    "is_complete": True,
                    "message_id": ai_message.id
                }
            }
            await websocket_manager.send_to_session(session_id, complete_message)

            # 发送消息通知
            await message_service._send_websocket_notification(ai_message, session_id)

            logger.info(f"AI response sent successfully for session {session_id}")

    except Exception as e:
        logger.error(f"Failed to process AI response for session {session_id}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")

        # 发送错误消息
        error_message = {
            "type": "error",
            "data": {
                "session_id": session_id,
                "error": "AI服务暂时不可用，请稍后重试"
            }
        }
        await websocket_manager.send_to_session(session_id, error_message)
