#!/usr/bin/env python3
"""
🗄️ 数据库初始化脚本

创建数据库表和初始数据
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from src.config.settings import get_settings
from src.core.database import Base
from src.models import *  # 导入所有模型


async def create_tables():
    """创建数据库表"""
    settings = get_settings()
    
    logger.info("🔄 Creating database tables...")
    
    # 创建异步引擎
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=True,  # 显示SQL语句
    )
    
    try:
        # 创建所有表
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("✅ Database tables created successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        raise
    finally:
        await engine.dispose()


async def create_initial_data():
    """创建初始数据"""
    from src.core.database import engine
    from src.models.user import User, UserRole, UserStatus
    from passlib.context import CryptContext
    from sqlalchemy import text
    import uuid
    from datetime import datetime
    
    logger.info("🔄 Creating initial data...")
    
    # 获取设置并创建引擎
    settings = get_settings()

    # 创建引擎
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_recycle=3600,
    )
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    try:
        # 直接使用引擎执行SQL
        async with engine.begin() as conn:
            # 检查是否已有管理员用户
            result = await conn.execute(text("SELECT COUNT(*) FROM users WHERE email = 'admin@chatapi.com'"))
            count = result.scalar()

            if count > 0:
                logger.info("ℹ️ Admin user already exists")
                return

            # 创建管理员用户
            admin_uuid = str(uuid.uuid4())
            admin_password = pwd_context.hash("admin123456")
            now = datetime.now()

            await conn.execute(text("""
                INSERT INTO users (uuid, email, password_hash, full_name, role, status, timezone, language, created_at, updated_at)
                VALUES (:uuid, :email, :password_hash, :full_name, :role, :status, :timezone, :language, :created_at, :updated_at)
            """), {
                "uuid": admin_uuid,
                "email": "admin@chatapi.com",
                "password_hash": admin_password,
                "full_name": "系统管理员",
                "role": "admin",
                "status": "active",
                "timezone": "Asia/Shanghai",
                "language": "zh-CN",
                "created_at": now,
                "updated_at": now
            })

            # 创建测试客服用户
            agent_uuid = str(uuid.uuid4())
            agent_password = pwd_context.hash("agent123456")

            await conn.execute(text("""
                INSERT INTO users (uuid, email, password_hash, full_name, role, status, timezone, language, created_at, updated_at)
                VALUES (:uuid, :email, :password_hash, :full_name, :role, :status, :timezone, :language, :created_at, :updated_at)
            """), {
                "uuid": agent_uuid,
                "email": "agent@chatapi.com",
                "password_hash": agent_password,
                "full_name": "测试客服",
                "role": "agent",
                "status": "active",
                "timezone": "Asia/Shanghai",
                "language": "zh-CN",
                "created_at": now,
                "updated_at": now
            })

            logger.info("✅ Admin user created: admin@chatapi.com")
            logger.info("✅ Agent user created: agent@chatapi.com")
            
    except Exception as e:
        logger.error(f"❌ Failed to create initial data: {e}")
        raise


async def main():
    """主函数"""
    logger.info("🚀 Starting database initialization...")
    
    try:
        # 创建表
        await create_tables()
        
        # 创建初始数据
        await create_initial_data()
        
        logger.info("🎉 Database initialization completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
