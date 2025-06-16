"""
🔐 认证中间件

处理JWT认证和用户身份验证
"""

import time
from typing import Optional

from fastapi import Request, Response
from jose import JWTError, jwt
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from src.config.settings import get_settings
from src.core.exceptions import AuthenticationException
from src.models.user import TokenData, UserRole

settings = get_settings()


class AuthMiddleware(BaseHTTPMiddleware):
    """认证中间件"""
    
    # 不需要认证的路径
    EXEMPT_PATHS = {
        "/",
        "/health",
        "/metrics",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/favicon.ico",
    }
    
    # 不需要认证的路径前缀
    EXEMPT_PREFIXES = {
        "/static/",
        "/uploads/",
        "/ws",  # WebSocket 连接在连接时单独处理认证
    }
    
    async def dispatch(self, request: Request, call_next):
        """处理请求"""
        start_time = time.time()
        
        try:
            # 检查是否需要认证
            if self._is_exempt_path(request.url.path):
                response = await call_next(request)
                return response
            
            # 提取和验证令牌
            token = self._extract_token(request)
            if token:
                user_data = self._verify_token(token)
                if user_data:
                    # 将用户信息添加到请求状态
                    request.state.user = user_data
                    request.state.authenticated = True
                else:
                    request.state.user = None
                    request.state.authenticated = False
            else:
                request.state.user = None
                request.state.authenticated = False
            
            # 继续处理请求
            response = await call_next(request)
            
            # 添加处理时间头
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except AuthenticationException:
            raise
        except Exception as e:
            logger.error(f"Authentication middleware error: {e}")
            request.state.user = None
            request.state.authenticated = False
            response = await call_next(request)
            return response
    
    def _is_exempt_path(self, path: str) -> bool:
        """检查路径是否免于认证"""
        # 检查完全匹配
        if path in self.EXEMPT_PATHS:
            return True
        
        # 检查前缀匹配
        for prefix in self.EXEMPT_PREFIXES:
            if path.startswith(prefix):
                return True
        
        return False
    
    def _extract_token(self, request: Request) -> Optional[str]:
        """从请求中提取令牌"""
        # 从 Authorization 头提取
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            return authorization[7:]  # 移除 "Bearer " 前缀
        
        # 从查询参数提取（用于某些特殊情况）
        token = request.query_params.get("token")
        if token:
            return token
        
        return None
    
    def _verify_token(self, token: str) -> Optional[TokenData]:
        """验证JWT令牌"""
        try:
            # 解码JWT
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # 提取用户信息
            user_id = payload.get("sub")
            email = payload.get("email")
            role = payload.get("role")
            exp = payload.get("exp")
            
            if not user_id or not email:
                return None
            
            # 创建令牌数据
            token_data = TokenData(
                user_id=int(user_id),
                email=email,
                role=UserRole(role) if role else UserRole.GUEST,
                exp=exp
            )
            
            return token_data
            
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None


def get_current_user(request: Request) -> Optional[TokenData]:
    """获取当前用户信息"""
    return getattr(request.state, "user", None)


def get_current_user_id(request: Request) -> Optional[int]:
    """获取当前用户ID"""
    user = get_current_user(request)
    return user.user_id if user else None


def is_authenticated(request: Request) -> bool:
    """检查是否已认证"""
    return getattr(request.state, "authenticated", False)


def require_auth(request: Request) -> TokenData:
    """要求认证，如果未认证则抛出异常"""
    if not is_authenticated(request):
        raise AuthenticationException("需要认证")
    
    user = get_current_user(request)
    if not user:
        raise AuthenticationException("无效的认证信息")
    
    return user


def require_role(request: Request, required_role: UserRole) -> TokenData:
    """要求特定角色，如果权限不足则抛出异常"""
    user = require_auth(request)
    
    # 角色权限级别
    role_levels = {
        UserRole.GUEST: 0,
        UserRole.AGENT: 1,
        UserRole.SUPERVISOR: 2,
        UserRole.ADMIN: 3,
    }
    
    user_level = role_levels.get(user.role, 0)
    required_level = role_levels.get(required_role, 0)
    
    if user_level < required_level:
        from src.core.exceptions import AuthorizationException
        raise AuthorizationException(f"需要 {required_role.value} 或更高权限")
    
    return user


def require_admin(request: Request) -> TokenData:
    """要求管理员权限"""
    return require_role(request, UserRole.ADMIN)


def require_supervisor(request: Request) -> TokenData:
    """要求主管权限"""
    return require_role(request, UserRole.SUPERVISOR)


def require_agent(request: Request) -> TokenData:
    """要求客服权限"""
    return require_role(request, UserRole.AGENT)
