#!/usr/bin/env python3
"""
🧪 AI服务测试脚本

测试AI服务是否正常工作
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.append(str(Path(__file__).parent / "chat-api"))

from loguru import logger
from src.ai.service import ai_service
from src.config.settings import get_settings

settings = get_settings()


async def test_ai_service():
    """测试AI服务"""
    logger.info("🧪 Testing AI Service...")
    
    # 测试基本聊天
    try:
        logger.info("📝 Testing basic chat completion...")
        response = await ai_service.chat_completion(
            user_message="你好，请简单介绍一下你自己",
            system_prompt="你是一个友好的AI助手"
        )
        
        if response:
            logger.success(f"✅ AI Response: {response[:100]}...")
            return True
        else:
            logger.error("❌ No response from AI service")
            return False
            
    except Exception as e:
        logger.error(f"❌ AI service error: {e}")
        return False


async def test_ai_streaming():
    """测试AI流式响应"""
    logger.info("🌊 Testing AI streaming...")
    
    try:
        full_response = ""
        chunk_count = 0
        
        async for chunk in ai_service.stream_chat_completion(
            user_message="请用一句话介绍Python编程语言",
            system_prompt="你是一个编程助手"
        ):
            full_response += chunk
            chunk_count += 1
            logger.info(f"📦 Chunk {chunk_count}: {chunk}")
        
        if full_response:
            logger.success(f"✅ Streaming completed: {chunk_count} chunks, {len(full_response)} chars")
            logger.info(f"Full response: {full_response}")
            return True
        else:
            logger.error("❌ No streaming response received")
            return False
            
    except Exception as e:
        logger.error(f"❌ AI streaming error: {e}")
        return False


async def test_ai_availability():
    """测试AI服务可用性"""
    logger.info("🔍 Testing AI service availability...")
    
    try:
        availability = await ai_service.check_service_availability()
        logger.info(f"📊 Service availability: {availability}")
        
        if any(availability.values()):
            logger.success("✅ At least one AI service is available")
            return True
        else:
            logger.error("❌ No AI services are available")
            return False
            
    except Exception as e:
        logger.error(f"❌ Availability check error: {e}")
        return False


async def main():
    """主函数"""
    logger.info("🚀 AI Service Test Suite")
    logger.info("="*50)
    
    # 显示配置信息
    logger.info(f"DashScope API Key: {'✅ Set' if settings.DASHSCOPE_API_KEY else '❌ Not set'}")
    logger.info(f"OpenAI API Key: {'✅ Set' if settings.OPENAI_API_KEY else '❌ Not set'}")
    logger.info(f"DashScope Model: {settings.DASHSCOPE_MODEL}")
    logger.info(f"OpenAI Model: {settings.OPENAI_MODEL}")
    logger.info("")
    
    tests = [
        ("AI Service Availability", test_ai_availability()),
        ("Basic Chat Completion", test_ai_service()),
        ("Streaming Chat", test_ai_streaming()),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_coro in tests:
        logger.info(f"\n{'='*50}")
        logger.info(f"Running: {test_name}")
        logger.info(f"{'='*50}")
        
        try:
            result = await test_coro
            if result:
                passed += 1
                logger.success(f"✅ {test_name} PASSED")
            else:
                logger.error(f"❌ {test_name} FAILED")
        except Exception as e:
            logger.error(f"❌ {test_name} ERROR: {e}")
    
    logger.info(f"\n{'='*50}")
    logger.info(f"📊 Test Results: {passed}/{total} passed")
    logger.info(f"{'='*50}")
    
    if passed == total:
        logger.success("🎉 All AI service tests passed!")
        return True
    else:
        logger.error("💥 Some AI service tests failed!")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
