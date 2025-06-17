"""
📡 WebSocket 路由

处理WebSocket连接和消息路由
"""

import json
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from loguru import logger

from src.config.settings import get_settings
from src.core.exceptions import WebSocketException
from src.models.message import (
    WebSocketMessage, WebSocketResponse, WebSocketAuth,
    WebSocketMessageSend, TypingIndicator
)
from src.websocket.manager import websocket_manager
from src.utils.metrics import metrics

settings = get_settings()

# 创建路由
router = APIRouter()
websocket_router = router  # 导出别名


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket主端点
    
    处理WebSocket连接和消息路由
    """
    connection_id = None
    
    try:
        # 建立连接
        connection_id = await websocket_manager.connect(websocket)
        
        # 发送连接确认
        from datetime import datetime
        welcome_message = WebSocketResponse(
            type="connection",
            data={
                "connection_id": connection_id,
                "status": "connected",
                "server_time": datetime.now().isoformat()
            }
        )
        await websocket_manager.send_to_connection(
            connection_id, 
            welcome_message.model_dump()
        )
        
        # 消息处理循环
        while True:
            try:
                # 接收消息
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # 记录指标
                metrics.record_websocket_message("inbound", message_data.get("type", "unknown"))
                
                # 更新连接活动时间
                connection = websocket_manager.get_connection(connection_id)
                if connection:
                    connection.update_activity()
                
                # 处理消息
                await handle_websocket_message(connection_id, message_data)
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket client disconnected: {connection_id}")
                break
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON from {connection_id}: {e}")
                await send_error_response(connection_id, "INVALID_JSON", "消息格式错误")
            except Exception as e:
                logger.error(f"Error handling message from {connection_id}: {e}")
                await send_error_response(connection_id, "MESSAGE_ERROR", "消息处理失败")
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    
    finally:
        # 清理连接
        if connection_id:
            await websocket_manager.disconnect(connection_id)


async def handle_websocket_message(connection_id: str, message_data: Dict[str, Any]):
    """处理WebSocket消息"""
    message_type = message_data.get("type")
    
    if not message_type:
        await send_error_response(connection_id, "MISSING_TYPE", "缺少消息类型")
        return
    
    try:
        # 根据消息类型路由
        if message_type == "auth":
            await handle_auth_message(connection_id, message_data)
        elif message_type == "ping":
            await handle_ping_message(connection_id, message_data)
        elif message_type == "message" or message_type == "text":
            await handle_chat_message(connection_id, message_data)
        elif message_type == "typing":
            await handle_typing_message(connection_id, message_data)
        elif message_type == "join_session":
            await handle_join_session(connection_id, message_data)
        elif message_type == "leave_session":
            await handle_leave_session(connection_id, message_data)
        else:
            await send_error_response(connection_id, "UNKNOWN_TYPE", f"未知消息类型: {message_type}")
    
    except Exception as e:
        logger.error(f"Error handling {message_type} message: {e}")
        await send_error_response(connection_id, "HANDLER_ERROR", "消息处理器错误")


async def handle_auth_message(connection_id: str, message_data: Dict[str, Any]):
    """处理认证消息"""
    try:
        auth_data = WebSocketAuth(**message_data)
        
        # 这里应该验证token
        # 暂时使用简单的认证逻辑
        token = auth_data.token
        session_id = auth_data.session_id
        
        if token:
            # 验证token并获取用户信息
            # user_info = await verify_jwt_token(token)
            # 暂时使用模拟数据
            user_id = "user_123"  # 从token解析
            
            # 认证连接
            success = websocket_manager.authenticate_connection(
                connection_id, user_id, session_id
            )
            
            if success:
                response = WebSocketResponse(
                    type="auth",
                    data={
                        "status": "authenticated",
                        "user_id": user_id,
                        "session_id": session_id
                    }
                )
            else:
                response = WebSocketResponse(
                    type="auth",
                    data={"status": "failed"},
                    success=False,
                    error="认证失败"
                )
        else:
            # 游客认证
            user_id = f"guest_{connection_id[:8]}"
            websocket_manager.authenticate_connection(
                connection_id, user_id, session_id
            )
            
            response = WebSocketResponse(
                type="auth",
                data={
                    "status": "authenticated",
                    "user_id": user_id,
                    "session_id": session_id,
                    "guest": True
                }
            )
        
        await websocket_manager.send_to_connection(
            connection_id, 
            response.model_dump()
        )
        
    except Exception as e:
        logger.error(f"Auth message error: {e}")
        await send_error_response(connection_id, "AUTH_ERROR", "认证失败")


async def handle_ping_message(connection_id: str, message_data: Dict[str, Any]):
    """处理ping消息"""
    response = WebSocketResponse(
        type="pong",
        data={
            "timestamp": message_data.get("timestamp"),
            "server_time": "2024-01-01T00:00:00Z"
        }
    )
    
    await websocket_manager.send_to_connection(
        connection_id, 
        response.model_dump()
    )


async def handle_chat_message(connection_id: str, message_data: Dict[str, Any]):
    """处理聊天消息"""
    try:
        # 兼容不同的消息格式
        content = message_data.get("content") or message_data.get("text", "")
        session_id = message_data.get("session_id") or message_data.get("sessionId")
        message_id = message_data.get("id") or message_data.get("message_id")

        connection = websocket_manager.get_connection(connection_id)
        if not connection:
            await send_error_response(connection_id, "CONNECTION_NOT_FOUND", "连接不存在")
            return

        # 自动认证匿名用户
        if not connection.authenticated:
            connection.authenticated = True
            connection.user_id = connection.user_id or f"user_{connection_id[:8]}"

        # 如果没有会话ID，创建一个新的会话
        if not session_id:
            from src.session.manager import session_manager
            session_id = await session_manager.create_session(
                user_id=connection.user_id or "anonymous",
                metadata={"connection_id": connection_id}
            )

        # 确认消息已收到
        confirm_response = WebSocketResponse(
            type="message_sent",
            data={
                "message_id": message_id,
                "session_id": session_id,
                "status": "received"
            }
        )

        await websocket_manager.send_to_connection(
            connection_id,
            confirm_response.model_dump()
        )

        # 调用消息服务处理消息并获取AI回复
        from src.services.message import MessageService
        from src.models.message import MessageSend

        message_service = MessageService()

        # 构建消息数据
        message_send = MessageSend(
            session_id=session_id,
            content=content,
            message_type="text"
        )

        # 发送消息并触发AI回复
        await message_service.send_message(message_send)

    except Exception as e:
        logger.error(f"Chat message error: {e}")
        await send_error_response(connection_id, "MESSAGE_ERROR", f"消息处理失败: {str(e)}")


async def handle_typing_message(connection_id: str, message_data: Dict[str, Any]):
    """处理正在输入消息"""
    try:
        typing = TypingIndicator(**message_data)
        
        connection = websocket_manager.get_connection(connection_id)
        if not connection or not connection.authenticated:
            return
        
        # 转发正在输入状态到会话的其他连接
        typing_response = WebSocketResponse(
            type="typing",
            data={
                "session_id": typing.session_id,
                "sender": connection.user_id,
                "is_typing": typing.is_typing
            }
        )
        
        await websocket_manager.send_to_session(
            typing.session_id,
            typing_response.model_dump(),
            exclude_connection=connection_id
        )
        
    except Exception as e:
        logger.error(f"Typing message error: {e}")


async def handle_join_session(connection_id: str, message_data: Dict[str, Any]):
    """处理加入会话"""
    try:
        session_id = message_data.get("session_id")
        if not session_id:
            await send_error_response(connection_id, "MISSING_SESSION", "缺少会话ID")
            return
        
        connection = websocket_manager.get_connection(connection_id)
        if not connection or not connection.authenticated:
            await send_error_response(connection_id, "NOT_AUTHENTICATED", "未认证")
            return
        
        # 更新连接的会话ID
        old_session_id = connection.session_id
        connection.session_id = session_id
        
        # 更新会话映射
        if old_session_id and old_session_id in websocket_manager.session_connections:
            websocket_manager.session_connections[old_session_id].discard(connection_id)
        
        if session_id not in websocket_manager.session_connections:
            websocket_manager.session_connections[session_id] = set()
        websocket_manager.session_connections[session_id].add(connection_id)
        
        # 发送确认
        response = WebSocketResponse(
            type="session_joined",
            data={
                "session_id": session_id,
                "status": "joined"
            }
        )
        
        await websocket_manager.send_to_connection(
            connection_id,
            response.model_dump()
        )
        
        logger.info(f"Connection {connection_id} joined session {session_id}")
        
    except Exception as e:
        logger.error(f"Join session error: {e}")
        await send_error_response(connection_id, "JOIN_ERROR", "加入会话失败")


async def handle_leave_session(connection_id: str, message_data: Dict[str, Any]):
    """处理离开会话"""
    try:
        connection = websocket_manager.get_connection(connection_id)
        if not connection:
            return
        
        session_id = connection.session_id
        if session_id:
            # 从会话映射中移除
            if session_id in websocket_manager.session_connections:
                websocket_manager.session_connections[session_id].discard(connection_id)
            
            connection.session_id = None
            
            # 发送确认
            response = WebSocketResponse(
                type="session_left",
                data={
                    "session_id": session_id,
                    "status": "left"
                }
            )
            
            await websocket_manager.send_to_connection(
                connection_id,
                response.model_dump()
            )
            
            logger.info(f"Connection {connection_id} left session {session_id}")
        
    except Exception as e:
        logger.error(f"Leave session error: {e}")


async def send_error_response(connection_id: str, error_code: str, error_message: str):
    """发送错误响应"""
    response = WebSocketResponse(
        type="error",
        data={
            "code": error_code,
            "message": error_message
        },
        success=False,
        error=error_message
    )
    
    await websocket_manager.send_to_connection(
        connection_id,
        response.model_dump()
    )
