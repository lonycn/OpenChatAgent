const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const {
  authController,
  loginValidation,
  refreshValidation,
  updateProfileValidation,
  changePasswordValidation,
  registerValidation,
} = require("../controllers/authController");

// 公开路由（不需要认证）

/**
 * @route   POST /api/v1/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post("/login", loginValidation, authController.login);

/**
 * @route   POST /api/login/account (兼容前端)
 * @desc    用户登录 - 兼容Ant Design Pro默认路径
 * @access  Public
 */
router.post("/account", loginValidation, authController.login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post("/refresh", refreshValidation, authController.refresh);

// 需要认证的路由

/**
 * @route   POST /api/v1/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post("/logout", authenticateToken, authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get("/me", authenticateToken, authController.me);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    更新用户资料
 * @access  Private
 */
router.put(
  "/profile",
  authenticateToken,
  updateProfileValidation,
  authController.updateProfile
);

/**
 * @route   PUT /api/v1/auth/password
 * @desc    修改密码
 * @access  Private
 */
router.put(
  "/password",
  authenticateToken,
  changePasswordValidation,
  authController.changePassword
);

// 管理员路由

/**
 * @route   POST /api/v1/auth/register
 * @desc    注册新用户（管理员功能）
 * @access  Private (Admin/Supervisor)
 */
router.post(
  "/register",
  authenticateToken,
  requireRole(["admin", "supervisor"]),
  registerValidation,
  authController.register
);

module.exports = router;
