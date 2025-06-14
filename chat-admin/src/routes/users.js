const express = require('express');
const { body, param, query } = require('express-validator');
const UserController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = express.Router();
const auth = { authenticate: authenticateToken, requireRole };

// 所有路由都需要认证
router.use(authenticateToken);

// 获取用户列表 - 只有管理员可以访问
router.get(
  "/",
  requireRole(["admin"]),
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("页码必须是大于0的整数"),
    query("per_page")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("每页数量必须是1-50之间的整数"),
    query("search")
      .optional()
      .isLength({ max: 100 })
      .withMessage("搜索关键词长度不能超过100个字符"),
    query("role")
      .optional()
      .isIn(["admin", "agent", "viewer"])
      .withMessage("角色必须是admin、agent或viewer"),
    query("status")
      .optional()
      .isIn(["active", "inactive"])
      .withMessage("状态必须是active或inactive"),
  ],
  UserController.getUsers
);

// 获取用户详情
router.get(
  "/:userId",
  [
    param("userId")
      .isInt({ min: 1 })
      .withMessage("用户ID必须是有效的整数"),
  ],
  UserController.getUser
);

// 创建用户 - 只有管理员可以创建
router.post(
  "/",
  requireRole(["admin"]),
  [
    body("full_name")
      .isLength({ min: 1, max: 100 })
      .withMessage("姓名长度必须在1-100个字符之间"),
    body("email")
      .isEmail()
      .withMessage("邮箱格式不正确"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("密码长度至少6个字符")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("密码必须包含大小写字母和数字"),
    body("role")
      .optional()
      .isIn(["admin", "agent", "viewer"])
      .withMessage("角色必须是admin、agent或viewer"),
    body("status")
      .optional()
      .isIn(["active", "inactive"])
      .withMessage("状态必须是active或inactive"),
  ],
  UserController.createUser
);

// 更新用户 - 管理员可以更新所有用户，普通用户只能更新自己
router.put(
  "/:userId",
  [
    param("userId")
      .isInt({ min: 1 })
      .withMessage("用户ID必须是有效的整数"),
    body("full_name")
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage("姓名长度必须在1-100个字符之间"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("邮箱格式不正确"),
    body("role")
      .optional()
      .isIn(["admin", "agent", "viewer"])
      .withMessage("角色必须是admin、agent或viewer"),
    body("status")
      .optional()
      .isIn(["active", "inactive"])
      .withMessage("状态必须是active或inactive"),
    body("avatar_url")
      .optional()
      .isURL()
      .withMessage("头像URL格式不正确"),
  ],
  (req, res, next) => {
    // 检查权限：管理员可以更新任何用户，普通用户只能更新自己
    const { userId } = req.params;
    const currentUser = req.user;
    
    if (currentUser.role !== "admin" && parseInt(userId) !== currentUser.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "没有权限更新其他用户信息",
        },
      });
    }
    
    // 非管理员不能修改角色和状态
    if (currentUser.role !== "admin") {
      delete req.body.role;
      delete req.body.status;
    }
    
    next();
  },
  UserController.updateUser
);

// 删除用户 - 只有管理员可以删除
router.delete(
  "/:userId",
  requireRole(["admin"]),
  [
    param("userId")
      .isInt({ min: 1 })
      .withMessage("用户ID必须是有效的整数"),
  ],
  UserController.deleteUser
);

// 重置密码 - 只有管理员可以重置其他用户密码
router.post(
  "/:userId/reset-password",
  requireRole(["admin"]),
  [
    param("userId")
      .isInt({ min: 1 })
      .withMessage("用户ID必须是有效的整数"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("密码长度至少6个字符")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("密码必须包含大小写字母和数字"),
  ],
  UserController.resetPassword
);

// 获取用户统计信息
router.get(
  "/:userId/stats",
  [
    param("userId")
      .isInt({ min: 1 })
      .withMessage("用户ID必须是有效的整数"),
  ],
  (req, res, next) => {
    // 检查权限：管理员可以查看任何用户统计，普通用户只能查看自己的
    const { userId } = req.params;
    const currentUser = req.user;
    
    if (currentUser.role !== "admin" && parseInt(userId) !== currentUser.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "没有权限查看其他用户统计信息",
        },
      });
    }
    
    next();
  },
  UserController.getUserStats
);

// 获取用户统计
router.get('/stats',
  auth.authenticate,
  auth.requireRole(['admin']),
  UserController.getUserStats
);

// 获取当前用户信息
router.get('/me',
  auth.authenticate,
  UserController.getCurrentUser
);

// 更新当前用户信息
router.put('/me',
  auth.authenticate,
  [
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('姓名长度必须在1-100字符之间'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('邮箱格式无效'),
    body('avatar_url')
      .optional()
      .isURL()
      .withMessage('头像URL格式无效')
  ],
  UserController.updateCurrentUser
);

// 修改当前用户密码
router.post('/me/change-password',
  auth.authenticate,
  [
    body('current_password')
      .notEmpty()
      .withMessage('当前密码不能为空'),
    body('new_password')
      .isLength({ min: 6 })
      .withMessage('新密码长度至少6位')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('新密码必须包含大小写字母和数字')
  ],
  UserController.changeCurrentUserPassword
);

module.exports = router;