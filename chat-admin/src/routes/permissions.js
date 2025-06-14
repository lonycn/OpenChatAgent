const express = require('express');
const { body, param } = require('express-validator');
const PermissionController = require('../controllers/permissionController');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = express.Router();
const auth = { authenticate: authenticateToken, requireRole };

// 验证规则
const validateUserId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是正整数')
];

const validateRole = [
  param('role')
    .isIn(['admin', 'agent', 'viewer'])
    .withMessage('角色必须是 admin、agent 或 viewer')
];

const validatePermissions = [
  body('permissions')
    .isArray()
    .withMessage('权限必须是数组格式'),
  body('permissions.*')
    .isString()
    .notEmpty()
    .withMessage('权限项必须是非空字符串')
];

// 路由定义

// 获取所有可用权限
router.get('/',
  auth.authenticate,
  auth.requireRole(['admin']),
  PermissionController.getPermissions
);

// 获取用户权限
router.get('/users/:id',
  auth.authenticate,
  auth.requireRole(['admin']),
  validateUserId,
  PermissionController.getUserPermissions
);

// 更新用户权限
router.put('/users/:id',
  auth.authenticate,
  auth.requireRole(['admin']),
  validateUserId,
  validatePermissions,
  PermissionController.updateUserPermissions
);

// 获取角色权限
router.get('/roles/:role',
  auth.authenticate,
  auth.requireRole(['admin']),
  validateRole,
  PermissionController.getRolePermissions
);

// 更新角色权限
router.put('/roles/:role',
  auth.authenticate,
  auth.requireRole(['admin']),
  validateRole,
  validatePermissions,
  PermissionController.updateRolePermissions
);

module.exports = router;