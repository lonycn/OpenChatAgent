const Database = require("../../config/database");
const bcrypt = require("bcrypt");

class UserService {
  // 获取用户列表
  static async getList(filters = {}) {
    const { page = 1, per_page = 20, search, role, status } = filters;
    const offset = (page - 1) * per_page;

    let whereClause = "WHERE 1=1";
    const params = [];

    // 搜索条件
    if (search) {
      whereClause += " AND (full_name LIKE ? OR email LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // 角色过滤
    if (role) {
      whereClause += " AND role = ?";
      params.push(role);
    }

    // 状态过滤
    if (status) {
      whereClause += " AND status = ?";
      params.push(status);
    }

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;
    const countResult = await Database.query(countQuery, params);
    const total = countResult[0].total;

    // 获取数据
    const dataQuery = `
      SELECT 
        id,
        email,
        full_name,
        role,
        status,
        avatar_url,
        last_login_at,
        created_at,
        updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = params.concat([per_page, offset]);
    const users = await Database.query(dataQuery, dataParams);

    return {
      data: users,
      meta: {
        current_page: page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    };
  }

  // 根据ID获取用户详情
  static async getById(userId) {
    const query = `
      SELECT 
        id,
        email,
        full_name,
        role,
        status,
        avatar_url,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `;

    const result = await Database.query(query, [userId]);
    
    if (result.length === 0) {
      return null;
    }

    return result[0];
  }

  // 创建用户
  static async create(userData) {
    const { full_name, email, password, role = "agent", status = "active" } = userData;
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (full_name, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const result = await Database.query(query, [
      full_name,
      email,
      hashedPassword,
      role,
      status,
    ]);

    return await this.getById(result.insertId);
  }

  // 更新用户
  static async update(userId, updateData) {
    const { full_name, email, role, status, avatar_url } = updateData;
    
    const query = `
      UPDATE users 
      SET full_name = ?, email = ?, role = ?, status = ?, avatar_url = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await Database.query(query, [full_name, email, role, status, avatar_url, userId]);
    
    return await this.getById(userId);
  }

  // 删除用户
  static async delete(userId) {
    const query = "DELETE FROM users WHERE id = ?";
    await Database.query(query, [userId]);
  }

  // 重置密码
  static async resetPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const query = `
      UPDATE users 
      SET password = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await Database.query(query, [hashedPassword, userId]);
  }

  // 获取用户统计信息
  static async getStats(userId) {
    // 获取用户基本信息
    const user = await this.getById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    // 获取会话统计
    const conversationStatsQuery = `
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conversations,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conversations,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations
      FROM conversations
      WHERE assignee_id = ?
    `;
    const conversationStats = await Database.query(conversationStatsQuery, [userId]);

    // 获取消息统计
    const messageStatsQuery = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_messages,
        COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as week_messages
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.assignee_id = ? AND m.sender_type = 'agent'
    `;
    const messageStats = await Database.query(messageStatsQuery, [userId]);

    // 获取平均响应时间（简化计算）
    const responseTimeQuery = `
      SELECT 
        AVG(TIMESTAMPDIFF(MINUTE, c.created_at, 
          (SELECT MIN(m.created_at) 
           FROM messages m 
           WHERE m.conversation_id = c.id AND m.sender_type = 'agent')
        )) as avg_response_time_minutes
      FROM conversations c
      WHERE c.assignee_id = ? 
        AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.conversation_id = c.id AND m.sender_type = 'agent'
        )
    `;
    const responseTimeStats = await Database.query(responseTimeQuery, [userId]);

    return {
      user_info: user,
      conversation_stats: conversationStats[0],
      message_stats: messageStats[0],
      avg_response_time_minutes: responseTimeStats[0].avg_response_time_minutes || 0,
    };
  }

  // 更新最后登录时间
  static async updateLastLogin(userId) {
    const query = `
      UPDATE users 
      SET last_login_at = NOW()
      WHERE id = ?
    `;
    await Database.query(query, [userId]);
  }

  // 获取用户统计
  static async getStats() {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'agent' THEN 1 END) as agent_count,
        COUNT(CASE WHEN role = 'viewer' THEN 1 END) as viewer_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_today,
        COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_this_week,
        COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as new_this_month,
        COUNT(CASE WHEN last_login_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as active_last_24h,
        COUNT(CASE WHEN last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_last_week
      FROM users
    `;
    
    const [statsResult] = await Database.query(statsQuery);
    const stats = statsResult[0];

    // 获取最活跃的用户（基于最近登录）
    const activeUsersQuery = `
      SELECT 
        id,
        email,
        full_name,
        role,
        last_login_at,
        created_at
      FROM users
      WHERE status = 'active' AND last_login_at IS NOT NULL
      ORDER BY last_login_at DESC
      LIMIT 10
    `;
    
    const activeUsers = await Database.query(activeUsersQuery);

    // 获取用户增长趋势（最近30天）
    const growthTrendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const growthTrend = await Database.query(growthTrendQuery);

    // 获取角色分布统计
    const roleDistributionQuery = `
      SELECT 
        role,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentage
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `;
    
    const roleDistribution = await Database.query(roleDistributionQuery);

    return {
      ...stats,
      active_users: activeUsers,
      growth_trend: growthTrend,
      role_distribution: roleDistribution
    };
  }

  // 验证用户密码
  static async verifyPassword(userId, password) {
    const query = 'SELECT password_hash FROM users WHERE id = ?';
    const [rows] = await Database.query(query, [userId]);
    
    if (rows.length === 0) {
      return false;
    }

    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, rows[0].password_hash);
  }

  // 修改用户密码
  static async changePassword(userId, newPassword) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const query = `
      UPDATE users 
      SET password_hash = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    const [result] = await Database.query(query, [hashedPassword, userId]);
    return result.affectedRows > 0;
  }
}

module.exports = UserService;