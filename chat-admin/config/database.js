const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

// 加载环境变量
dotenv.config({ path: path.join(__dirname, "../.env") });

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "chat_admin",
  charset: process.env.DB_CHARSET || "utf8mb4",
  timezone: process.env.DB_TIMEZONE || "+08:00",

  // 连接池配置
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  reconnect: true,
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
      const [rows] = await this.pool.execute(sql, params);
      return rows;
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
        total_count: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // 插入数据并返回ID
  async insert(table, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => "?").join(", ");

    const sql = `INSERT INTO ${table} (${fields.join(
      ", "
    )}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);

    return result.insertId;
  }

  // 更新数据
  async update(table, data, where, whereParams = []) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field) => `${field} = ?`).join(", ");

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    const result = await this.query(sql, [...values, ...whereParams]);

    return result.affectedRows;
  }

  // 删除数据
  async delete(table, where, whereParams = []) {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    const result = await this.query(sql, whereParams);

    return result.affectedRows;
  }

  // 查找单条记录
  async findOne(table, where, whereParams = [], fields = "*") {
    const sql = `SELECT ${fields} FROM ${table} WHERE ${where} LIMIT 1`;
    const result = await this.query(sql, whereParams);

    return result.length > 0 ? result[0] : null;
  }

  // 查找多条记录
  async findMany(
    table,
    where = "1=1",
    whereParams = [],
    fields = "*",
    orderBy = "id DESC",
    limit = null
  ) {
    let sql = `SELECT ${fields} FROM ${table} WHERE ${where} ORDER BY ${orderBy}`;

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    return await this.query(sql, whereParams);
  }

  // 检查连接状态
  async checkConnection() {
    try {
      await this.query("SELECT 1");
      return true;
    } catch (error) {
      console.error("Database connection check failed:", error);
      return false;
    }
  }

  // 执行查询（兼容方法名）
  async execute(sql, params = []) {
    return await this.pool.execute(sql, params);
  }

  // 关闭连接池
  async close() {
    await this.pool.end();
  }
}

// 创建数据库实例
const db = new Database();

// 测试数据库连接
db.checkConnection().then((isConnected) => {
  if (isConnected) {
    console.log("✅ Database connected successfully");
  } else {
    console.error("❌ Database connection failed");
  }
});

module.exports = db;
