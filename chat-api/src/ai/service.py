"""
🤖 AI 服务

提供统一的AI服务接口
"""

import asyncio
from typing import Dict, List, Optional, Any, AsyncGenerator

from loguru import logger

from src.config.settings import get_settings
from src.core.exceptions import AIServiceException
from src.ai.client import get_dashscope_client, get_openai_client

settings = get_settings()


class AIService:
    """AI服务类"""
    
    def __init__(self):
        self.default_provider = "dashscope"  # 默认使用DashScope
        self.retry_attempts = settings.AI_RETRY_ATTEMPTS
        self.retry_delay = settings.AI_RETRY_DELAY
    
    async def send_message(
        self,
        messages: List[Dict[str, str]],
        provider: str = None,
        **kwargs
    ) -> str:
        """
        发送消息到AI服务
        
        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}]
            provider: AI服务提供商 (dashscope/openai)
            **kwargs: 其他参数
            
        Returns:
            AI回复内容
        """
        provider = provider or self.default_provider
        
        for attempt in range(self.retry_attempts):
            try:
                if provider == "dashscope":
                    client = await get_dashscope_client()
                    if not client:
                        raise AIServiceException("DashScope client not available")
                    
                    return await client.send_message(messages, **kwargs)
                
                elif provider == "openai":
                    client = await get_openai_client()
                    if not client:
                        raise AIServiceException("OpenAI client not available")
                    
                    return await client.send_message(messages, **kwargs)
                
                else:
                    raise AIServiceException(f"Unknown AI provider: {provider}")
            
            except AIServiceException as e:
                if attempt == self.retry_attempts - 1:
                    # 最后一次尝试失败，尝试备用提供商
                    if provider == "dashscope":
                        logger.warning(f"DashScope failed, trying OpenAI: {e}")
                        try:
                            return await self.send_message(messages, "openai", **kwargs)
                        except Exception:
                            pass
                    elif provider == "openai":
                        logger.warning(f"OpenAI failed, trying DashScope: {e}")
                        try:
                            return await self.send_message(messages, "dashscope", **kwargs)
                        except Exception:
                            pass
                    
                    raise e
                
                logger.warning(f"AI request attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(self.retry_delay * (attempt + 1))
        
        raise AIServiceException("All AI service attempts failed")
    
    async def stream_message(
        self,
        messages: List[Dict[str, str]],
        provider: str = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        流式发送消息到AI服务
        
        Args:
            messages: 消息列表
            provider: AI服务提供商
            **kwargs: 其他参数
            
        Yields:
            AI回复内容片段
        """
        provider = provider or self.default_provider
        
        try:
            if provider == "dashscope":
                client = await get_dashscope_client()
                if not client:
                    raise AIServiceException("DashScope client not available")
                
                async for chunk in client.stream_message(messages, **kwargs):
                    yield chunk
            
            elif provider == "openai":
                client = await get_openai_client()
                if not client:
                    raise AIServiceException("OpenAI client not available")
                
                async for chunk in client.stream_message(messages, **kwargs):
                    yield chunk
            
            else:
                raise AIServiceException(f"Unknown AI provider: {provider}")
        
        except AIServiceException as e:
            # 流式请求失败时尝试备用提供商
            if provider == "dashscope":
                logger.warning(f"DashScope stream failed, trying OpenAI: {e}")
                try:
                    async for chunk in self.stream_message(messages, "openai", **kwargs):
                        yield chunk
                    return
                except Exception:
                    pass
            elif provider == "openai":
                logger.warning(f"OpenAI stream failed, trying DashScope: {e}")
                try:
                    async for chunk in self.stream_message(messages, "dashscope", **kwargs):
                        yield chunk
                    return
                except Exception:
                    pass
            
            raise e
    
    async def chat_completion(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]] = None,
        system_prompt: str = None,
        **kwargs
    ) -> str:
        """
        聊天补全
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            system_prompt: 系统提示词
            **kwargs: 其他参数
            
        Returns:
            AI回复
        """
        messages = []
        
        # 添加系统提示词
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # 添加对话历史
        if conversation_history:
            messages.extend(conversation_history)
        
        # 添加当前用户消息
        messages.append({"role": "user", "content": user_message})
        
        return await self.send_message(messages, **kwargs)
    
    async def stream_chat_completion(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]] = None,
        system_prompt: str = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        流式聊天补全
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            system_prompt: 系统提示词
            **kwargs: 其他参数
            
        Yields:
            AI回复片段
        """
        messages = []
        
        # 添加系统提示词
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # 添加对话历史
        if conversation_history:
            messages.extend(conversation_history)
        
        # 添加当前用户消息
        messages.append({"role": "user", "content": user_message})
        
        async for chunk in self.stream_message(messages, **kwargs):
            yield chunk
    
    def build_conversation_context(
        self,
        messages: List[Dict[str, Any]],
        max_context_length: int = 4000
    ) -> List[Dict[str, str]]:
        """
        构建对话上下文
        
        Args:
            messages: 消息列表
            max_context_length: 最大上下文长度
            
        Returns:
            格式化的对话上下文
        """
        context = []
        total_length = 0
        
        # 从最新消息开始，向前构建上下文
        for message in reversed(messages):
            content = message.get("content", "")
            sender_type = message.get("sender_type", "")
            
            # 转换发送者类型到AI格式
            if sender_type == "contact":
                role = "user"
            elif sender_type in ["agent", "ai"]:
                role = "assistant"
            else:
                continue  # 跳过系统消息等
            
            message_length = len(content)
            if total_length + message_length > max_context_length:
                break
            
            context.insert(0, {"role": role, "content": content})
            total_length += message_length
        
        return context
    
    def get_default_system_prompt(self, language: str = "zh-CN") -> str:
        """
        获取默认系统提示词
        
        Args:
            language: 语言代码
            
        Returns:
            系统提示词
        """
        prompts = {
            "zh-CN": """你是一个专业的客服助手，请遵循以下原则：
1. 友好、耐心、专业地回答用户问题
2. 如果不确定答案，请诚实说明并建议联系人工客服
3. 保持回答简洁明了，避免过于冗长
4. 优先解决用户的实际问题
5. 如果用户要求转人工客服，请及时响应""",
            
            "en-US": """You are a professional customer service assistant. Please follow these principles:
1. Answer user questions in a friendly, patient, and professional manner
2. If you're unsure about an answer, be honest and suggest contacting human support
3. Keep responses concise and clear, avoiding overly lengthy explanations
4. Prioritize solving users' actual problems
5. If users request human support, respond promptly""",
        }
        
        return prompts.get(language, prompts["zh-CN"])
    
    async def check_service_availability(self) -> Dict[str, bool]:
        """
        检查AI服务可用性
        
        Returns:
            各服务提供商的可用性状态
        """
        availability = {}
        
        # 检查DashScope
        try:
            client = await get_dashscope_client()
            if client:
                # 发送测试消息
                test_messages = [{"role": "user", "content": "Hello"}]
                await client.send_message(test_messages)
                availability["dashscope"] = True
            else:
                availability["dashscope"] = False
        except Exception as e:
            logger.warning(f"DashScope availability check failed: {e}")
            availability["dashscope"] = False
        
        # 检查OpenAI
        try:
            client = await get_openai_client()
            if client:
                # 发送测试消息
                test_messages = [{"role": "user", "content": "Hello"}]
                await client.send_message(test_messages)
                availability["openai"] = True
            else:
                availability["openai"] = False
        except Exception as e:
            logger.warning(f"OpenAI availability check failed: {e}")
            availability["openai"] = False
        
        return availability


# 全局AI服务实例
ai_service = AIService()
