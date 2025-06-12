const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

class AuthService {
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

  // 用户登录
  async login(email, password) {
    try {
      // 查找用户
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("邮箱或密码错误");
      }

      // 检查用户状态
      if (user.status !== "active") {
        throw new Error("账号已被禁用，请联系管理员");
      }

      // 验证密码
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        throw new Error("邮箱或密码错误");
      }

      // 更新最后登录时间
      await user.updateLastLogin();

      // 生成令牌
      const tokens = this.generateTokens(user);

      return {
        user: user.toJSON(),
        ...tokens,
      };
    } catch (error) {
      throw error;
    }
  }

  // 刷新令牌
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.user_id);

      if (!user || user.status !== "active") {
        throw new Error("无效的刷新令牌");
      }

      const tokens = this.generateTokens(user);
      return {
        user: user.toJSON(),
        ...tokens,
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
    try {
      const { email, password, full_name, role = "agent" } = userData;

      // 检查邮箱是否已存在
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error("邮箱已被注册");
      }

      // 创建用户
      const user = await User.create({
        email,
        password,
        full_name,
        role,
        status: "active",
      });

      // 生成令牌
      const tokens = this.generateTokens(user);

      return {
        user: user.toJSON(),
        ...tokens,
      };
    } catch (error) {
      throw error;
    }
  }

  // 修改密码
  async changePassword(userId, currentPassword, newPassword) {
    try {
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

      return { success: true };
    } catch (error) {
      throw error;
    }
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
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("用户不存在");
      }

      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }

  // 更新用户资料
  async updateProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("用户不存在");
      }

      // 只允许更新特定字段
      const allowedFields = ["full_name", "avatar_url", "timezone", "language"];
      const dataToUpdate = {};

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          dataToUpdate[field] = updateData[field];
        }
      });

      await user.update(dataToUpdate);
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }

  // 登出（可以在这里实现token黑名单等逻辑）
  async logout(token) {
    // 目前简单实现，客户端删除token即可
    // 后续可以实现token黑名单机制
    return { success: true };
  }
}

module.exports = new AuthService();
