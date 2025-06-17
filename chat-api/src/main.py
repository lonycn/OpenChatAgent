#!/usr/bin/env python3
"""
🚀 Chat API - 统一聊天服务平台

主应用程序入口文件
整合了原有的多个 Node.js 微服务（chat-core、ai-service、chat-session、chat-admin）
"""

import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger

# 添加项目根目录到 Python 路径
sys.path.append(str(Path(__file__).parent.parent))

from src.config.settings import get_settings
from src.core.database import init_database, close_database
from src.core.redis import init_redis, close_redis
from src.core.exceptions import setup_exception_handlers
from src.middleware.auth import AuthMiddleware
from src.middleware.logging import LoggingMiddleware
from src.middleware.rate_limit import RateLimitMiddleware
from src.middleware.security import SecurityMiddleware
from src.api.router import api_router
from src.websocket.router import websocket_router
from src.utils.health import health_check


# 获取配置
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用程序生命周期管理
    启动时初始化资源，关闭时清理资源
    """
    logger.info("🚀 Starting Chat API application...")
    
    try:
        # 初始化数据库连接
        await init_database()
        logger.info("✅ Database connection initialized")
        
        # 初始化 Redis 连接
        await init_redis()
        logger.info("✅ Redis connection initialized")
        
        # 其他初始化任务
        await _initialize_services()
        
        logger.info("🎉 Chat API application started successfully!")
        
        yield  # 应用程序运行期间
        
    except Exception as e:
        logger.error(f"❌ Failed to start application: {e}")
        raise
    finally:
        # 清理资源
        logger.info("🔄 Shutting down Chat API application...")
        
        await close_redis()
        logger.info("✅ Redis connection closed")
        
        await close_database()
        logger.info("✅ Database connection closed")
        
        logger.info("👋 Chat API application shutdown complete")


async def _initialize_services():
    """初始化各种服务"""
    try:
        # 初始化 AI 服务
        from src.ai.client import init_ai_clients
        await init_ai_clients()
        logger.info("✅ AI services initialized")

        # 初始化会话管理器
        from src.session.manager import init_session_manager
        init_session_manager()
        logger.info("✅ Session manager initialized")

        # 初始化 WebSocket 管理器
        from src.websocket.manager import init_websocket_manager
        await init_websocket_manager()
        logger.info("✅ WebSocket manager initialized")

    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise


def create_app() -> FastAPI:
    """
    创建 FastAPI 应用程序实例
    """
    app = FastAPI(
        title=settings.APP_NAME,
        description="统一聊天服务平台 - 整合 AI 服务、会话管理、WebSocket 通信和管理后台",
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
    )
    
    # 配置中间件
    _setup_middleware(app)
    
    # 配置路由
    _setup_routes(app)
    
    # 配置异常处理
    setup_exception_handlers(app)
    
    # 配置静态文件
    _setup_static_files(app)
    
    return app


def _setup_middleware(app: FastAPI):
    """配置中间件"""
    
    # CORS 中间件
    if settings.CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=settings.CORS_CREDENTIALS,
            allow_methods=settings.CORS_METHODS,
            allow_headers=settings.CORS_HEADERS,
        )
    
    # Gzip 压缩中间件
    if settings.GZIP_COMPRESSION:
        app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # 安全中间件
    app.add_middleware(SecurityMiddleware)
    
    # 限流中间件
    if settings.RATE_LIMIT_ENABLED:
        app.add_middleware(RateLimitMiddleware)
    
    # 认证中间件
    app.add_middleware(AuthMiddleware)
    
    # 日志中间件
    app.add_middleware(LoggingMiddleware)


def _setup_routes(app: FastAPI):
    """配置路由"""
    
    # 健康检查端点
    @app.get("/health")
    async def health():
        """健康检查端点"""
        return await health_check()
    
    # 根路径
    @app.get("/")
    async def root():
        """根路径"""
        return {
            "message": "Welcome to Chat API",
            "version": settings.APP_VERSION,
            "docs": "/docs" if settings.DEBUG else "Documentation not available in production",
            "health": "/health"
        }
    
    # API 路由
    app.include_router(api_router, prefix="/api/v1")
    
    # WebSocket 路由
    app.include_router(websocket_router)
    
    # 指标端点（如果启用监控）
    if settings.METRICS_ENABLED:
        from src.utils.metrics import metrics_handler
        app.add_route("/metrics", metrics_handler)


def _setup_static_files(app: FastAPI):
    """配置静态文件服务"""
    try:
        # 静态文件目录
        static_dir = Path("static")
        if static_dir.exists():
            app.mount("/static", StaticFiles(directory=static_dir), name="static")
        
        # 上传文件目录
        upload_dir = Path(settings.UPLOAD_DIR)
        if upload_dir.exists():
            app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
            
    except Exception as e:
        logger.warning(f"⚠️ Failed to setup static files: {e}")


# 创建应用程序实例
app = create_app()


def main():
    """
    主函数 - 用于直接运行应用程序
    """
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"🌍 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🐛 Debug mode: {settings.DEBUG}")
    
    # 配置 uvicorn
    uvicorn_config = {
        "app": "src.main:app",
        "host": settings.HOST,
        "port": settings.PORT,
        "log_level": settings.LOG_LEVEL.lower(),
        "access_log": True,
        "use_colors": True,
    }
    
    # 开发环境配置
    if settings.DEBUG:
        uvicorn_config.update({
            "reload": True,
            "reload_dirs": ["src"],
            "reload_includes": ["*.py"],
        })
    
    # 生产环境配置
    else:
        uvicorn_config.update({
            "workers": settings.WORKERS,
            "loop": "uvloop",
            "http": "httptools",
        })
    
    # 启动服务器
    uvicorn.run(**uvicorn_config)


if __name__ == "__main__":
    main()
