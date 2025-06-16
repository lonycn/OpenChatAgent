#!/usr/bin/env python3
"""
🔄 数据库迁移脚本

执行数据库表创建和数据迁移
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine
from loguru import logger

from src.config.settings import get_settings
from src.core.database import Base
from src.models import *  # 导入所有模型


async def create_tables():
    """创建数据库表"""
    settings = get_settings()
    
    logger.info("🔄 开始创建数据库表...")
    
    # 创建异步引擎
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        future=True
    )
    
    try:
        # 创建所有表
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("✅ 数据库表创建成功")
        
    except Exception as e:
        logger.error(f"❌ 数据库表创建失败: {e}")
        raise
    
    finally:
        await engine.dispose()


async def main():
    """主函数"""
    try:
        await create_tables()
        logger.info("🎉 数据库迁移完成")
        
    except Exception as e:
        logger.error(f"❌ 数据库迁移失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
