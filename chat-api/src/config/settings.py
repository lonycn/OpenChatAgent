"""
⚙️ Chat API 配置管理

统一管理应用程序的所有配置项
支持环境变量、配置文件和默认值
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用程序配置类"""
    
    # ==========================================
    # 🏷️ 应用程序基础配置
    # ==========================================
    APP_NAME: str = Field(default="Chat API", description="应用程序名称")
    APP_VERSION: str = Field(default="1.0.0", description="应用程序版本")
    APP_DESCRIPTION: str = Field(default="Unified Chat API Service", description="应用程序描述")
    DEBUG: bool = Field(default=False, description="调试模式")
    ENVIRONMENT: str = Field(default="production", description="运行环境")
    
    # ==========================================
    # 🌐 服务器配置
    # ==========================================
    HOST: str = Field(default="0.0.0.0", description="服务器主机")
    PORT: int = Field(default=8000, description="服务器端口")
    WORKERS: int = Field(default=1, description="工作进程数")
    RELOAD: bool = Field(default=False, description="自动重载")
    
    # ==========================================
    # 🔐 安全配置
    # ==========================================
    SECRET_KEY: str = Field(..., description="应用程序密钥")
    JWT_SECRET_KEY: str = Field(..., description="JWT 密钥")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT 算法")
    JWT_EXPIRE_MINUTES: int = Field(default=60, description="JWT 过期时间（分钟）")
    JWT_REFRESH_EXPIRE_DAYS: int = Field(default=7, description="JWT 刷新令牌过期时间（天）")
    BCRYPT_ROUNDS: int = Field(default=12, description="密码哈希轮数")
    
    # ==========================================
    # 💾 数据库配置
    # ==========================================
    DATABASE_URL: str = Field(..., description="数据库连接URL")
    DATABASE_POOL_SIZE: int = Field(default=20, description="数据库连接池大小")
    DATABASE_MAX_OVERFLOW: int = Field(default=30, description="数据库连接池最大溢出")
    DATABASE_POOL_TIMEOUT: int = Field(default=30, description="数据库连接池超时")
    DATABASE_POOL_RECYCLE: int = Field(default=3600, description="数据库连接回收时间")
    
    # ==========================================
    # 🔴 Redis 配置
    # ==========================================
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis 连接URL")
    REDIS_POOL_SIZE: int = Field(default=20, description="Redis 连接池大小")
    REDIS_POOL_TIMEOUT: int = Field(default=30, description="Redis 连接池超时")
    REDIS_SESSION_DB: int = Field(default=0, description="Redis 会话数据库")
    REDIS_CACHE_DB: int = Field(default=1, description="Redis 缓存数据库")
    REDIS_QUEUE_DB: int = Field(default=2, description="Redis 队列数据库")
    
    # 会话配置
    SESSION_EXPIRE_SECONDS: int = Field(default=3600, description="会话过期时间（秒）")
    SESSION_CLEANUP_INTERVAL: int = Field(default=300, description="会话清理间隔（秒）")
    
    # ==========================================
    # 🤖 AI 服务配置
    # ==========================================
    # 阿里百炼 DashScope
    DASHSCOPE_API_KEY: Optional[str] = Field(default=None, description="DashScope API 密钥")
    DASHSCOPE_BASE_URL: str = Field(default="https://dashscope.aliyuncs.com", description="DashScope 基础URL")
    DASHSCOPE_MODEL: str = Field(default="qwen-turbo", description="DashScope 模型")
    DASHSCOPE_MAX_TOKENS: int = Field(default=2000, description="DashScope 最大令牌数")
    DASHSCOPE_TEMPERATURE: float = Field(default=0.7, description="DashScope 温度参数")
    
    # OpenAI (可选)
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API 密钥")
    OPENAI_BASE_URL: str = Field(default="https://api.openai.com/v1", description="OpenAI 基础URL")
    OPENAI_MODEL: str = Field(default="gpt-3.5-turbo", description="OpenAI 模型")
    OPENAI_MAX_TOKENS: int = Field(default=2000, description="OpenAI 最大令牌数")
    OPENAI_TEMPERATURE: float = Field(default=0.7, description="OpenAI 温度参数")
    
    # AI 服务通用配置
    AI_TIMEOUT: int = Field(default=30, description="AI 服务超时时间（秒）")
    AI_RETRY_ATTEMPTS: int = Field(default=3, description="AI 服务重试次数")
    AI_RETRY_DELAY: int = Field(default=1, description="AI 服务重试延迟（秒）")
    
    # ==========================================
    # 📡 WebSocket 配置
    # ==========================================
    WS_HEARTBEAT_INTERVAL: int = Field(default=30, description="WebSocket 心跳间隔（秒）")
    WS_MAX_CONNECTIONS: int = Field(default=1000, description="WebSocket 最大连接数")
    WS_CONNECTION_TIMEOUT: int = Field(default=300, description="WebSocket 连接超时（秒）")
    WS_MESSAGE_MAX_SIZE: int = Field(default=1048576, description="WebSocket 消息最大大小（字节）")
    WS_RATE_LIMIT: int = Field(default=60, description="WebSocket 消息限流（每分钟）")
    
    # ==========================================
    # 📝 日志配置
    # ==========================================
    LOG_LEVEL: str = Field(default="INFO", description="日志级别")
    LOG_FORMAT: str = Field(default="json", description="日志格式")
    LOG_FILE: str = Field(default="logs/app.log", description="日志文件路径")
    LOG_MAX_SIZE: int = Field(default=10485760, description="日志文件最大大小（字节）")
    LOG_BACKUP_COUNT: int = Field(default=5, description="日志文件备份数量")
    LOG_ROTATION: str = Field(default="daily", description="日志轮转策略")
    
    # ==========================================
    # 🔒 CORS 配置
    # ==========================================
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:3001",
        description="允许的跨域源（逗号分隔）"
    )
    CORS_CREDENTIALS: bool = Field(default=True, description="允许跨域凭证")
    CORS_METHODS: str = Field(
        default="GET,POST,PUT,DELETE,OPTIONS",
        description="允许的跨域方法（逗号分隔）"
    )
    CORS_HEADERS: str = Field(default="*", description="允许的跨域头")
    
    # ==========================================
    # 🛡️ 限流配置
    # ==========================================
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="启用限流")
    RATE_LIMIT_REQUESTS: int = Field(default=100, description="限流请求数")
    RATE_LIMIT_WINDOW: int = Field(default=60, description="限流时间窗口（秒）")
    RATE_LIMIT_STORAGE: str = Field(default="redis", description="限流存储")
    
    # API 特定限流
    AUTH_RATE_LIMIT: int = Field(default=5, description="认证接口限流（每分钟）")
    MESSAGE_RATE_LIMIT: int = Field(default=60, description="消息接口限流（每分钟）")
    ADMIN_RATE_LIMIT: int = Field(default=100, description="管理接口限流（每分钟）")
    
    # ==========================================
    # 📁 文件上传配置
    # ==========================================
    UPLOAD_DIR: str = Field(default="uploads", description="上传目录")
    UPLOAD_MAX_SIZE: int = Field(default=10485760, description="上传文件最大大小（字节）")
    UPLOAD_ALLOWED_TYPES: str = Field(
        default="image/jpeg,image/png,image/gif,application/pdf,text/plain",
        description="允许的文件类型（逗号分隔）"
    )
    UPLOAD_VIRUS_SCAN: bool = Field(default=False, description="启用病毒扫描")
    
    # ==========================================
    # 📊 监控配置
    # ==========================================
    METRICS_ENABLED: bool = Field(default=True, description="启用指标监控")
    METRICS_PATH: str = Field(default="/metrics", description="指标路径")
    METRICS_PORT: int = Field(default=9090, description="指标端口")
    
    HEALTH_CHECK_ENABLED: bool = Field(default=True, description="启用健康检查")
    HEALTH_CHECK_PATH: str = Field(default="/health", description="健康检查路径")
    
    PERFORMANCE_MONITORING: bool = Field(default=True, description="启用性能监控")
    SLOW_QUERY_THRESHOLD: float = Field(default=1.0, description="慢查询阈值（秒）")
    SLOW_REQUEST_THRESHOLD: float = Field(default=2.0, description="慢请求阈值（秒）")
    
    # ==========================================
    # 🌍 国际化配置
    # ==========================================
    DEFAULT_LANGUAGE: str = Field(default="zh-CN", description="默认语言")
    SUPPORTED_LANGUAGES: str = Field(
        default="zh-CN,en-US,ja-JP",
        description="支持的语言（逗号分隔）"
    )
    TIMEZONE: str = Field(default="Asia/Shanghai", description="时区")
    
    # ==========================================
    # 🚀 性能配置
    # ==========================================
    GZIP_COMPRESSION: bool = Field(default=True, description="启用 Gzip 压缩")
    STATIC_FILE_CACHING: bool = Field(default=True, description="启用静态文件缓存")
    DATABASE_CONNECTION_POOLING: bool = Field(default=True, description="启用数据库连接池")
    
    # ==========================================
    # 🎯 业务配置
    # ==========================================
    DEFAULT_AGENT_TYPE: str = Field(default="ai", description="默认代理类型")
    AUTO_ASSIGN_HUMAN: bool = Field(default=False, description="自动分配人工客服")
    MAX_AI_RETRIES: int = Field(default=3, description="AI 最大重试次数")
    HUMAN_TAKEOVER_KEYWORDS: str = Field(
        default="人工,客服,转人工",
        description="人工接管关键词（逗号分隔）"
    )
    
    # 会话限制
    MAX_SESSIONS_PER_USER: int = Field(default=5, description="每用户最大会话数")
    SESSION_IDLE_TIMEOUT: int = Field(default=1800, description="会话空闲超时（秒）")
    MAX_MESSAGE_LENGTH: int = Field(default=4000, description="消息最大长度")
    
    # ==========================================
    # 🎯 功能开关
    # ==========================================
    FEATURE_AI_STREAMING: bool = Field(default=True, description="启用 AI 流式响应")
    FEATURE_FILE_UPLOAD: bool = Field(default=True, description="启用文件上传")
    FEATURE_VOICE_MESSAGE: bool = Field(default=False, description="启用语音消息")
    FEATURE_VIDEO_CALL: bool = Field(default=False, description="启用视频通话")
    FEATURE_SCREEN_SHARING: bool = Field(default=False, description="启用屏幕共享")
    FEATURE_CHATBOT_TRAINING: bool = Field(default=True, description="启用聊天机器人训练")
    FEATURE_ANALYTICS_DASHBOARD: bool = Field(default=True, description="启用分析仪表板")
    FEATURE_MULTI_LANGUAGE: bool = Field(default=True, description="启用多语言")
    FEATURE_DARK_MODE: bool = Field(default=True, description="启用暗黑模式")
    
    # ==========================================
    # 🔧 属性方法
    # ==========================================

    @property
    def cors_origins_list(self) -> List[str]:
        """获取 CORS 源列表"""
        if not self.CORS_ORIGINS.strip():
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def cors_methods_list(self) -> List[str]:
        """获取 CORS 方法列表"""
        if not self.CORS_METHODS.strip():
            return []
        return [method.strip() for method in self.CORS_METHODS.split(",") if method.strip()]

    @property
    def cors_headers_list(self) -> List[str]:
        """获取 CORS 头列表"""
        if self.CORS_HEADERS == "*":
            return ["*"]
        if not self.CORS_HEADERS.strip():
            return []
        return [header.strip() for header in self.CORS_HEADERS.split(",") if header.strip()]

    @property
    def upload_allowed_types_list(self) -> List[str]:
        """获取允许的文件类型列表"""
        if not self.UPLOAD_ALLOWED_TYPES.strip():
            return []
        return [file_type.strip() for file_type in self.UPLOAD_ALLOWED_TYPES.split(",") if file_type.strip()]

    @property
    def supported_languages_list(self) -> List[str]:
        """获取支持的语言列表"""
        if not self.SUPPORTED_LANGUAGES.strip():
            return []
        return [lang.strip() for lang in self.SUPPORTED_LANGUAGES.split(",") if lang.strip()]

    @property
    def human_takeover_keywords_list(self) -> List[str]:
        """获取人工接管关键词列表"""
        if not self.HUMAN_TAKEOVER_KEYWORDS.strip():
            return []
        return [keyword.strip() for keyword in self.HUMAN_TAKEOVER_KEYWORDS.split(",") if keyword.strip()]

    # ==========================================
    # 🔧 验证器
    # ==========================================
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v):
        """验证日志级别"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of {valid_levels}")
        return v.upper()

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v):
        """验证运行环境"""
        valid_envs = ["development", "testing", "staging", "production"]
        if v.lower() not in valid_envs:
            raise ValueError(f"ENVIRONMENT must be one of {valid_envs}")
        return v.lower()




    
    # ==========================================
    # 🔧 配置类设置
    # ==========================================
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",  # 忽略额外字段
        "env_prefix": "",
    }


@lru_cache()
def get_settings() -> Settings:
    """
    获取配置实例（单例模式）
    使用 lru_cache 确保配置只加载一次
    """
    return Settings()


# 导出配置实例
settings = get_settings()
