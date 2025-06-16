"""
📊 指标监控工具

提供Prometheus指标收集和暴露
"""

import time
from typing import Dict, Any

from fastapi import Request, Response
from loguru import logger

try:
    from prometheus_client import (
        Counter, Histogram, Gauge, generate_latest, 
        CollectorRegistry, CONTENT_TYPE_LATEST
    )
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("Prometheus client not available, metrics disabled")

from src.config.settings import get_settings

settings = get_settings()


class MetricsCollector:
    """指标收集器"""
    
    def __init__(self):
        if not PROMETHEUS_AVAILABLE:
            return
        
        # 创建注册表
        self.registry = CollectorRegistry()
        
        # HTTP请求指标
        self.http_requests_total = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.http_request_duration_seconds = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # 业务指标
        self.active_sessions = Gauge(
            'chat_active_sessions',
            'Number of active chat sessions',
            registry=self.registry
        )
        
        self.messages_total = Counter(
            'chat_messages_total',
            'Total chat messages',
            ['sender_type', 'message_type'],
            registry=self.registry
        )
        
        self.ai_requests_total = Counter(
            'ai_requests_total',
            'Total AI service requests',
            ['service', 'status'],
            registry=self.registry
        )
        
        self.ai_request_duration_seconds = Histogram(
            'ai_request_duration_seconds',
            'AI request duration in seconds',
            ['service'],
            registry=self.registry
        )
        
        # 数据库指标
        self.database_connections = Gauge(
            'database_connections',
            'Number of database connections',
            ['state'],
            registry=self.registry
        )
        
        self.database_query_duration_seconds = Histogram(
            'database_query_duration_seconds',
            'Database query duration in seconds',
            registry=self.registry
        )
        
        # Redis指标
        self.redis_operations_total = Counter(
            'redis_operations_total',
            'Total Redis operations',
            ['operation', 'status'],
            registry=self.registry
        )
        
        # WebSocket指标
        self.websocket_connections = Gauge(
            'websocket_connections',
            'Number of WebSocket connections',
            registry=self.registry
        )
        
        self.websocket_messages_total = Counter(
            'websocket_messages_total',
            'Total WebSocket messages',
            ['direction', 'type'],
            registry=self.registry
        )
    
    def record_http_request(
        self, 
        method: str, 
        endpoint: str, 
        status_code: int, 
        duration: float
    ):
        """记录HTTP请求指标"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()
        
        self.http_request_duration_seconds.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def record_message(self, sender_type: str, message_type: str):
        """记录消息指标"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.messages_total.labels(
            sender_type=sender_type,
            message_type=message_type
        ).inc()
    
    def record_ai_request(self, service: str, status: str, duration: float):
        """记录AI请求指标"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.ai_requests_total.labels(
            service=service,
            status=status
        ).inc()
        
        self.ai_request_duration_seconds.labels(
            service=service
        ).observe(duration)
    
    def set_active_sessions(self, count: int):
        """设置活跃会话数"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.active_sessions.set(count)
    
    def record_database_query(self, duration: float):
        """记录数据库查询指标"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.database_query_duration_seconds.observe(duration)
    
    def set_database_connections(self, state: str, count: int):
        """设置数据库连接数"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.database_connections.labels(state=state).set(count)
    
    def record_redis_operation(self, operation: str, status: str):
        """记录Redis操作指标"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.redis_operations_total.labels(
            operation=operation,
            status=status
        ).inc()
    
    def set_websocket_connections(self, count: int):
        """设置WebSocket连接数"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.websocket_connections.set(count)
    
    def record_websocket_message(self, direction: str, message_type: str):
        """记录WebSocket消息指标"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.websocket_messages_total.labels(
            direction=direction,
            type=message_type
        ).inc()
    
    def generate_metrics(self) -> str:
        """生成指标数据"""
        if not PROMETHEUS_AVAILABLE:
            return "# Prometheus client not available\n"
        
        return generate_latest(self.registry).decode('utf-8')


# 创建全局指标收集器
metrics = MetricsCollector()


async def metrics_handler(request: Request) -> Response:
    """指标处理器"""
    if not settings.METRICS_ENABLED:
        return Response(
            content="Metrics disabled",
            status_code=404
        )
    
    if not PROMETHEUS_AVAILABLE:
        return Response(
            content="Prometheus client not available",
            status_code=503
        )
    
    try:
        # 更新实时指标
        await _update_realtime_metrics()
        
        # 生成指标数据
        metrics_data = metrics.generate_metrics()
        
        return Response(
            content=metrics_data,
            media_type=CONTENT_TYPE_LATEST
        )
        
    except Exception as e:
        logger.error(f"Metrics handler error: {e}")
        return Response(
            content=f"Error generating metrics: {e}",
            status_code=500
        )


async def _update_realtime_metrics():
    """更新实时指标"""
    try:
        # 更新数据库连接指标
        from src.core.database import engine
        if engine and hasattr(engine, 'pool'):
            pool = engine.pool
            metrics.set_database_connections("checked_in", pool.checkedin())
            metrics.set_database_connections("checked_out", pool.checkedout())
            metrics.set_database_connections("overflow", pool.overflow())
        
        # 更新活跃会话数（这里需要实际的会话管理器）
        # metrics.set_active_sessions(session_manager.get_active_count())
        
        # 更新WebSocket连接数（这里需要实际的WebSocket管理器）
        # metrics.set_websocket_connections(websocket_manager.get_connection_count())
        
    except Exception as e:
        logger.warning(f"Failed to update realtime metrics: {e}")


class MetricsMiddleware:
    """指标中间件"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        
        # 包装send函数以捕获响应状态
        status_code = 500
        
        async def wrapped_send(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)
        
        try:
            await self.app(scope, receive, wrapped_send)
        finally:
            # 记录指标
            duration = time.time() - start_time
            method = scope["method"]
            path = scope["path"]
            
            # 简化路径（移除参数）
            endpoint = self._normalize_endpoint(path)
            
            metrics.record_http_request(method, endpoint, status_code, duration)
    
    def _normalize_endpoint(self, path: str) -> str:
        """标准化端点路径"""
        # 移除查询参数
        if "?" in path:
            path = path.split("?")[0]
        
        # 替换数字ID为占位符
        import re
        path = re.sub(r'/\d+', '/{id}', path)
        
        return path
