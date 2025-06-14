const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chat_admin',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 数据库工具类
class Database {
  constructor() {
    this.pool = pool;
  }

  // 执行查询
  async query(sql, params = []) {
    try {
      // 如果有参数，使用字符串替换而不是prepared statements
      if (params && params.length > 0) {
        // 简单的参数替换，将?替换为实际值
        let processedSql = sql;
        params.forEach((param, index) => {
          const value = typeof param === 'string' ? `'${param.replace(/'/g, "\\'")}'` : param;
          processedSql = processedSql.replace('?', value);
        });
        const [rows] = await this.pool.execute(processedSql);
        return rows;
      } else {
        const [rows] = await this.pool.execute(sql);
        return rows;
      }
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }

  // 执行事务
  async transaction(callback) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 分页查询
  async paginate(sql, params = [], page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_table`;
    const countResult = await this.query(countSql, params);
    const total = countResult[0].total;

    // 获取分页数据
    const dataSql = `${sql} LIMIT ${parseInt(limit)} OFFSET ${parseInt(
      offset
    )}`;
    const data = await this.query(dataSql, params);

    return {
      data,
      meta: {
        current_page: page,
        per_page: limit,
        total,
        last_page: Math.ceil(total / limit),
        from: offset + 1,
        to: Math.min(offset + limit, total),
      },
    };
  }

  // 获取单条记录
  async findOne(sql, params = []) {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  // 插入记录
  async insert(table, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);
    return result;
  }

  // 更新记录
  async update(table, data, where, whereParams = []) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    const params = [...values, ...whereParams];
    const result = await this.query(sql, params);
    return result;
  }

  // 删除记录
  async delete(table, where, whereParams = []) {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    const result = await this.query(sql, whereParams);
    return result;
  }

  // 检查连接
  async checkConnection() {
    try {
      await this.query('SELECT 1');
      console.log('Database connection successful');
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  // 关闭连接池
  async close() {
    await this.pool.end();
  }
}

// 创建数据库实例
const database = new Database();

// 测试连接
database.checkConnection();

module.exports = database;
