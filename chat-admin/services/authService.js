const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid");

class AuthService {
  constructor() {
    // 开发环境的测试用户（避免数据库依赖）
    this.testUsers = {
      "admin@chatadmin.com": {
        id: 1,
        uuid: uuidv4(),
        email: "admin@chatadmin.com",
        password_hash: bcrypt.hashSync("admin123456", 10),
        full_name: "系统管理员",
        role: "admin",
        status: "active",
        avatar_url: "",
        timezone: "Asia/Shanghai",
        language: "zh-CN",
        created_at: new Date(),
        updated_at: new Date(),
      },
      "agent@chatadmin.com": {
        id: 2,
        uuid: uuidv4(),
        email: "agent@chatadmin.com",
        password_hash: bcrypt.hashSync("agent123456", 10),
        full_name: "客服代表",
        role: "agent",
        status: "active",
        avatar_url: "",
        timezone: "Asia/Shanghai",
        language: "zh-CN",
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
  }

  // 生成JWT令牌
  generateTokens(user) {
    const payload = {
      user_id: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getUserPermissions(user.role),
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    const refreshToken = jwt.sign(
      { user_id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
    );

    return { accessToken, refreshToken };
  }

  // 获取用户权限列表
  getUserPermissions(role) {
    const rolePermissions = {
      admin: ["*"], // 管理员拥有所有权限
      supervisor: [
        "conversations:read",
        "conversations:write",
        "conversations:assign",
        "contacts:read",
        "contacts:write",
        "reports:read",
        "reports:export",
        "users:read",
      ],
      agent: [
        "conversations:read",
        "conversations:write",
        "contacts:read",
        "contacts:write",
      ],
      guest: ["conversations:read"],
    };

    return rolePermissions[role] || [];
  }

  // 登录
  async login(email, password) {
    try {
      // 在开发环境中，优先使用测试用户
      if (process.env.NODE_ENV === "development" && this.testUsers[email]) {
        const testUser = this.testUsers[email];
        const isValidPassword = await bcrypt.compare(
          password,
          testUser.password_hash
        );

        if (isValidPassword) {
          const accessToken = this.generateAccessToken(testUser);
          const refreshToken = this.generateRefreshToken(testUser);

          console.log(`✅ 测试用户登录成功: ${email}`);

          return {
            user: this.sanitizeUser(testUser),
            accessToken,
            refreshToken,
          };
        }
      }

      // 尝试从数据库查找用户
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("用户不存在或密码错误");
      }

      // 验证密码
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        throw new Error("用户不存在或密码错误");
      }

      // 检查用户状态
      if (user.status !== "active") {
        throw new Error("账户已被禁用");
      }

      // 更新最后登录时间
      await user.updateLastLogin();

      // 生成令牌
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        user: user.toSimpleObject(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new Error(error.message || "登录失败");
    }
  }

  // 刷新令牌
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      // 从数据库或测试用户中获取用户信息
      let user;
      if (
        process.env.NODE_ENV === "development" &&
        decoded.email &&
        this.testUsers[decoded.email]
      ) {
        user = this.testUsers[decoded.email];
      } else {
        user = await User.findById(decoded.user_id);
        if (!user) {
          throw new Error("用户不存在");
        }
      }

      // 检查用户状态
      if (user.status !== "active") {
        throw new Error("账户已被禁用");
      }

      // 生成新的令牌
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        user: this.sanitizeUser(user),
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error("刷新令牌失败");
    }
  }

  // 验证令牌
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.user_id);

      if (!user || user.status !== "active") {
        throw new Error("无效的令牌");
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // 创建新用户（注册）
  async register(userData) {
    const user = await User.create(userData);
    return user.toSimpleObject();
  }

  // 修改密码
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    // 验证当前密码
    const isValidPassword = await user.verifyPassword(currentPassword);
    if (!isValidPassword) {
      throw new Error("当前密码错误");
    }

    // 更新密码
    await user.changePassword(newPassword);
    return true;
  }

  // 重置密码（管理员功能）
  async resetPassword(userId, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("用户不存在");
      }

      await user.changePassword(newPassword);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // 获取当前用户信息
  async getCurrentUser(userId) {
    // 在开发环境中，从测试用户中查找
    if (process.env.NODE_ENV === "development") {
      const testUser = Object.values(this.testUsers).find(
        (u) => u.id === userId
      );
      if (testUser) {
        return this.sanitizeUser(testUser);
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    return user.toSimpleObject();
  }

  // 更新用户资料
  async updateProfile(userId, updateData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    await user.update(updateData);
    return user.toSimpleObject();
  }

  // 登出
  async logout(token) {
    // 这里可以实现令牌黑名单功能
    // 暂时只是简单返回成功
    return true;
  }

  // 生成访问令牌
  generateAccessToken(user) {
    const payload = {
      user_id: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });
  }

  // 生成刷新令牌
  generateRefreshToken(user) {
    const payload = {
      user_id: user.id,
      email: user.email,
      type: "refresh",
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    });
  }

  // 清理用户信息（移除敏感数据）
  sanitizeUser(user) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}

module.exports = new AuthService();
