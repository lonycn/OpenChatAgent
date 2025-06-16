"""
🏥 健康检查工具

提供系统健康状态检查
"""

import asyncio
import time
from typing import Dict, Any

from loguru import logger

from src.config.settings import get_settings
from src.core.database import db_manager
from src.core.redis import get_redis_manager
from src.models.base import HealthResponse

settings = get_settings()


async def health_check() -> HealthResponse:
    """
    执行系统健康检查
    
    Returns:
        健康检查响应
    """
    start_time = time.time()
    services = {}
    overall_status = "healthy"
    
    try:
        # 检查数据库
        db_health = await _check_database()
        services["database"] = db_health
        if db_health["status"] != "healthy":
            overall_status = "unhealthy"
        
        # 检查Redis
        redis_health = await _check_redis()
        services["redis"] = redis_health
        if redis_health["status"] != "healthy":
            overall_status = "unhealthy"
        
        # 检查AI服务（可选）
        ai_health = await _check_ai_services()
        services["ai_services"] = ai_health
        if ai_health["status"] != "healthy":
            # AI服务不健康不影响整体状态，只是警告
            if overall_status == "healthy":
                overall_status = "degraded"
        
        # 检查系统资源
        system_health = await _check_system_resources()
        services["system"] = system_health
        if system_health["status"] != "healthy":
            overall_status = "unhealthy"
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        overall_status = "unhealthy"
        services["error"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # 计算总检查时间
    check_time = time.time() - start_time
    services["check_time_ms"] = round(check_time * 1000, 2)
    
    return HealthResponse.create(
        status=overall_status,
        version=settings.APP_VERSION,
        services=services
    )


async def _check_database() -> Dict[str, Any]:
    """检查数据库健康状态"""
    try:
        health_info = await db_manager.check_connection_health()
        return health_info
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def _check_redis() -> Dict[str, Any]:
    """检查Redis健康状态"""
    try:
        redis_manager = get_redis_manager()
        health_info = await redis_manager.health_check()
        return health_info
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def _check_ai_services() -> Dict[str, Any]:
    """检查AI服务健康状态"""
    try:
        # 这里可以添加AI服务的健康检查
        # 目前返回基本状态
        ai_status = {
            "status": "healthy",
            "dashscope": {
                "configured": bool(settings.DASHSCOPE_API_KEY),
                "status": "available" if settings.DASHSCOPE_API_KEY else "not_configured"
            },
            "openai": {
                "configured": bool(settings.OPENAI_API_KEY),
                "status": "available" if settings.OPENAI_API_KEY else "not_configured"
            }
        }
        
        # 如果没有配置任何AI服务，标记为不健康
        if not settings.DASHSCOPE_API_KEY and not settings.OPENAI_API_KEY:
            ai_status["status"] = "unhealthy"
            ai_status["error"] = "No AI services configured"
        
        return ai_status
        
    except Exception as e:
        logger.error(f"AI services health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def _check_system_resources() -> Dict[str, Any]:
    """检查系统资源"""
    try:
        import psutil
        
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # 内存使用率
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # 磁盘使用率
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        
        # 判断系统状态
        status = "healthy"
        warnings = []
        
        if cpu_percent > 80:
            status = "degraded"
            warnings.append(f"High CPU usage: {cpu_percent}%")
        
        if memory_percent > 80:
            status = "degraded"
            warnings.append(f"High memory usage: {memory_percent}%")
        
        if disk_percent > 80:
            status = "degraded"
            warnings.append(f"High disk usage: {disk_percent}%")
        
        if cpu_percent > 95 or memory_percent > 95 or disk_percent > 95:
            status = "unhealthy"
        
        return {
            "status": status,
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
            "disk_percent": disk_percent,
            "warnings": warnings
        }
        
    except ImportError:
        # psutil 未安装
        return {
            "status": "unknown",
            "error": "psutil not available"
        }
    except Exception as e:
        logger.error(f"System resources check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def quick_health_check() -> bool:
    """
    快速健康检查
    
    Returns:
        是否健康
    """
    try:
        # 并发检查关键服务
        tasks = [
            _quick_check_database(),
            _quick_check_redis(),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 检查是否有失败的检查
        for result in results:
            if isinstance(result, Exception) or not result:
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"Quick health check failed: {e}")
        return False


async def _quick_check_database() -> bool:
    """快速数据库检查"""
    try:
        health_info = await db_manager.check_connection_health()
        return health_info.get("status") == "healthy"
    except Exception:
        return False


async def _quick_check_redis() -> bool:
    """快速Redis检查"""
    try:
        redis_manager = get_redis_manager()
        health_info = await redis_manager.health_check()
        return health_info.get("status") == "healthy"
    except Exception:
        return False
