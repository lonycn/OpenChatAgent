"""
💾 Chat API 数据库核心模块

提供数据库连接、会话管理和基础操作
支持异步操作和连接池管理
"""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from loguru import logger
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool

from src.config.settings import get_settings

# 获取配置
settings = get_settings()

# 全局变量
engine: Optional[AsyncEngine] = None
async_session_maker: Optional[async_sessionmaker[AsyncSession]] = None


class Base(DeclarativeBase):
    """数据库模型基类"""
    pass


async def init_database() -> None:
    """
    初始化数据库连接
    创建异步引擎和会话工厂
    """
    global engine, async_session_maker
    
    try:
        logger.info("🔄 Initializing database connection...")
        
        # 创建异步引擎
        engine = create_async_engine(
            settings.DATABASE_URL,
            # 连接池配置
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            pool_timeout=settings.DATABASE_POOL_TIMEOUT,
            pool_recycle=settings.DATABASE_POOL_RECYCLE,
            pool_pre_ping=True,  # 连接前检查
            # 性能配置
            echo=settings.DEBUG,  # 开发环境显示 SQL
            echo_pool=settings.DEBUG,  # 开发环境显示连接池信息
            # 其他配置
            future=True,
            connect_args={
                "charset": "utf8mb4",
                "autocommit": False,
            }
        )
        
        # 创建会话工厂
        async_session_maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=True,
            autocommit=False,
        )
        
        # 设置事件监听器
        _setup_event_listeners(engine)
        
        # 测试连接
        await _test_connection()
        
        logger.info("✅ Database connection initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise


async def close_database() -> None:
    """
    关闭数据库连接
    清理资源
    """
    global engine, async_session_maker
    
    try:
        if engine:
            logger.info("🔄 Closing database connection...")
            await engine.dispose()
            engine = None
            async_session_maker = None
            logger.info("✅ Database connection closed")
    except Exception as e:
        logger.error(f"❌ Error closing database: {e}")


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    获取数据库会话（上下文管理器）
    自动处理事务和异常，确保会话正确关闭
    """
    if not async_session_maker:
        raise RuntimeError("Database not initialized. Call init_database() first.")

    session = None
    try:
        # 创建新的会话实例
        session = async_session_maker()

        # 确保会话处于活动状态
        if not session.is_active:
            logger.warning("Session is not active, creating new session")
            await session.close()
            session = async_session_maker()

        yield session

        # 只有在会话仍然活动时才提交
        if session.is_active:
            await session.commit()

    except Exception as e:
        # 只有在会话仍然活动时才回滚
        if session and session.is_active:
            try:
                await session.rollback()
            except Exception as rollback_error:
                logger.error(f"❌ Error during rollback: {rollback_error}")

        logger.error(f"❌ Database session error: {e}")
        raise

    finally:
        # 确保会话被正确关闭
        if session:
            try:
                if session.is_active:
                    await session.close()
            except Exception as close_error:
                logger.error(f"❌ Error closing session: {close_error}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    获取数据库会话（依赖注入）
    用于 FastAPI 依赖注入
    """
    async with get_db_session() as session:
        yield session


def _setup_event_listeners(engine: AsyncEngine) -> None:
    """
    设置数据库事件监听器
    用于监控和日志记录
    """
    
    @event.listens_for(engine.sync_engine, "connect")
    def set_mysql_params(dbapi_connection, connection_record):
        """设置数据库连接参数"""
        if "mysql" in str(engine.url):
            # MySQL 连接参数
            try:
                cursor = dbapi_connection.cursor()
                cursor.execute("SET SESSION sql_mode = 'STRICT_TRANS_TABLES'")
                cursor.execute("SET SESSION time_zone = '+08:00'")
                cursor.close()
            except Exception as e:
                logger.warning(f"Failed to set MySQL parameters: {e}")
    
    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """SQL 执行前事件"""
        if settings.DEBUG:
            logger.debug(f"🔍 Executing SQL: {statement}")
            if parameters:
                logger.debug(f"📋 Parameters: {parameters}")
    
    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """SQL 执行后事件"""
        if settings.DEBUG:
            logger.debug(f"✅ SQL executed successfully")


async def _test_connection() -> None:
    """
    测试数据库连接
    确保连接正常工作
    """
    try:
        async with get_db_session() as session:
            result = await session.execute(text("SELECT 1"))
            value = result.scalar()
            if value == 1:
                logger.info("✅ Database connection test passed")
            else:
                raise Exception("Database connection test failed")
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {e}")
        raise


class DatabaseManager:
    """
    数据库管理器
    提供高级数据库操作方法
    """
    
    def __init__(self):
        self.engine = engine
        self.session_maker = async_session_maker
    
    async def execute_raw_sql(self, sql: str, parameters: dict = None) -> any:
        """
        执行原生 SQL
        """
        async with get_db_session() as session:
            result = await session.execute(text(sql), parameters or {})
            return result
    
    async def get_table_info(self, table_name: str) -> dict:
        """
        获取表信息
        """
        sql = """
        SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = :table_name
        ORDER BY ORDINAL_POSITION
        """
        
        async with get_db_session() as session:
            result = await session.execute(text(sql), {"table_name": table_name})
            columns = result.fetchall()
            
        return {
            "table_name": table_name,
            "columns": [
                {
                    "name": col[0],
                    "type": col[1],
                    "nullable": col[2] == "YES",
                    "default": col[3],
                    "comment": col[4],
                }
                for col in columns
            ]
        }
    
    async def get_database_stats(self) -> dict:
        """
        获取数据库统计信息
        """
        stats_sql = """
        SELECT 
            TABLE_NAME,
            TABLE_ROWS,
            DATA_LENGTH,
            INDEX_LENGTH,
            CREATE_TIME,
            UPDATE_TIME
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME
        """
        
        async with get_db_session() as session:
            result = await session.execute(text(stats_sql))
            tables = result.fetchall()
            
        return {
            "database": engine.url.database,
            "tables": [
                {
                    "name": table[0],
                    "rows": table[1] or 0,
                    "data_size": table[2] or 0,
                    "index_size": table[3] or 0,
                    "created": table[4],
                    "updated": table[5],
                }
                for table in tables
            ],
            "total_tables": len(tables),
            "total_size": sum((table[2] or 0) + (table[3] or 0) for table in tables),
        }
    
    async def check_connection_health(self) -> dict:
        """
        检查数据库连接健康状态
        """
        try:
            start_time = asyncio.get_event_loop().time()
            
            async with get_db_session() as session:
                # 执行简单查询
                await session.execute(text("SELECT 1"))

                # 检查连接池状态
                pool = engine.pool
                pool_status = {
                    "size": pool.size(),
                    "checked_in": pool.checkedin(),
                    "checked_out": pool.checkedout(),
                    "overflow": pool.overflow(),
                    # "invalid": pool.invalid(),  # 某些连接池没有这个方法
                }
            
            response_time = (asyncio.get_event_loop().time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "response_time_ms": round(response_time, 2),
                "pool_status": pool_status,
                "database": engine.url.database,
                "driver": engine.url.drivername,
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "database": engine.url.database if engine else "unknown",
            }


# 创建数据库管理器实例
db_manager = DatabaseManager()


# 导出常用函数和类
__all__ = [
    "Base",
    "init_database",
    "close_database",
    "get_db_session",
    "get_db",
    "DatabaseManager",
    "db_manager",
    "engine",
    "async_session_maker",
]
