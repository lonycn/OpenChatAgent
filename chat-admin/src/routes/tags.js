const express = require('express');
const { body, param, query } = require('express-validator');
const TagController = require('../controllers/tagController');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = express.Router();
const auth = { authenticate: authenticateToken, requireRole };

// 验证规则
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  query('per_page')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('每页数量必须是1-50之间的整数'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('搜索关键词长度必须在1-100字符之间')
];

const validateTagName = [
  param('name')
    .notEmpty()
    .withMessage('标签名称不能为空')
    .isLength({ min: 1, max: 50 })
    .withMessage('标签名称长度必须在1-50字符之间')
];

const validateCreateTag = [
  body('name')
    .notEmpty()
    .withMessage('标签名称不能为空')
    .isLength({ min: 1, max: 50 })
    .withMessage('标签名称长度必须在1-50字符之间')
    .matches(/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/)
    .withMessage('标签名称只能包含中文、英文、数字、下划线、连字符和空格'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('颜色必须是有效的十六进制颜色值'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('描述长度不能超过200字符')
];

const validateUpdateTag = [
  param('name')
    .notEmpty()
    .withMessage('标签名称不能为空'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('标签名称长度必须在1-50字符之间')
    .matches(/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/)
    .withMessage('标签名称只能包含中文、英文、数字、下划线、连字符和空格'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('颜色必须是有效的十六进制颜色值'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('描述长度不能超过200字符')
];

// 路由定义

// 获取标签列表
router.get('/', 
  auth.authenticate,
  validatePagination,
  TagController.getTags
);

// 获取标签统计
router.get('/stats',
  auth.authenticate,
  TagController.getTagStats
);

// 获取标签详情
router.get('/:name',
  auth.authenticate,
  validateTagName,
  TagController.getTag
);

// 创建标签
router.post('/',
  auth.authenticate,
  auth.requireRole(['admin', 'agent']),
  validateCreateTag,
  TagController.createTag
);

// 更新标签
router.put('/:name',
  auth.authenticate,
  auth.requireRole(['admin', 'agent']),
  validateUpdateTag,
  TagController.updateTag
);

// 删除标签
router.delete('/:name',
  auth.authenticate,
  auth.requireRole(['admin']),
  validateTagName,
  TagController.deleteTag
);

module.exports = router;