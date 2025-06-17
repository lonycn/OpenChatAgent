"""
🤖 AI 客户端

封装各种AI服务提供商的API调用
"""

import asyncio
import time
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, AsyncGenerator

import httpx
from loguru import logger

from src.config.settings import get_settings
from src.core.exceptions import AIServiceException
from src.utils.metrics import metrics

settings = get_settings()


class AIClient(ABC):
    """AI客户端抽象基类"""
    
    def __init__(self, api_key: str, base_url: str = None):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=settings.AI_TIMEOUT)
    
    @abstractmethod
    async def send_message(
        self, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> str:
        """发送消息并获取回复"""
        pass
    
    @abstractmethod
    async def stream_message(
        self, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """流式发送消息"""
        pass
    
    async def close(self):
        """关闭客户端"""
        await self.client.aclose()


class DashScopeClient(AIClient):
    """阿里百炼 DashScope 客户端"""
    
    def __init__(self, api_key: str = None):
        super().__init__(
            api_key=api_key or settings.DASHSCOPE_API_KEY,
            base_url=settings.DASHSCOPE_BASE_URL
        )
        self.model = settings.DASHSCOPE_MODEL
        self.max_tokens = settings.DASHSCOPE_MAX_TOKENS
        self.temperature = settings.DASHSCOPE_TEMPERATURE
    
    async def send_message(
        self, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> str:
        """发送消息到DashScope"""
        start_time = time.time()
        
        try:
            # 构建请求数据
            data = {
                "model": kwargs.get("model", self.model),
                "input": {
                    "messages": messages
                },
                "parameters": {
                    "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                    "temperature": kwargs.get("temperature", self.temperature),
                    "result_format": "message"
                }
            }
            
            # 发送请求
            response = await self.client.post(
                f"{self.base_url}/api/v1/services/aigc/text-generation/generation",
                json=data,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            # 检查响应
            if result.get("code"):
                raise AIServiceException(f"DashScope API error: {result.get('message', 'Unknown error')}")
            
            # 提取回复内容
            output = result.get("output", {})
            choices = output.get("choices", [])
            
            if not choices:
                raise AIServiceException("No response from DashScope")
            
            content = choices[0].get("message", {}).get("content", "")
            
            # 记录指标
            duration = time.time() - start_time
            metrics.record_ai_request("dashscope", "success", duration)
            
            logger.info(f"DashScope response received in {duration:.2f}s")
            return content
            
        except httpx.HTTPStatusError as e:
            duration = time.time() - start_time
            metrics.record_ai_request("dashscope", "http_error", duration)
            logger.error(f"DashScope HTTP error: {e.response.status_code} - {e.response.text}")
            raise AIServiceException(f"DashScope HTTP error: {e.response.status_code}")
        
        except Exception as e:
            duration = time.time() - start_time
            metrics.record_ai_request("dashscope", "error", duration)
            logger.error(f"DashScope error: {e}")
            raise AIServiceException(f"DashScope error: {str(e)}")
    
    async def stream_message(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """流式发送消息到DashScope"""
        start_time = time.time()

        try:
            # 构建请求数据
            data = {
                "model": kwargs.get("model", self.model),
                "input": {
                    "messages": messages
                },
                "parameters": {
                    "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                    "temperature": kwargs.get("temperature", self.temperature),
                    "result_format": "message",
                    "incremental_output": True
                }
            }

            # 发送流式请求
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/v1/services/aigc/text-generation/generation",
                json=data,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                    "X-DashScope-SSE": "enable"
                }
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    line = line.strip()

                    if line.startswith("data:"):
                        data_content = line[5:].strip()  # 移除 "data:" 前缀

                        if data_content == "[DONE]":
                            break

                        if not data_content:
                            continue

                        try:
                            import json
                            chunk_data = json.loads(data_content)

                            output = chunk_data.get("output", {})
                            choices = output.get("choices", [])

                            if choices:
                                choice = choices[0]
                                message = choice.get("message", {})
                                content = message.get("content", "")

                                if content:
                                    yield content

                        except json.JSONDecodeError as e:
                            logger.warning(f"Failed to parse DashScope chunk: {data_content}, error: {e}")
                            continue

            # 记录指标
            duration = time.time() - start_time
            metrics.record_ai_request("dashscope", "stream_success", duration)
            logger.info(f"DashScope stream completed in {duration:.2f}s")

        except Exception as e:
            duration = time.time() - start_time
            metrics.record_ai_request("dashscope", "stream_error", duration)
            logger.error(f"DashScope stream error: {e}")
            raise AIServiceException(f"DashScope stream error: {str(e)}")


class OpenAIClient(AIClient):
    """OpenAI 客户端"""
    
    def __init__(self, api_key: str = None):
        super().__init__(
            api_key=api_key or settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = settings.OPENAI_TEMPERATURE
    
    async def send_message(
        self, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> str:
        """发送消息到OpenAI"""
        start_time = time.time()
        
        try:
            # 构建请求数据
            data = {
                "model": kwargs.get("model", self.model),
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                "temperature": kwargs.get("temperature", self.temperature)
            }
            
            # 发送请求
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=data,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            # 提取回复内容
            choices = result.get("choices", [])
            if not choices:
                raise AIServiceException("No response from OpenAI")
            
            content = choices[0].get("message", {}).get("content", "")
            
            # 记录指标
            duration = time.time() - start_time
            metrics.record_ai_request("openai", "success", duration)
            
            logger.info(f"OpenAI response received in {duration:.2f}s")
            return content
            
        except httpx.HTTPStatusError as e:
            duration = time.time() - start_time
            metrics.record_ai_request("openai", "http_error", duration)
            logger.error(f"OpenAI HTTP error: {e.response.status_code} - {e.response.text}")
            raise AIServiceException(f"OpenAI HTTP error: {e.response.status_code}")
        
        except Exception as e:
            duration = time.time() - start_time
            metrics.record_ai_request("openai", "error", duration)
            logger.error(f"OpenAI error: {e}")
            raise AIServiceException(f"OpenAI error: {str(e)}")
    
    async def stream_message(
        self, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """流式发送消息到OpenAI"""
        start_time = time.time()
        
        try:
            # 构建请求数据
            data = {
                "model": kwargs.get("model", self.model),
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                "temperature": kwargs.get("temperature", self.temperature),
                "stream": True
            }
            
            # 发送流式请求
            async with self.client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json=data,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        chunk_data = line[6:]  # 移除 "data: " 前缀
                        
                        if chunk_data.strip() == "[DONE]":
                            break
                        
                        try:
                            import json
                            chunk = json.loads(chunk_data)
                            
                            choices = chunk.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                        
                        except json.JSONDecodeError:
                            continue
            
            # 记录指标
            duration = time.time() - start_time
            metrics.record_ai_request("openai", "stream_success", duration)
            
        except Exception as e:
            duration = time.time() - start_time
            metrics.record_ai_request("openai", "stream_error", duration)
            logger.error(f"OpenAI stream error: {e}")
            raise AIServiceException(f"OpenAI stream error: {str(e)}")


# 全局AI客户端实例
_dashscope_client: Optional[DashScopeClient] = None
_openai_client: Optional[OpenAIClient] = None


async def get_dashscope_client() -> Optional[DashScopeClient]:
    """获取DashScope客户端"""
    global _dashscope_client
    
    if not settings.DASHSCOPE_API_KEY:
        return None
    
    if not _dashscope_client:
        _dashscope_client = DashScopeClient()
    
    return _dashscope_client


async def get_openai_client() -> Optional[OpenAIClient]:
    """获取OpenAI客户端"""
    global _openai_client
    
    if not settings.OPENAI_API_KEY:
        return None
    
    if not _openai_client:
        _openai_client = OpenAIClient()
    
    return _openai_client


async def init_ai_clients():
    """初始化AI客户端"""
    global _dashscope_client, _openai_client
    
    # 初始化DashScope客户端
    if settings.DASHSCOPE_API_KEY:
        _dashscope_client = DashScopeClient()
        logger.info("✅ DashScope client initialized")
    
    # 初始化OpenAI客户端
    if settings.OPENAI_API_KEY:
        _openai_client = OpenAIClient()
        logger.info("✅ OpenAI client initialized")
    
    if not _dashscope_client and not _openai_client:
        logger.warning("⚠️ No AI clients configured")


async def close_ai_clients():
    """关闭AI客户端"""
    global _dashscope_client, _openai_client
    
    if _dashscope_client:
        await _dashscope_client.close()
        _dashscope_client = None
    
    if _openai_client:
        await _openai_client.close()
        _openai_client = None
    
    logger.info("✅ AI clients closed")
