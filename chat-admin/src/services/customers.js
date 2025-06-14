const Database = require("../../config/database");

class CustomerService {
  // 获取客户列表
  static async getList(filters = {}) {
    const { page = 1, per_page = 20, search, tags } = filters;
    const offset = (page - 1) * per_page;

    let whereClause = "WHERE 1=1";
    const params = [];

    // 搜索条件
    if (search) {
      whereClause += " AND (cc.name LIKE ? OR cc.email LIKE ? OR cc.phone LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 标签过滤
    if (tags && tags.length > 0) {
      const tagPlaceholders = tags.map(() => "?").join(",");
      whereClause += ` AND cc.id IN (
        SELECT DISTINCT customer_id FROM customer_tags 
        WHERE tag_name IN (${tagPlaceholders})
      )`;
      params.push(...tags);
    }

    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT cc.id) as total
      FROM customer_contacts cc
      ${whereClause}
    `;
    const countResult = await Database.query(countQuery, params);
    const total = countResult[0].total;

    // 获取数据
    const dataQuery = `
      SELECT 
        cc.id,
        cc.name,
        cc.email,
        cc.phone,
        cc.avatar_url,
        cc.created_at,
        cc.updated_at,
        GROUP_CONCAT(DISTINCT ct.tag_name) as tags,
        COUNT(DISTINCT c.id) as conversation_count,
        MAX(c.updated_at) as last_conversation_at
      FROM customer_contacts cc
      LEFT JOIN customer_tags ct ON cc.id = ct.customer_id
      LEFT JOIN conversations c ON cc.id = c.customer_id
      ${whereClause}
      GROUP BY cc.id
      ORDER BY cc.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...params, per_page, offset];
    const customers = await Database.query(dataQuery, dataParams);

    // 格式化数据
    const formattedCustomers = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      avatar_url: customer.avatar_url,
      tags: customer.tags ? customer.tags.split(",") : [],
      conversation_count: customer.conversation_count,
      last_conversation_at: customer.last_conversation_at,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    }));

    return {
      data: formattedCustomers,
      meta: {
        current_page: page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    };
  }

  // 根据ID获取客户详情
  static async getById(customerId) {
    const query = `
      SELECT 
        cc.id,
        cc.name,
        cc.email,
        cc.phone,
        cc.avatar_url,
        cc.created_at,
        cc.updated_at,
        GROUP_CONCAT(DISTINCT ct.tag_name) as tags
      FROM customer_contacts cc
      LEFT JOIN customer_tags ct ON cc.id = ct.customer_id
      WHERE cc.id = ?
      GROUP BY cc.id
    `;

    const result = await Database.query(query, [customerId]);
    
    if (result.length === 0) {
      return null;
    }

    const customer = result[0];
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      avatar_url: customer.avatar_url,
      tags: customer.tags ? customer.tags.split(",") : [],
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    };
  }

  // 更新客户信息
  static async update(customerId, updateData) {
    const { name, email, phone, avatar_url } = updateData;
    
    const query = `
      UPDATE customer_contacts 
      SET name = ?, email = ?, phone = ?, avatar_url = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await Database.query(query, [name, email, phone, avatar_url, customerId]);
    
    return await this.getById(customerId);
  }

  // 获取客户的会话历史
  static async getConversations(customerId, filters = {}) {
    const { page = 1, per_page = 20 } = filters;
    const offset = (page - 1) * per_page;

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM conversations c
      WHERE c.customer_id = ?
    `;
    const countResult = await Database.query(countQuery, [customerId]);
    const total = countResult[0].total;

    // 获取数据
    const dataQuery = `
      SELECT 
        c.id,
        c.status,
        c.priority,
        c.channel_type,
        c.agent_type,
        c.assignee_id,
        c.created_at,
        c.updated_at,
        u.name as assignee_name,
        i.name as inbox_name,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.conversation_id = c.id
        ) as message_count,
        (
          SELECT m.content 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_content,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_at
      FROM conversations c
      LEFT JOIN users u ON c.assignee_id = u.id
      LEFT JOIN inboxes i ON c.inbox_id = i.id
      WHERE c.customer_id = ?
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const conversations = await Database.query(dataQuery, [customerId, per_page, offset]);

    return {
      data: conversations,
      meta: {
        current_page: page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    };
  }

  // 管理客户标签
  static async manageTags(customerId, tags, action) {
    if (action === "add") {
      // 添加标签
      for (const tag of tags) {
        const query = `
          INSERT IGNORE INTO customer_tags (customer_id, tag_name, created_at)
          VALUES (?, ?, NOW())
        `;
        await Database.query(query, [customerId, tag]);
      }
    } else if (action === "remove") {
      // 移除标签
      const placeholders = tags.map(() => "?").join(",");
      const query = `
        DELETE FROM customer_tags 
        WHERE customer_id = ? AND tag_name IN (${placeholders})
      `;
      await Database.query(query, [customerId, ...tags]);
    }

    return await this.getById(customerId);
  }

  // 获取客户统计
  static async getStats() {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as customers_with_email,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as customers_with_phone,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_today,
        COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_this_week,
        COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as new_this_month
      FROM customer_contacts
    `;
    
    const [statsResult] = await Database.query(statsQuery);
    const stats = statsResult[0];

    // 获取客户标签统计
    const tagStatsQuery = `
      SELECT 
        COUNT(DISTINCT customer_id) as customers_with_tags,
        COUNT(DISTINCT tag_name) as unique_tags,
        COUNT(*) as total_tag_assignments
      FROM customer_tags
    `;
    
    const [tagStatsResult] = await Database.query(tagStatsQuery);
    const tagStats = tagStatsResult[0];

    // 获取最活跃的客户（基于会话数量）
    const activeCustomersQuery = `
      SELECT 
        cc.id,
        cc.name,
        cc.email,
        COUNT(c.id) as conversation_count,
        MAX(c.updated_at) as last_conversation_at
      FROM customer_contacts cc
      LEFT JOIN conversations c ON cc.id = c.customer_id
      GROUP BY cc.id, cc.name, cc.email
      HAVING conversation_count > 0
      ORDER BY conversation_count DESC, last_conversation_at DESC
      LIMIT 10
    `;
    
    const activeCustomers = await Database.query(activeCustomersQuery);

    // 获取客户增长趋势（最近30天）
    const growthTrendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_customers
      FROM customer_contacts
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const growthTrend = await Database.query(growthTrendQuery);

    return {
      ...stats,
      ...tagStats,
      active_customers: activeCustomers,
      growth_trend: growthTrend
    };
  }
}

module.exports = CustomerService;