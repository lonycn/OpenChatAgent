"""
🔐 认证相关API

用户登录、注册、令牌管理等接口
"""

from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from jose import jwt
from loguru import logger
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, get_current_user_required
from src.config.settings import get_settings
from src.core.exceptions import AuthenticationException, ValidationException
from src.middleware.logging import log_user_action
from src.models.user import (
    User, UserLogin, UserCreate, UserResponse, Token, 
    RefreshToken, UserChangePassword, TokenData
)
from src.services.user import UserService

# 配置
settings = get_settings()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 创建路由
router = APIRouter()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: timedelta = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """创建刷新令牌"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


@router.post("/login", summary="用户登录")
async def login(
    request: Request,
    user_login: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    用户登录接口
    
    - **email**: 用户邮箱
    - **password**: 用户密码
    
    返回访问令牌和刷新令牌
    """
    try:
        user_service = UserService(db)
        
        # 查找用户
        user = await user_service.get_user_by_email(user_login.email)
        if not user:
            raise AuthenticationException("邮箱或密码错误")
        
        # 验证密码
        if not verify_password(user_login.password, user.password_hash):
            raise AuthenticationException("邮箱或密码错误")
        
        # 检查用户状态
        if user.status != "active":
            raise AuthenticationException("账户已被禁用")
        
        # 创建令牌数据
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "full_name": user.full_name,
        }
        
        # 生成令牌
        access_token_expires = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        access_token = create_access_token(
            data=token_data,
            expires_delta=access_token_expires
        )
        
        refresh_token = create_refresh_token(data=token_data)
        
        # 更新最后登录时间
        await user_service.update_last_login(user.id)
        
        # 记录登录日志
        log_user_action(request, "login", "user", {"user_id": user.id})
        
        logger.info(f"User logged in: {user.email} (ID: {user.id})")
        
        # 获取用户详细信息
        user_dict = {
            "id": user.id,
            "uuid": str(user.uuid),
            "username": user.email.split('@')[0],
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "role": user.role.value,
            "status": user.status.value,
            "department": None,  # 暂时没有部门字段
            "phone": None  # 暂时没有电话字段
        }

        # 返回前端期望的格式
        return {
            "success": True,
            "data": {
                "user": user_dict,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "permissions": ["admin"] if user.role == "admin" else ["user"]
            }
        }
        
    except AuthenticationException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录失败"
        )


@router.post("/register", response_model=UserResponse, summary="用户注册")
async def register(
    request: Request,
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    用户注册接口
    
    - **email**: 用户邮箱
    - **password**: 用户密码
    - **full_name**: 用户姓名
    - **role**: 用户角色（可选）
    
    返回创建的用户信息
    """
    try:
        user_service = UserService(db)
        
        # 检查邮箱是否已存在
        existing_user = await user_service.get_user_by_email(user_create.email)
        if existing_user:
            raise ValidationException("邮箱已被注册")
        
        # 创建用户
        user_data = user_create.model_dump()
        user_data["password_hash"] = get_password_hash(user_create.password)
        del user_data["password"]  # 移除明文密码
        
        user = await user_service.create_user(user_data)
        
        # 记录注册日志
        log_user_action(request, "register", "user", {"user_id": user.id})
        
        logger.info(f"User registered: {user.email} (ID: {user.id})")
        
        return UserResponse.model_validate(user)
        
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册失败"
        )


@router.post("/refresh", response_model=Token, summary="刷新令牌")
async def refresh_token(
    request: Request,
    refresh_data: RefreshToken
):
    """
    刷新访问令牌
    
    - **refresh_token**: 刷新令牌
    
    返回新的访问令牌
    """
    try:
        # 验证刷新令牌
        payload = jwt.decode(
            refresh_data.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")
        
        if not user_id or not email:
            raise AuthenticationException("无效的刷新令牌")
        
        # 创建新的访问令牌
        token_data = {
            "sub": user_id,
            "email": email,
            "role": role,
        }
        
        access_token_expires = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        access_token = create_access_token(
            data=token_data,
            expires_delta=access_token_expires
        )
        
        # 记录令牌刷新日志
        log_user_action(request, "refresh_token", "token", {"user_id": user_id})
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.JWT_EXPIRE_MINUTES * 60
        )
        
    except jwt.ExpiredSignatureError:
        raise AuthenticationException("刷新令牌已过期")
    except jwt.JWTError:
        raise AuthenticationException("无效的刷新令牌")
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="令牌刷新失败"
        )


@router.get("/me", response_model=UserResponse, summary="获取当前用户信息")
async def get_current_user_info(
    request: Request,
    current_user: TokenData = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前登录用户的详细信息
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_id(current_user.user_id)

        if not user:
            raise AuthenticationException("用户不存在")

        return UserResponse.model_validate(user)

    except AuthenticationException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户信息失败"
        )


@router.get("/current-user", summary="获取当前用户信息（前端兼容）")
async def get_current_user(
    request: Request,
    current_user: TokenData = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前登录用户的详细信息（前端兼容格式）
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_id(current_user.user_id)

        if not user:
            raise AuthenticationException("用户不存在")

        user_dict = {
            "id": user.id,
            "uuid": str(user.uuid),
            "username": user.email.split('@')[0],
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "role": user.role.value,
            "status": user.status.value,
            "department": None,  # 暂时没有部门字段
            "phone": None  # 暂时没有电话字段
        }

        return {
            "success": True,
            "data": {
                "user": user_dict
            }
        }

    except AuthenticationException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户信息失败"
        )


@router.post("/change-password", summary="修改密码")
async def change_password(
    request: Request,
    password_data: UserChangePassword,
    current_user: TokenData = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """
    修改当前用户密码
    
    - **old_password**: 旧密码
    - **new_password**: 新密码
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_id(current_user.user_id)
        
        if not user:
            raise AuthenticationException("用户不存在")
        
        # 验证旧密码
        if not verify_password(password_data.old_password, user.password_hash):
            raise ValidationException("旧密码错误")
        
        # 更新密码
        new_password_hash = get_password_hash(password_data.new_password)
        await user_service.update_password(user.id, new_password_hash)
        
        # 记录密码修改日志
        log_user_action(request, "change_password", "user", {"user_id": user.id})
        
        logger.info(f"Password changed for user: {user.email} (ID: {user.id})")
        
        return {"message": "密码修改成功"}
        
    except (AuthenticationException, ValidationException):
        raise
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码修改失败"
        )


@router.post("/logout", summary="用户登出")
async def logout(
    request: Request,
    current_user: TokenData = Depends(get_current_user_required)
):
    """
    用户登出接口
    
    注意：由于使用JWT，实际的令牌失效需要在客户端处理
    这个接口主要用于记录登出日志
    """
    try:
        # 记录登出日志
        log_user_action(request, "logout", "user", {"user_id": current_user.user_id})
        
        logger.info(f"User logged out: {current_user.email} (ID: {current_user.user_id})")
        
        return {"message": "登出成功"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登出失败"
        )
