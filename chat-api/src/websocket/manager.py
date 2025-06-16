"""
📡 WebSocket 连接管理器

管理WebSocket连接、消息路由和广播
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Set, Any
from uuid import uuid4

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger

from src.config.settings import get_settings
from src.core.exceptions import WebSocketException
from src.models.message import WebSocketMessage, WebSocketResponse
from src.utils.metrics import metrics

settings = get_settings()


class Connection:
    """WebSocket连接封装"""
    
    def __init__(self, websocket: WebSocket, connection_id: str):
        self.websocket = websocket
        self.connection_id = connection_id
        self.session_id: Optional[str] = None
        self.user_id: Optional[str] = None
        self.authenticated = False
        self.created_at = time.time()
        self.last_activity = time.time()
        self.metadata: Dict[str, Any] = {}
    
    async def send_message(self, message: Dict[str, Any]) -> bool:
        """发送消息"""
        try:
            await self.websocket.send_text(json.dumps(message, ensure_ascii=False))
            self.last_activity = time.time()
            return True
        except Exception as e:
            logger.error(f"Failed to send message to {self.connection_id}: {e}")
            return False
    
    async def send_response(self, response: WebSocketResponse) -> bool:
        """发送响应"""
        return await self.send_message(response.model_dump())
    
    def update_activity(self):
        """更新活动时间"""
        self.last_activity = time.time()
    
    def is_expired(self, timeout: int = None) -> bool:
        """检查连接是否过期"""
        timeout = timeout or settings.WS_CONNECTION_TIMEOUT
        return time.time() - self.last_activity > timeout


class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # 所有连接 {connection_id: Connection}
        self.connections: Dict[str, Connection] = {}
        
        # 会话连接映射 {session_id: Set[connection_id]}
        self.session_connections: Dict[str, Set[str]] = {}
        
        # 用户连接映射 {user_id: Set[connection_id]}
        self.user_connections: Dict[str, Set[str]] = {}
        
        # 心跳任务
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
    
    async def connect(self, websocket: WebSocket) -> str:
        """接受新连接"""
        await websocket.accept()
        
        connection_id = str(uuid4())
        connection = Connection(websocket, connection_id)
        
        self.connections[connection_id] = connection
        
        # 更新指标
        metrics.set_websocket_connections(len(self.connections))
        
        logger.info(f"WebSocket connected: {connection_id}")
        
        # 启动后台任务
        if not self._heartbeat_task:
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        if not self._cleanup_task:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """断开连接"""
        connection = self.connections.get(connection_id)
        if not connection:
            return
        
        # 从会话映射中移除
        if connection.session_id:
            session_connections = self.session_connections.get(connection.session_id, set())
            session_connections.discard(connection_id)
            if not session_connections:
                del self.session_connections[connection.session_id]
        
        # 从用户映射中移除
        if connection.user_id:
            user_connections = self.user_connections.get(connection.user_id, set())
            user_connections.discard(connection_id)
            if not user_connections:
                del self.user_connections[connection.user_id]
        
        # 移除连接
        del self.connections[connection_id]
        
        # 更新指标
        metrics.set_websocket_connections(len(self.connections))
        
        logger.info(f"WebSocket disconnected: {connection_id}")
    
    def get_connection(self, connection_id: str) -> Optional[Connection]:
        """获取连接"""
        return self.connections.get(connection_id)
    
    def authenticate_connection(
        self, 
        connection_id: str, 
        user_id: str, 
        session_id: str = None
    ) -> bool:
        """认证连接"""
        connection = self.connections.get(connection_id)
        if not connection:
            return False
        
        connection.authenticated = True
        connection.user_id = user_id
        
        if session_id:
            connection.session_id = session_id
            
            # 添加到会话映射
            if session_id not in self.session_connections:
                self.session_connections[session_id] = set()
            self.session_connections[session_id].add(connection_id)
        
        # 添加到用户映射
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        logger.info(f"Connection authenticated: {connection_id} -> user:{user_id}, session:{session_id}")
        return True
    
    async def send_to_connection(
        self, 
        connection_id: str, 
        message: Dict[str, Any]
    ) -> bool:
        """发送消息到指定连接"""
        connection = self.connections.get(connection_id)
        if not connection:
            return False
        
        success = await connection.send_message(message)
        if success:
            metrics.record_websocket_message("outbound", message.get("type", "unknown"))
        
        return success
    
    async def send_to_session(
        self, 
        session_id: str, 
        message: Dict[str, Any],
        exclude_connection: str = None
    ) -> int:
        """发送消息到会话的所有连接"""
        connection_ids = self.session_connections.get(session_id, set())
        if exclude_connection:
            connection_ids = connection_ids - {exclude_connection}
        
        sent_count = 0
        for connection_id in connection_ids.copy():  # 复制集合避免修改时出错
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
        
        return sent_count
    
    async def send_to_user(
        self, 
        user_id: str, 
        message: Dict[str, Any],
        exclude_connection: str = None
    ) -> int:
        """发送消息到用户的所有连接"""
        connection_ids = self.user_connections.get(user_id, set())
        if exclude_connection:
            connection_ids = connection_ids - {exclude_connection}
        
        sent_count = 0
        for connection_id in connection_ids.copy():
            if await self.send_to_connection(connection_id, message):
                sent_count += 1
        
        return sent_count
    
    async def broadcast(
        self, 
        message: Dict[str, Any],
        authenticated_only: bool = False
    ) -> int:
        """广播消息到所有连接"""
        sent_count = 0
        for connection in self.connections.values():
            if authenticated_only and not connection.authenticated:
                continue
            
            if await connection.send_message(message):
                sent_count += 1
        
        if sent_count > 0:
            metrics.record_websocket_message("broadcast", message.get("type", "unknown"))
        
        return sent_count
    
    def get_session_connections(self, session_id: str) -> List[str]:
        """获取会话的所有连接ID"""
        return list(self.session_connections.get(session_id, set()))
    
    def get_user_connections(self, user_id: str) -> List[str]:
        """获取用户的所有连接ID"""
        return list(self.user_connections.get(user_id, set()))
    
    def get_connection_count(self) -> int:
        """获取连接总数"""
        return len(self.connections)
    
    def get_authenticated_count(self) -> int:
        """获取已认证连接数"""
        return sum(1 for conn in self.connections.values() if conn.authenticated)
    
    async def _heartbeat_loop(self):
        """心跳循环"""
        while True:
            try:
                await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
                
                # 发送心跳到所有连接
                heartbeat_message = {
                    "type": "heartbeat",
                    "timestamp": time.time()
                }
                
                failed_connections = []
                for connection_id, connection in self.connections.items():
                    if not await connection.send_message(heartbeat_message):
                        failed_connections.append(connection_id)
                
                # 移除失败的连接
                for connection_id in failed_connections:
                    await self.disconnect(connection_id)
                
            except Exception as e:
                logger.error(f"Heartbeat loop error: {e}")
    
    async def _cleanup_loop(self):
        """清理循环"""
        while True:
            try:
                await asyncio.sleep(60)  # 每分钟清理一次
                
                # 清理过期连接
                expired_connections = []
                for connection_id, connection in self.connections.items():
                    if connection.is_expired():
                        expired_connections.append(connection_id)
                
                for connection_id in expired_connections:
                    await self.disconnect(connection_id)
                    logger.info(f"Cleaned up expired connection: {connection_id}")
                
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")
    
    async def shutdown(self):
        """关闭管理器"""
        # 取消后台任务
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()
        
        # 关闭所有连接
        for connection in self.connections.values():
            try:
                await connection.websocket.close()
            except Exception:
                pass
        
        self.connections.clear()
        self.session_connections.clear()
        self.user_connections.clear()
        
        logger.info("WebSocket manager shutdown complete")


# 全局连接管理器实例
websocket_manager = ConnectionManager()


async def init_websocket_manager():
    """初始化WebSocket管理器"""
    logger.info("✅ WebSocket manager initialized")


async def close_websocket_manager():
    """关闭WebSocket管理器"""
    await websocket_manager.shutdown()
