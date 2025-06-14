const db = require('../../config/database');

class PermissionService {
  // 默认权限定义
  static getDefaultPermissions() {
    return {
      // 会话管理权限
      'conversations.view': { name: '查看会话', category: 'conversations', description: '查看会话列表和详情' },
      'conversations.assign': { name: '分配会话', category: 'conversations', description: '分配会话给其他客服' },
      'conversations.takeover': { name: '接管会话', category: 'conversations', description: '接管其他客服的会话' },
      'conversations.close': { name: '关闭会话', category: 'conversations', description: '关闭和解决会话' },
      'conversations.message': { name: '发送消息', category: 'conversations', description: '在会话中发送消息' },
      'conversations.note': { name: '添加备注', category: 'conversations', description: '为会话添加内部备注' },
      'conversations.switch_agent': { name: '切换代理类型', category: 'conversations', description: '在AI和人工代理间切换' },
      
      // 客户管理权限
      'customers.view': { name: '查看客户', category: 'customers', description: '查看客户列表和详情' },
      'customers.edit': { name: '编辑客户', category: 'customers', description: '编辑客户信息' },
      'customers.tags': { name: '管理客户标签', category: 'customers', description: '添加、编辑、删除客户标签' },
      'customers.history': { name: '查看客户历史', category: 'customers', description: '查看客户的会话历史' },
      
      // 用户管理权限
      'users.view': { name: '查看用户', category: 'users', description: '查看用户列表和详情' },
      'users.create': { name: '创建用户', category: 'users', description: '创建新用户账户' },
      'users.edit': { name: '编辑用户', category: 'users', description: '编辑用户信息' },
      'users.delete': { name: '删除用户', category: 'users', description: '删除用户账户' },
      'users.permissions': { name: '管理用户权限', category: 'users', description: '管理用户权限设置' },
      'users.reset_password': { name: '重置密码', category: 'users', description: '重置用户密码' },
      
      // 报表权限
      'reports.view': { name: '查看报表', category: 'reports', description: '查看各类统计报表' },
      'reports.export': { name: '导出报表', category: 'reports', description: '导出报表数据' },
      'reports.advanced': { name: '高级报表', category: 'reports', description: '查看高级分析报表' },
      
      // 系统管理权限
      'system.settings': { name: '系统设置', category: 'system', description: '管理系统配置' },
      'system.logs': { name: '查看日志', category: 'system', description: '查看系统日志' },
      'system.backup': { name: '数据备份', category: 'system', description: '执行数据备份操作' },
      
      // 标签管理权限
      'tags.view': { name: '查看标签', category: 'tags', description: '查看标签列表' },
      'tags.create': { name: '创建标签', category: 'tags', description: '创建新标签' },
      'tags.edit': { name: '编辑标签', category: 'tags', description: '编辑标签信息' },
      'tags.delete': { name: '删除标签', category: 'tags', description: '删除标签' }
    };
  }

  // 默认角色权限映射
  static getDefaultRolePermissions() {
    const allPermissions = Object.keys(this.getDefaultPermissions());
    
    return {
      admin: allPermissions, // 管理员拥有所有权限
      agent: [
        // 会话管理
        'conversations.view',
        'conversations.assign',
        'conversations.takeover',
        'conversations.close',
        'conversations.message',
        'conversations.note',
        'conversations.switch_agent',
        // 客户管理
        'customers.view',
        'customers.edit',
        'customers.tags',
        'customers.history',
        // 基础报表
        'reports.view',
        // 标签管理
        'tags.view',
        'tags.create',
        'tags.edit'
      ],
      viewer: [
        // 只读权限
        'conversations.view',
        'customers.view',
        'customers.history',
        'reports.view',
        'tags.view'
      ]
    };
  }

  // 获取所有可用权限
  static async getAll() {
    const permissions = this.getDefaultPermissions();
    
    // 按类别分组
    const grouped = {};
    Object.entries(permissions).forEach(([key, permission]) => {
      const category = permission.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        key,
        ...permission
      });
    });

    return {
      all: Object.entries(permissions).map(([key, permission]) => ({ key, ...permission })),
      grouped
    };
  }

  // 获取用户权限
  static async getUserPermissions(userId) {
    // 首先获取用户信息
    const userQuery = 'SELECT role FROM users WHERE id = ?';
    const [userRows] = await db.execute(userQuery, [userId]);
    
    if (userRows.length === 0) {
      throw new Error('用户不存在');
    }

    const user = userRows[0];
    const rolePermissions = this.getDefaultRolePermissions()[user.role] || [];
    
    // 检查是否有自定义权限（如果将来需要实现）
    // 目前基于角色返回权限
    const allPermissions = this.getDefaultPermissions();
    
    return rolePermissions.map(permissionKey => ({
      key: permissionKey,
      ...allPermissions[permissionKey]
    }));
  }

  // 更新用户权限（目前通过角色管理，将来可扩展为细粒度权限）
  static async updateUserPermissions(userId, permissions) {
    // 当前实现：权限通过角色管理
    // 如果需要细粒度权限控制，可以创建 user_permissions 表
    
    // 验证权限是否有效
    const allPermissions = this.getDefaultPermissions();
    const invalidPermissions = permissions.filter(p => !allPermissions[p]);
    
    if (invalidPermissions.length > 0) {
      throw new Error(`无效的权限: ${invalidPermissions.join(', ')}`);
    }

    // 目前返回成功，实际权限仍通过角色控制
    // 将来可以在这里实现用户级别的权限覆盖
    return true;
  }

  // 获取角色权限
  static async getRolePermissions(role) {
    const rolePermissions = this.getDefaultRolePermissions()[role] || [];
    const allPermissions = this.getDefaultPermissions();
    
    return rolePermissions.map(permissionKey => ({
      key: permissionKey,
      ...allPermissions[permissionKey]
    }));
  }

  // 更新角色权限（目前使用默认配置，将来可以实现动态配置）
  static async updateRolePermissions(role, permissions) {
    // 验证权限是否有效
    const allPermissions = this.getDefaultPermissions();
    const invalidPermissions = permissions.filter(p => !allPermissions[p]);
    
    if (invalidPermissions.length > 0) {
      throw new Error(`无效的权限: ${invalidPermissions.join(', ')}`);
    }

    // 目前返回成功，使用默认角色权限配置
    // 将来可以在这里实现角色权限的动态配置
    return true;
  }

  // 检查用户是否有特定权限
  static async hasPermission(userId, permission) {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.some(p => p.key === permission);
  }

  // 检查角色是否有特定权限
  static hasRolePermission(role, permission) {
    const rolePermissions = this.getDefaultRolePermissions()[role] || [];
    return rolePermissions.includes(permission);
  }

  // 获取权限统计
  static async getStats() {
    const allPermissions = this.getDefaultPermissions();
    const rolePermissions = this.getDefaultRolePermissions();
    
    // 统计各角色用户数量
    const userStatsQuery = `
      SELECT 
        role,
        COUNT(*) as user_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
      FROM users
      GROUP BY role
    `;
    
    const [userStats] = await db.execute(userStatsQuery);
    
    return {
      total_permissions: Object.keys(allPermissions).length,
      permission_categories: Object.keys(
        Object.values(allPermissions).reduce((acc, p) => {
          acc[p.category] = true;
          return acc;
        }, {})
      ).length,
      role_stats: userStats,
      role_permissions: Object.entries(rolePermissions).map(([role, perms]) => ({
        role,
        permission_count: perms.length
      }))
    };
  }
}

module.exports = PermissionService;