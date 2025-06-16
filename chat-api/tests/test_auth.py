"""
🧪 认证API测试

测试用户认证相关功能
"""

import pytest
from httpx import AsyncClient


class TestAuth:
    """认证测试类"""
    
    async def test_register_user(self, client: AsyncClient, test_user_data):
        """测试用户注册"""
        response = await client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == test_user_data["full_name"]
        assert "id" in data
        assert "password" not in data  # 确保密码不在响应中
    
    async def test_register_duplicate_email(self, client: AsyncClient, test_user_data):
        """测试重复邮箱注册"""
        # 第一次注册
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        # 第二次注册相同邮箱
        response = await client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 400
        data = response.json()
        assert "邮箱已被注册" in data["error"]["message"]
    
    async def test_login_success(self, client: AsyncClient, test_user_data):
        """测试成功登录"""
        # 先注册用户
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        # 登录
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
    
    async def test_login_invalid_credentials(self, client: AsyncClient, test_user_data):
        """测试无效凭证登录"""
        # 先注册用户
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        # 使用错误密码登录
        login_data = {
            "email": test_user_data["email"],
            "password": "wrongpassword"
        }
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert "邮箱或密码错误" in data["error"]["message"]
    
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """测试不存在用户登录"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123"
        }
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert "邮箱或密码错误" in data["error"]["message"]
    
    async def test_get_current_user(self, client: AsyncClient, test_user_data):
        """测试获取当前用户信息"""
        # 注册并登录
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # 获取用户信息
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == test_user_data["full_name"]
    
    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """测试未认证获取用户信息"""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == 401
    
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """测试无效令牌获取用户信息"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    async def test_change_password(self, client: AsyncClient, test_user_data):
        """测试修改密码"""
        # 注册并登录
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # 修改密码
        change_password_data = {
            "old_password": test_user_data["password"],
            "new_password": "newpassword123"
        }
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/api/v1/auth/change-password", json=change_password_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "密码修改成功" in data["message"]
        
        # 验证新密码可以登录
        new_login_data = {
            "email": test_user_data["email"],
            "password": "newpassword123"
        }
        new_login_response = await client.post("/api/v1/auth/login", json=new_login_data)
        assert new_login_response.status_code == 200
    
    async def test_change_password_wrong_old_password(self, client: AsyncClient, test_user_data):
        """测试使用错误旧密码修改密码"""
        # 注册并登录
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # 使用错误旧密码修改密码
        change_password_data = {
            "old_password": "wrongoldpassword",
            "new_password": "newpassword123"
        }
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/api/v1/auth/change-password", json=change_password_data, headers=headers)
        
        assert response.status_code == 400
        data = response.json()
        assert "旧密码错误" in data["error"]["message"]
    
    async def test_logout(self, client: AsyncClient, test_user_data):
        """测试登出"""
        # 注册并登录
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # 登出
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/api/v1/auth/logout", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "登出成功" in data["message"]
