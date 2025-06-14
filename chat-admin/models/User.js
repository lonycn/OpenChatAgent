const db = require("../config/database");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.uuid = data.uuid;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.full_name = data.full_name;
    this.avatar_url = data.avatar_url;
    this.role = data.role || "agent";
    this.status = data.status || "active";
    this.timezone = data.timezone || "Asia/Shanghai";
    this.language = data.language || "zh-CN";
    this.last_login_at = data.last_login_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // 创建用户
  static async create(userData) {
    const {
      email,
      password,
      full_name,
      role = "agent",
      status = "active",
    } = userData;

    // 检查邮箱是否已存在
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error("邮箱已存在");
    }

    // 加密密码
    const password_hash = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_ROUNDS) || 10
    );

    const userToCreate = {
      uuid: uuidv4(),
      email,
      password_hash,
      full_name,
      role,
      status,
      timezone: userData.timezone || "Asia/Shanghai",
      language: userData.language || "zh-CN",
    };

    if (userData.avatar_url) {
      userToCreate.avatar_url = userData.avatar_url;
    }

    const userId = await db.insert("users", userToCreate);
    return await this.findById(userId);
  }

  // 根据ID查找用户
  static async findById(id) {
    const sql = "SELECT * FROM users WHERE id = ?";
    const user = await db.findOne(sql, [id]);
    return user ? new User(user) : null;
  }

  // 根据UUID查找用户
  static async findByUuid(uuid) {
    const sql = "SELECT * FROM users WHERE uuid = ?";
    const user = await db.findOne(sql, [uuid]);
    return user ? new User(user) : null;
  }

  // 根据邮箱查找用户
  static async findByEmail(email) {
    const sql = "SELECT * FROM users WHERE email = ?";
    const user = await db.findOne(sql, [email]);
    return user ? new User(user) : null;
  }

  // 验证密码
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  // 更新最后登录时间
  async updateLastLogin() {
    await db.update("users", { last_login_at: new Date() }, "id = ?", [
      this.id,
    ]);
    this.last_login_at = new Date();
  }

  // 更新用户信息
  async update(updateData) {
    const allowedFields = [
      "full_name",
      "avatar_url",
      "role",
      "status",
      "timezone",
      "language",
    ];
    const dataToUpdate = {};

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    });

    if (Object.keys(dataToUpdate).length === 0) {
      return this;
    }

    await db.update("users", dataToUpdate, "id = ?", [this.id]);

    // 更新当前实例
    Object.assign(this, dataToUpdate);
    return this;
  }

  // 修改密码
  async changePassword(newPassword) {
    const password_hash = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS) || 10
    );
    await db.update("users", { password_hash }, "id = ?", [this.id]);
    this.password_hash = password_hash;
  }

  // 获取用户列表（分页）
  static async getList(options = {}) {
    const { page = 1, limit = 20, role, status, search } = options;

    let whereClause = "1=1";
    let whereParams = [];

    if (role) {
      whereClause += " AND role = ?";
      whereParams.push(role);
    }

    if (status) {
      whereClause += " AND status = ?";
      whereParams.push(status);
    }

    if (search) {
      whereClause += " AND (full_name LIKE ? OR email LIKE ?)";
      whereParams.push(`%${search}%`, `%${search}%`);
    }

    const sql = `
      SELECT id, uuid, email, full_name, avatar_url, role, status, 
             timezone, language, last_login_at, created_at, updated_at
      FROM users 
      WHERE ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await db.paginate(sql, whereParams, page, limit);

    return {
      ...result,
      data: result.data.map((user) => new User(user)),
    };
  }

  // 获取活跃客服列表
  static async getActiveAgents() {
    const agents = await db.findMany(
      "users",
      "role IN (?, ?) AND status = ?",
      ["agent", "supervisor", "active"],
      "id, uuid, full_name, avatar_url, role",
      "full_name ASC"
    );

    return agents.map((agent) => new User(agent));
  }

  // 删除用户（软删除）
  async delete() {
    await db.update("users", { status: "suspended" }, "id = ?", [this.id]);
    this.status = "suspended";
  }

  // 转换为安全的JSON对象（不包含密码）
  toJSON() {
    const { password_hash, ...safeUser } = this;
    return safeUser;
  }

  // 转换为简单对象（用于API响应）
  toSimpleObject() {
    return {
      id: this.id,
      uuid: this.uuid,
      email: this.email,
      full_name: this.full_name,
      avatar_url: this.avatar_url,
      role: this.role,
      status: this.status,
    };
  }

  // 检查权限
  hasPermission(permission) {
    const rolePermissions = {
      admin: ["*"], // 管理员拥有所有权限
      supervisor: [
        "conversations:read",
        "conversations:write",
        "conversations:assign",
        "contacts:read",
        "contacts:write",
        "reports:read",
        "reports:export",
        "users:read",
      ],
      agent: [
        "conversations:read",
        "conversations:write",
        "contacts:read",
        "contacts:write",
      ],
      guest: ["conversations:read"],
    };

    const permissions = rolePermissions[this.role] || [];
    return permissions.includes("*") || permissions.includes(permission);
  }

  // 检查是否可以访问对话
  canAccessConversation(conversation) {
    if (this.role === "admin") return true;
    if (this.role === "supervisor") return true;
    if (conversation.assignee_id === this.id) return true;
    return false;
  }
}

module.exports = User;
