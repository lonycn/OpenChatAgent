const db = require('../../config/database');

class TagService {
  // 获取标签列表
  static async getList(filters = {}) {
    const { page = 1, per_page = 20, search } = filters;
    const offset = (page - 1) * per_page;

    let whereClause = '';
    let queryParams = [];
    let countParams = [];

    if (search) {
      whereClause = 'WHERE name LIKE ?';
      const searchParam = `%${search}%`;
      queryParams.push(searchParam);
      countParams.push(searchParam);
    }

    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT name) as total
      FROM customer_tags
      ${whereClause}
    `;
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    // 获取标签列表（去重并统计使用次数）
    const query = `
      SELECT 
        name,
        COUNT(*) as usage_count,
        MIN(created_at) as first_used,
        MAX(created_at) as last_used
      FROM customer_tags
      ${whereClause}
      GROUP BY name
      ORDER BY usage_count DESC, name ASC
      LIMIT ? OFFSET ?
    `;
    
    queryParams.push(per_page, offset);
    const [rows] = await db.execute(query, queryParams);

    return {
      data: rows,
      meta: {
        current_page: page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page)
      }
    };
  }

  // 根据名称获取标签详情
  static async getByName(name) {
    const query = `
      SELECT 
        name,
        COUNT(*) as usage_count,
        MIN(created_at) as first_used,
        MAX(created_at) as last_used
      FROM customer_tags
      WHERE name = ?
      GROUP BY name
    `;
    
    const [rows] = await db.execute(query, [name]);
    return rows[0] || null;
  }

  // 根据ID获取标签（这里ID实际上是name，因为现有表结构没有独立的tags表）
  static async getById(tagName) {
    return await this.getByName(tagName);
  }

  // 创建标签（实际上是为客户添加标签）
  static async create(tagData) {
    // 由于现有表结构，这个方法主要用于验证标签名称的唯一性
    // 实际的标签创建会在客户标签关联时进行
    const { name } = tagData;
    
    // 检查标签是否已存在
    const existing = await this.getByName(name);
    if (existing) {
      const error = new Error('标签已存在');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }

    return {
      name,
      usage_count: 0,
      first_used: null,
      last_used: null
    };
  }

  // 更新标签（重命名所有使用该标签的记录）
  static async update(oldName, updateData) {
    const { name: newName } = updateData;
    
    if (oldName === newName) {
      return await this.getByName(oldName);
    }

    // 检查新名称是否已存在
    const existing = await this.getByName(newName);
    if (existing) {
      const error = new Error('标签名称已存在');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }

    // 更新所有使用旧名称的标签记录
    const updateQuery = `
      UPDATE customer_tags 
      SET tag_name = ?
      WHERE tag_name = ?
    `;
    
    const [result] = await db.execute(updateQuery, [newName, oldName]);
    
    if (result.affectedRows === 0) {
      return null;
    }

    return await this.getByName(newName);
  }

  // 删除标签（删除所有使用该标签的记录）
  static async delete(tagName) {
    const deleteQuery = `
      DELETE FROM customer_tags 
      WHERE tag_name = ?
    `;
    
    const [result] = await db.execute(deleteQuery, [tagName]);
    return result.affectedRows > 0;
  }

  // 获取标签统计
  static async getStats() {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT tag_name) as total_tags,
        COUNT(*) as total_usages,
        COUNT(DISTINCT customer_id) as customers_with_tags
      FROM customer_tags
    `;
    
    const [rows] = await db.execute(statsQuery);
    const stats = rows[0];

    // 获取最受欢迎的标签
    const popularTagsQuery = `
      SELECT 
        tag_name as name,
        COUNT(*) as usage_count
      FROM customer_tags
      GROUP BY tag_name
      ORDER BY usage_count DESC
      LIMIT 10
    `;
    
    const [popularTags] = await db.execute(popularTagsQuery);

    return {
      ...stats,
      popular_tags: popularTags
    };
  }

  // 为客户添加标签
  static async addToCustomer(customerId, tagName) {
    const insertQuery = `
      INSERT INTO customer_tags (customer_id, tag_name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE tag_name = tag_name
    `;
    
    const [result] = await db.execute(insertQuery, [customerId, tagName]);
    return result.insertId || result.affectedRows > 0;
  }

  // 从客户移除标签
  static async removeFromCustomer(customerId, tagName) {
    const deleteQuery = `
      DELETE FROM customer_tags 
      WHERE customer_id = ? AND tag_name = ?
    `;
    
    const [result] = await db.execute(deleteQuery, [customerId, tagName]);
    return result.affectedRows > 0;
  }

  // 获取客户的所有标签
  static async getCustomerTags(customerId) {
    const query = `
      SELECT tag_name as name, created_at
      FROM customer_tags
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `;
    
    const [rows] = await db.execute(query, [customerId]);
    return rows;
  }

  // 设置客户标签（替换所有现有标签）
  static async setCustomerTags(customerId, tagNames) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // 删除现有标签
      await connection.execute(
        'DELETE FROM customer_tags WHERE customer_id = ?',
        [customerId]
      );

      // 添加新标签
      if (tagNames && tagNames.length > 0) {
        const insertQuery = `
          INSERT INTO customer_tags (customer_id, tag_name)
          VALUES ${tagNames.map(() => '(?, ?)').join(', ')}
        `;
        
        const params = [];
        tagNames.forEach(tagName => {
          params.push(customerId, tagName);
        });
        
        await connection.execute(insertQuery, params);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = TagService;