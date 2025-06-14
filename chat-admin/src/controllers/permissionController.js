const { validationResult } = require('express-validator');
const PermissionService = require('../services/permissions');

class PermissionController {
  // 获取所有可用权限列表
  static async getPermissions(req, res) {
    try {
      const permissions = await PermissionService.getAll();

      res.json({
        success: true,
        data: { permissions }
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取权限列表失败'
        }
      });
    }
  }

  // 获取用户权限
  static async getUserPermissions(req, res) {
    try {
      const userId = parseInt(req.params.id);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: '无效的用户ID'
          }
        });
      }

      const permissions = await PermissionService.getUserPermissions(userId);

      res.json({
        success: true,
        data: { permissions }
      });
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取用户权限失败'
        }
      });
    }
  }

  // 更新用户权限
  static async updateUserPermissions(req, res) {
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

      const userId = parseInt(req.params.id);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: '无效的用户ID'
          }
        });
      }

      const { permissions } = req.body;
      await PermissionService.updateUserPermissions(userId, permissions);
      const updatedPermissions = await PermissionService.getUserPermissions(userId);

      res.json({
        success: true,
        data: { permissions: updatedPermissions },
        message: '用户权限更新成功'
      });
    } catch (error) {
      console.error('Update user permissions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新用户权限失败'
        }
      });
    }
  }

  // 获取角色权限
  static async getRolePermissions(req, res) {
    try {
      const { role } = req.params;
      if (!['admin', 'agent', 'viewer'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: '无效的角色类型'
          }
        });
      }

      const permissions = await PermissionService.getRolePermissions(role);

      res.json({
        success: true,
        data: { permissions }
      });
    } catch (error) {
      console.error('Get role permissions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取角色权限失败'
        }
      });
    }
  }

  // 更新角色权限
  static async updateRolePermissions(req, res) {
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

      const { role } = req.params;
      if (!['admin', 'agent', 'viewer'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: '无效的角色类型'
          }
        });
      }

      const { permissions } = req.body;
      await PermissionService.updateRolePermissions(role, permissions);
      const updatedPermissions = await PermissionService.getRolePermissions(role);

      res.json({
        success: true,
        data: { permissions: updatedPermissions },
        message: '角色权限更新成功'
      });
    } catch (error) {
      console.error('Update role permissions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新角色权限失败'
        }
      });
    }
  }
}

module.exports = PermissionController;