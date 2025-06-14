const express = require('express');
const { body, param, query } = require("express-validator");
const CustomerController = require("../controllers/customerController");
const { authenticateToken, requireRole } = require("../../middleware/auth");

const router = express.Router();
const auth = { authenticate: authenticateToken, requireRole };

// 验证规则
const validateCustomerId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('客户ID必须是有效的整数')
];

// 所有路由都需要认证
router.use(authenticateToken);

// 获取客户列表
router.get(
  "/",
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
    query("tags")
      .optional()
      .isString()
      .withMessage("标签必须是字符串"),
  ],
  CustomerController.getCustomers
);

// 获取客户详情
router.get(
  "/:customerId",
  [
    param("customerId")
      .isInt({ min: 1 })
      .withMessage("客户ID必须是有效的整数"),
  ],
  CustomerController.getCustomer
);

// 更新客户信息
router.put(
  "/:customerId",
  requireRole(["admin", "agent"]),
  [
    param("customerId")
      .isInt({ min: 1 })
      .withMessage("客户ID必须是有效的整数"),
    body("name")
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage("客户姓名长度必须在1-100个字符之间"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("邮箱格式不正确"),
    body("phone")
      .optional()
      .isMobilePhone()
      .withMessage("手机号格式不正确"),
    body("avatar_url")
      .optional()
      .isURL()
      .withMessage("头像URL格式不正确"),
  ],
  CustomerController.updateCustomer
);

// 获取客户会话历史
router.get(
  "/:customerId/conversations",
  [
    param("customerId")
      .isInt({ min: 1 })
      .withMessage("客户ID必须是有效的整数"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("页码必须是大于0的整数"),
    query("per_page")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("每页数量必须是1-50之间的整数"),
  ],
  CustomerController.getCustomerConversations
);

// 管理客户标签
router.post(
  "/:customerId/tags",
  requireRole(["admin", "agent"]),
  [
    param("customerId")
      .isInt({ min: 1 })
      .withMessage("客户ID必须是有效的整数"),
    body("tags")
      .isArray({ min: 1 })
      .withMessage("标签必须是非空数组"),
    body("tags.*")
      .isLength({ min: 1, max: 50 })
      .withMessage("每个标签长度必须在1-50个字符之间"),
    body("action")
      .isIn(["add", "remove"])
      .withMessage("操作类型必须是add或remove"),
  ],
  CustomerController.manageTags
);

// 获取客户统计
router.get('/stats',
  auth.authenticate,
  CustomerController.getCustomerStats
);

// 获取客户标签
router.get('/:id/tags',
  auth.authenticate,
  validateCustomerId,
  CustomerController.getCustomerTags
);

// 设置客户标签
router.put('/:id/tags',
  auth.authenticate,
  auth.requireRole(['admin', 'agent']),
  validateCustomerId,
  [
    body('tags')
      .isArray()
      .withMessage('标签必须是数组格式'),
    body('tags.*')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('标签名称长度必须在1-50字符之间')
  ],
  CustomerController.setCustomerTags
);

// 删除客户标签
router.delete('/:id/tags/:tagName',
  auth.authenticate,
  auth.requireRole(['admin', 'agent']),
  validateCustomerId,
  param('tagName')
    .notEmpty()
    .withMessage('标签名称不能为空'),
  CustomerController.removeCustomerTag
);

module.exports = router;