const authService = require("../services/authService");
const { body, validationResult } = require("express-validator");

class AuthController {
  // 登录
  async login(req, res) {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数不正确",
            details: errors.array(),
          },
        });
      }

      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: {
          user: result.user,
          token: result.accessToken,
          refresh_token: result.refreshToken,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({
        success: false,
        error: {
          code: "LOGIN_FAILED",
          message: error.message,
        },
      });
    }
  }

  // 刷新令牌
  async refresh(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数不正确",
            details: errors.array(),
          },
        });
      }

      const { refresh_token } = req.body;
      const result = await authService.refreshToken(refresh_token);

      res.json({
        success: true,
        data: {
          user: result.user,
          token: result.accessToken,
          refresh_token: result.refreshToken,
        },
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(401).json({
        success: false,
        error: {
          code: "REFRESH_FAILED",
          message: error.message,
        },
      });
    }
  }

  // 登出
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      await authService.logout(token);

      res.json({
        success: true,
        data: {
          message: "登出成功",
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "LOGOUT_FAILED",
          message: error.message,
        },
      });
    }
  }

  // 获取当前用户信息
  async me(req, res) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      res.json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "GET_USER_FAILED",
          message: error.message,
        },
      });
    }
  }

  // 更新用户资料
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数不正确",
            details: errors.array(),
          },
        });
      }

      const user = await authService.updateProfile(req.user.id, req.body);

      res.json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "UPDATE_PROFILE_FAILED",
          message: error.message,
        },
      });
    }
  }

  // 修改密码
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数不正确",
            details: errors.array(),
          },
        });
      }

      const { current_password, new_password } = req.body;
      await authService.changePassword(
        req.user.id,
        current_password,
        new_password
      );

      res.json({
        success: true,
        data: {
          message: "密码修改成功",
        },
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "CHANGE_PASSWORD_FAILED",
          message: error.message,
        },
      });
    }
  }

  // 注册新用户（管理员功能）
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数不正确",
            details: errors.array(),
          },
        });
      }

      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.accessToken,
          refresh_token: result.refreshToken,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "REGISTER_FAILED",
          message: error.message,
        },
      });
    }
  }
}

// 验证规则
const loginValidation = [
  body("email").isEmail().withMessage("请输入有效的邮箱地址").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("密码至少6位"),
];

const refreshValidation = [
  body("refresh_token").notEmpty().withMessage("刷新令牌不能为空"),
];

const updateProfileValidation = [
  body("full_name")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("姓名长度应在1-100字符之间"),
  body("avatar_url").optional().isURL().withMessage("头像URL格式不正确"),
  body("timezone")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("时区格式不正确"),
  body("language")
    .optional()
    .isIn(["zh-CN", "en-US", "ja-JP"])
    .withMessage("不支持的语言"),
];

const changePasswordValidation = [
  body("current_password").notEmpty().withMessage("当前密码不能为空"),
  body("new_password")
    .isLength({ min: 6 })
    .withMessage("新密码至少6位")
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("新密码必须包含字母和数字"),
];

const registerValidation = [
  body("email").isEmail().withMessage("请输入有效的邮箱地址").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("密码至少6位")
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("密码必须包含字母和数字"),
  body("full_name")
    .isLength({ min: 1, max: 100 })
    .withMessage("姓名长度应在1-100字符之间"),
  body("role")
    .optional()
    .isIn(["admin", "supervisor", "agent", "guest"])
    .withMessage("无效的角色"),
];

module.exports = {
  authController: new AuthController(),
  loginValidation,
  refreshValidation,
  updateProfileValidation,
  changePasswordValidation,
  registerValidation,
};
