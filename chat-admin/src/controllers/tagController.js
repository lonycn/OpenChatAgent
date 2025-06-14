const { validationResult } = require('express-validator');
const TagService = require('../services/tags');

class TagController {
  // 获取所有标签列表
  static async getTags(req, res) {
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

      const filters = {
        page: parseInt(req.query.page) || 1,
        per_page: Math.min(parseInt(req.query.per_page) || 20, 50),
        search: req.query.search
      };

      const result = await TagService.getList(filters);

      res.json({
        success: true,
        data: {
          tags: result.data,
          meta: result.meta
        }
      });
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取标签列表失败'
        }
      });
    }
  }

  // 获取标签详情
  static async getTag(req, res) {
    try {
      const tagId = parseInt(req.params.id);
      if (!tagId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TAG_ID',
            message: '无效的标签ID'
          }
        });
      }

      const tag = await TagService.getById(tagId);
      if (!tag) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: '标签不存在'
          }
        });
      }

      res.json({
        success: true,
        data: { tag }
      });
    } catch (error) {
      console.error('Get tag error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取标签详情失败'
        }
      });
    }
  }

  // 创建标签
  static async createTag(req, res) {
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

      const tagData = {
        name: req.body.name,
        color: req.body.color,
        description: req.body.description
      };

      const tag = await TagService.create(tagData);

      res.status(201).json({
        success: true,
        data: { tag },
        message: '标签创建成功'
      });
    } catch (error) {
      console.error('Create tag error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'TAG_EXISTS',
            message: '标签名称已存在'
          }
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '创建标签失败'
        }
      });
    }
  }

  // 更新标签
  static async updateTag(req, res) {
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

      const tagId = parseInt(req.params.id);
      if (!tagId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TAG_ID',
            message: '无效的标签ID'
          }
        });
      }

      const updateData = {
        name: req.body.name,
        color: req.body.color,
        description: req.body.description
      };

      const tag = await TagService.update(tagId, updateData);
      if (!tag) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: '标签不存在'
          }
        });
      }

      res.json({
        success: true,
        data: { tag },
        message: '标签更新成功'
      });
    } catch (error) {
      console.error('Update tag error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'TAG_EXISTS',
            message: '标签名称已存在'
          }
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新标签失败'
        }
      });
    }
  }

  // 删除标签
  static async deleteTag(req, res) {
    try {
      const tagId = parseInt(req.params.id);
      if (!tagId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TAG_ID',
            message: '无效的标签ID'
          }
        });
      }

      const deleted = await TagService.delete(tagId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: '标签不存在'
          }
        });
      }

      res.json({
        success: true,
        message: '标签删除成功'
      });
    } catch (error) {
      console.error('Delete tag error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '删除标签失败'
        }
      });
    }
  }

  // 获取标签统计
  static async getTagStats(req, res) {
    try {
      const stats = await TagService.getStats();

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get tag stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取标签统计失败'
        }
      });
    }
  }
}

module.exports = TagController;