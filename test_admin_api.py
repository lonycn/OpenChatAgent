#!/usr/bin/env python3
"""
🧪 Chat Admin API 测试脚本

测试管理员API接口的基本功能
"""

import asyncio
import json
import sys
from pathlib import Path

import httpx
from loguru import logger

# 添加项目路径
sys.path.append(str(Path(__file__).parent / "chat-api"))

# API 基础配置
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# 测试用户凭据
TEST_ADMIN = {
    "email": "admin@example.com",
    "password": "admin123"
}

TEST_AGENT = {
    "email": "agent@example.com", 
    "password": "agent123"
}


class APITester:
    """API 测试类"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.admin_token = None
        self.agent_token = None
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def test_health_check(self):
        """测试健康检查"""
        logger.info("🔍 Testing health check...")
        
        try:
            response = await self.client.get(f"{BASE_URL}/health")
            assert response.status_code == 200
            data = response.json()
            logger.success(f"✅ Health check passed: {data.get('status', 'unknown')}")
            return True
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            return False
    
    async def test_login(self, credentials, user_type="admin"):
        """测试登录"""
        logger.info(f"🔐 Testing {user_type} login...")
        
        try:
            response = await self.client.post(
                f"{API_BASE}/auth/login",
                json=credentials
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("data", {}).get("token")
                if token:
                    if user_type == "admin":
                        self.admin_token = token
                    else:
                        self.agent_token = token
                    logger.success(f"✅ {user_type.title()} login successful")
                    return True
            
            logger.error(f"❌ {user_type.title()} login failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
        except Exception as e:
            logger.error(f"❌ {user_type.title()} login error: {e}")
            return False
    
    async def test_get_current_user(self, token, user_type="admin"):
        """测试获取当前用户信息"""
        logger.info(f"👤 Testing get current {user_type} user...")
        
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = await self.client.get(
                f"{API_BASE}/auth/me",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                user = data.get("data", {}).get("user", {})
                logger.success(f"✅ Got {user_type} user: {user.get('email', 'unknown')}")
                return True
            
            logger.error(f"❌ Get {user_type} user failed: {response.status_code}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Get {user_type} user error: {e}")
            return False
    
    async def test_admin_users_list(self):
        """测试获取用户列表"""
        logger.info("👥 Testing admin users list...")
        
        if not self.admin_token:
            logger.error("❌ No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = await self.client.get(
                f"{API_BASE}/admin/users",
                headers=headers,
                params={"page": 1, "size": 10}
            )
            
            if response.status_code == 200:
                data = response.json()
                users = data.get("data", {}).get("users", [])
                pagination = data.get("data", {}).get("pagination", {})
                logger.success(f"✅ Got {len(users)} users, total: {pagination.get('total', 0)}")
                return True
            
            logger.error(f"❌ Get users list failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Get users list error: {e}")
            return False
    
    async def test_admin_conversations_list(self):
        """测试获取会话列表"""
        logger.info("💬 Testing admin conversations list...")
        
        if not self.admin_token:
            logger.error("❌ No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = await self.client.get(
                f"{API_BASE}/admin/conversations",
                headers=headers,
                params={"page": 1, "size": 10}
            )
            
            if response.status_code == 200:
                data = response.json()
                conversations = data.get("conversations", [])
                pagination = data.get("pagination", {})
                logger.success(f"✅ Got {len(conversations)} conversations, total: {pagination.get('total', 0)}")
                return True
            
            logger.error(f"❌ Get conversations list failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Get conversations list error: {e}")
            return False
    
    async def test_admin_dashboard_stats(self):
        """测试获取仪表板统计"""
        logger.info("📊 Testing admin dashboard stats...")
        
        if not self.admin_token:
            logger.error("❌ No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = await self.client.get(
                f"{API_BASE}/admin/dashboard/stats",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.success("✅ Got dashboard stats")
                logger.info(f"Stats keys: {list(data.keys())}")
                return True
            
            logger.error(f"❌ Get dashboard stats failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Get dashboard stats error: {e}")
            return False
    
    async def test_admin_permissions(self):
        """测试获取权限列表"""
        logger.info("🔑 Testing admin permissions...")
        
        if not self.admin_token:
            logger.error("❌ No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = await self.client.get(
                f"{API_BASE}/admin/permissions",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                permissions = data.get("data", {}).get("permissions", [])
                logger.success(f"✅ Got {len(permissions)} permissions")
                return True
            
            logger.error(f"❌ Get permissions failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Get permissions error: {e}")
            return False
    
    async def run_all_tests(self):
        """运行所有测试"""
        logger.info("🚀 Starting Chat Admin API tests...")
        
        tests = [
            ("Health Check", self.test_health_check()),
            ("Admin Login", self.test_login(TEST_ADMIN, "admin")),
            ("Get Current Admin User", self.test_get_current_user(self.admin_token, "admin") if self.admin_token else None),
            ("Admin Users List", self.test_admin_users_list()),
            ("Admin Conversations List", self.test_admin_conversations_list()),
            ("Admin Dashboard Stats", self.test_admin_dashboard_stats()),
            ("Admin Permissions", self.test_admin_permissions()),
        ]
        
        passed = 0
        total = 0
        
        for test_name, test_coro in tests:
            if test_coro is None:
                continue
                
            total += 1
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
        
        return passed == total


async def main():
    """主函数"""
    logger.info("🧪 Chat Admin API Test Suite")
    logger.info("="*50)
    
    # 检查API服务是否运行
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/", timeout=5.0)
            if response.status_code != 200:
                logger.error(f"❌ API server not responding properly: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"❌ Cannot connect to API server at {BASE_URL}")
        logger.error(f"Please make sure the chat-api server is running")
        logger.error(f"Error: {e}")
        return False
    
    # 运行测试
    async with APITester() as tester:
        success = await tester.run_all_tests()
        
        if success:
            logger.success("🎉 All tests passed!")
            return True
        else:
            logger.error("💥 Some tests failed!")
            return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
