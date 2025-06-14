const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8005/api/v1';
let authToken = '';

async function testLogin() {
  console.log('\n=== 测试登录接口 ===');
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@chatadmin.com',
        password: 'admin123456'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    
    if (result.success && result.data) {
      authToken = result.data.token;
      console.log('✅ 登录成功');
      console.log('用户:', result.data.user.full_name);
      console.log('角色:', result.data.user.role);
    } else {
      console.log('❌ 登录失败:', result.error?.message);
    }
  } catch (error) {
    console.error('❌ 登录错误:', error.message);
  }
}

async function testUsersList() {
  console.log('\n=== 测试用户列表接口 ===');
  try {
    const response = await fetch(`${BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Status:', response.status);
    
    if (response.ok) {
      console.log('✅ 用户列表获取成功');
      console.log('用户数量:', result.data?.users?.length || 0);
    } else {
      console.log('❌ 用户列表获取失败:', result.error?.message || result.message);
    }
  } catch (error) {
    console.error('❌ 用户列表错误:', error.message);
  }
}

async function testConversationsList() {
  console.log('\n=== 测试会话列表接口 ===');
  try {
    const response = await fetch(`${BASE_URL}/conversations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Status:', response.status);
    
    if (response.ok) {
      console.log('✅ 会话列表获取成功');
      console.log('会话数量:', result.data?.conversations?.length || 0);
    } else {
      console.log('❌ 会话列表获取失败:', result.error?.message || result.message);
    }
  } catch (error) {
    console.error('❌ 会话列表错误:', error.message);
  }
}

async function testCurrentUser() {
  console.log('\n=== 测试当前用户信息接口 ===');
  try {
    const response = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Status:', response.status);
    
    if (response.ok) {
      console.log('✅ 当前用户信息获取成功');
      console.log('用户:', result.data?.user?.full_name);
    } else {
      console.log('❌ 当前用户信息获取失败:', result.error?.message || result.message);
    }
  } catch (error) {
    console.error('❌ 当前用户信息错误:', error.message);
  }
}

async function testLogout() {
  console.log('\n=== 测试登出接口 ===');
  try {
    const response = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Status:', response.status);
    
    if (response.ok) {
      console.log('✅ 登出成功');
    } else {
      console.log('❌ 登出失败:', result.error?.message || result.message);
    }
  } catch (error) {
    console.error('❌ 登出错误:', error.message);
  }
}

async function runAllTests() {
  console.log('开始测试所有主要API接口...');
  
  await testLogin();
  
  if (authToken) {
    await testCurrentUser();
    await testUsersList();
    await testConversationsList();
    await testLogout();
  }
  
  console.log('\n=== 测试完成 ===');
}

runAllTests();