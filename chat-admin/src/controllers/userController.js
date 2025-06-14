const { validationResult } = require("express-validator");
const UserService = require("../services/users");

class UserController {
  // 获取用户列表
  static async getUsers(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const filters = {
        page: parseInt(req.query.page) || 1,
        per_page: Math.min(parseInt(req.query.per_page) || 20, 50),
        search: req.query.search,
        role: req.query.role,
        status: req.query.status,
      };

      const result = await UserService.getList(filters);

      res.json({
        success: true,
        data: {
          users: result.data,
          meta: result.meta,
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取用户列表失败",
        },
      });
    }
  }

  // 获取用户详情
  static async getUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await UserService.getById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "用户不存在",
          },
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取用户详情失败",
        },
      });
    }
  }

  // 创建用户
  static async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const userData = req.body;
      const user = await UserService.create(userData);

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Create user error:", error);
      
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          error: {
            code: "DUPLICATE_ERROR",
            message: "用户名或邮箱已存在",
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "创建用户失败",
        },
      });
    }
  }

  // 更新用户
  static async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { userId } = req.params;
      const updateData = req.body;

      const user = await UserService.update(userId, updateData);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Update user error:", error);
      
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          error: {
            code: "DUPLICATE_ERROR",
            message: "用户名或邮箱已存在",
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "更新用户失败",
        },
      });
    }
  }

  // 删除用户
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      // 检查是否为当前用户
      if (parseInt(userId) === req.user.id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_OPERATION",
            message: "不能删除自己的账户",
          },
        });
      }

      await UserService.delete(userId);

      res.json({
        success: true,
        message: "用户删除成功",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "删除用户失败",
        },
      });
    }
  }

  // 重置密码
  static async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { userId } = req.params;
      const { password } = req.body;

      await UserService.resetPassword(userId, password);

      res.json({
        success: true,
        message: "密码重置成功",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "重置密码失败",
        },
      });
    }
  }

  // 获取用户统计信息
  static async getUserStats(req, res) {
    try {
      const { userId } = req.params;
      const stats = await UserService.getStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取用户统计信息失败",
        },
      });
    }
  }

  // 获取用户统计
  static async getUserStats(req, res) {
    try {
      const stats = await UserService.getStats();

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取用户统计失败'
        }
      });
    }
  }

  // 获取当前用户信息
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;
      const user = await UserService.getById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          }
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取当前用户信息失败'
        }
      });
    }
  }

  // 更新当前用户信息
  static async updateCurrentUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数无效',
            details: errors.array()
          }
        });
      }

      const userId = req.user.id;
      const updateData = {
        name: req.body.name,
        email: req.body.email,
        avatar_url: req.body.avatar_url
      };

      const user = await UserService.update(userId, updateData);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          }
        });
      }

      res.json({
        success: true,
        data: { user },
        message: '用户信息更新成功'
      });
    } catch (error) {
      console.error('Update current user error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: '邮箱已被使用'
          }
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新用户信息失败'
        }
      });
    }
  }

  // 修改当前用户密码
  static async changeCurrentUserPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数无效',
            details: errors.array()
          }
        });
      }

      const userId = req.user.id;
      const { current_password, new_password } = req.body;

      // 验证当前密码
      const isValidPassword = await UserService.verifyPassword(userId, current_password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: '当前密码不正确'
          }
        });
      }

      await UserService.changePassword(userId, new_password);

      res.json({
        success: true,
        message: '密码修改成功'
      });
    } catch (error) {
      console.error('Change current user password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '修改密码失败'
        }
      });
    }
  }
}

module.exports = UserController;