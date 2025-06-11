/**
 * 🔐 认证处理器 - WebSocket连接认证
 * 
 * 功能:
 * - JWT令牌验证
 * - 用户身份识别
 * - 会话管理
 * - 权限检查
 */

class AuthHandler {
  constructor(options = {}) {
    this.options = {
      jwtSecret: process.env.JWT_SECRET || 'default-secret',
      tokenExpiry: 24 * 60 * 60 * 1000, // 24小时
      allowAnonymous: true,
      requireAuth: false,
      ...options
    };
    
    console.log('✅ AuthHandler initialized');
  }
  
  /**
   * 认证WebSocket连接
   */
  async authenticateConnection(ws, req, metadata) {
    try {
      // 从查询参数或头部获取令牌
      const token = this.extractToken(req);
      
      if (!token) {
        if (this.options.requireAuth) {
          throw new Error('Authentication token required');
        }
        
        // 允许匿名连接
        if (this.options.allowAnonymous) {
          return this.createAnonymousUser(metadata);
        }
        
        throw new Error('Authentication required');
      }
      
      // 验证令牌
      const user = await this.verifyToken(token);
      
      if (!user) {
        throw new Error('Invalid authentication token');
      }
      
      // 检查用户权限
      if (!this.checkPermissions(user)) {
        throw new Error('Insufficient permissions');
      }
      
      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles || [],
        permissions: user.permissions || [],
        sessionId: user.sessionId,
        authenticated: true,
        token: token
      };
      
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw error;
    }
  }
  
  /**
   * 从请求中提取令牌
   */
  extractToken(req) {
    // 从查询参数获取
    const url = new URL(req.url, 'http://localhost');
    let token = url.searchParams.get('token');
    
    if (token) {
      return token;
    }
    
    // 从Authorization头部获取
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // 从Cookie获取
    const cookies = this.parseCookies(req.headers.cookie);
    if (cookies.token) {
      return cookies.token;
    }
    
    return null;
  }
  
  /**
   * 解析Cookie
   */
  parseCookies(cookieHeader) {
    const cookies = {};
    
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookies[name] = decodeURIComponent(value);
        }
      });
    }
    
    return cookies;
  }
  
  /**
   * 验证JWT令牌
   */
  async verifyToken(token) {
    try {
      // 这里应该使用真正的JWT库，如jsonwebtoken
      // 为了简化，这里使用模拟验证
      
      if (token === 'demo-token') {
        return {
          id: 'demo-user',
          username: 'demo',
          email: 'demo@example.com',
          roles: ['user'],
          permissions: ['chat'],
          sessionId: 'demo-session'
        };
      }
      
      // 实际实现应该解码和验证JWT
      // const jwt = require('jsonwebtoken');
      // const decoded = jwt.verify(token, this.options.jwtSecret);
      // return decoded;
      
      return null;
      
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return null;
    }
  }
  
  /**
   * 检查用户权限
   */
  checkPermissions(user) {
    // 检查用户是否有聊天权限
    if (user.permissions && user.permissions.includes('chat')) {
      return true;
    }
    
    // 检查用户角色
    if (user.roles && (user.roles.includes('user') || user.roles.includes('admin'))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 创建匿名用户
   */
  createAnonymousUser(metadata) {
    const { v4: uuidv4 } = require('uuid');
    
    return {
      userId: `anonymous-${uuidv4()}`,
      username: 'Anonymous',
      email: null,
      roles: ['anonymous'],
      permissions: ['chat'],
      sessionId: uuidv4(),
      authenticated: false,
      anonymous: true,
      ip: metadata.ip,
      userAgent: metadata.userAgent
    };
  }
  
  /**
   * 刷新令牌
   */
  async refreshToken(oldToken) {
    try {
      const user = await this.verifyToken(oldToken);
      if (!user) {
        throw new Error('Invalid token for refresh');
      }
      
      // 生成新令牌
      // const jwt = require('jsonwebtoken');
      // const newToken = jwt.sign(user, this.options.jwtSecret, {
      //   expiresIn: this.options.tokenExpiry
      // });
      
      // 模拟新令牌
      const newToken = `refreshed-${Date.now()}`;
      
      return {
        token: newToken,
        user: user,
        expiresAt: new Date(Date.now() + this.options.tokenExpiry)
      };
      
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      throw error;
    }
  }
  
  /**
   * 注销用户
   */
  async logout(token) {
    try {
      // 将令牌加入黑名单
      // 实际实现中应该将令牌存储到Redis或数据库的黑名单中
      console.log(`Token logged out: ${token}`);
      
      return true;
    } catch (error) {
      console.error('Logout failed:', error.message);
      return false;
    }
  }
  
  /**
   * 验证消息权限
   */
  async validateMessagePermission(user, messageType) {
    // 检查用户是否有发送特定类型消息的权限
    const permissionMap = {
      'text': ['chat'],
      'image': ['chat', 'upload'],
      'file': ['chat', 'upload'],
      'admin': ['admin'],
      'system': ['admin', 'system']
    };
    
    const requiredPermissions = permissionMap[messageType] || ['chat'];
    
    return requiredPermissions.some(permission => 
      user.permissions && user.permissions.includes(permission)
    );
  }
}

module.exports = AuthHandler;