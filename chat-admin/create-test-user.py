#!/usr/bin/env python3
"""
创建测试用户脚本
"""
import requests
import json

API_BASE = "http://localhost:8000"

def create_test_user():
    """创建测试用户"""
    url = f"{API_BASE}/api/v1/auth/register"
    
    user_data = {
        "email": "admin@example.com",
        "password": "admin123456",
        "full_name": "系统管理员",
        "role": "admin"
    }
    
    try:
        response = requests.post(url, json=user_data)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.text}")
        
        if response.status_code == 200:
            print("✅ 测试用户创建成功!")
            return True
        else:
            print("❌ 测试用户创建失败")
            return False
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def test_login():
    """测试登录"""
    url = f"{API_BASE}/api/v1/auth/login"
    
    login_data = {
        "email": "admin@example.com",
        "password": "admin123456"
    }
    
    try:
        response = requests.post(url, json=login_data)
        print(f"登录状态码: {response.status_code}")
        print(f"登录响应: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print("✅ 登录成功!")
                print(f"Token: {token[:50]}...")
                return token
            else:
                print("❌ 登录响应中没有token")
                return None
        else:
            print("❌ 登录失败")
            return None
            
    except Exception as e:
        print(f"❌ 登录请求失败: {e}")
        return None

def test_get_user_info(token):
    """测试获取用户信息"""
    url = f"{API_BASE}/api/v1/auth/me"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"用户信息状态码: {response.status_code}")
        print(f"用户信息响应: {response.text}")
        
        if response.status_code == 200:
            print("✅ 获取用户信息成功!")
            return True
        else:
            print("❌ 获取用户信息失败")
            return False
            
    except Exception as e:
        print(f"❌ 获取用户信息请求失败: {e}")
        return False

if __name__ == "__main__":
    print("🚀 开始创建测试用户和测试登录...")
    
    # 1. 创建测试用户
    print("\n1. 创建测试用户...")
    create_test_user()
    
    # 2. 测试登录
    print("\n2. 测试登录...")
    token = test_login()
    
    # 3. 测试获取用户信息
    if token:
        print("\n3. 测试获取用户信息...")
        test_get_user_info(token)
    
    print("\n✨ 测试完成!")
    print("\n现在可以使用以下账号登录前端:")
    print("邮箱: admin@example.com")
    print("密码: admin123456")
