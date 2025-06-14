const db = require("../../config/database");
const { v4: uuidv4 } = require("uuid");

class ConversationService {
  // 获取会话列表
  static async getList(filters = {}) {
    const {
      page = 1,
      per_page = 20,
      status,
      assignee_id,
      inbox_id,
      priority,
      channel_type,
      labels,
      search,
      current_agent_type,
    } = filters;

    let whereClause = "1=1";
    let whereParams = [];
    let joins = `
      LEFT JOIN customer_contacts cc ON c.contact_id = cc.id
      LEFT JOIN users u ON c.assignee_id = u.id
      LEFT JOIN inboxes i ON c.inbox_id = i.id
              LEFT JOIN (
        SELECT conversation_id, content, created_at
        FROM messages m1
        WHERE m1.id = (
          SELECT MAX(m2.id)
          FROM messages m2
          WHERE m2.conversation_id = m1.conversation_id
        )
      ) last_msg ON c.id = last_msg.conversation_id
    `;

    // 状态筛选
    if (status && status.length > 0) {
      const statusPlaceholders = status.map(() => "?").join(",");
      whereClause += ` AND c.status IN (${statusPlaceholders})`;
      whereParams.push(...status);
    }

    // 客服筛选
    if (assignee_id) {
      whereClause += " AND c.assignee_id = ?";
      whereParams.push(assignee_id);
    }

    // 收件箱筛选
    if (inbox_id) {
      whereClause += " AND c.inbox_id = ?";
      whereParams.push(inbox_id);
    }

    // 优先级筛选
    if (priority && priority.length > 0) {
      const priorityPlaceholders = priority.map(() => "?").join(",");
      whereClause += ` AND c.priority IN (${priorityPlaceholders})`;
      whereParams.push(...priority);
    }

    // 渠道筛选
    if (channel_type && channel_type.length > 0) {
      const channelPlaceholders = channel_type.map(() => "?").join(",");
      whereClause += ` AND c.channel_type IN (${channelPlaceholders})`;
      whereParams.push(...channel_type);
    }

    // AI/人工代理筛选
    if (current_agent_type) {
      whereClause += " AND c.current_agent_type = ?";
      whereParams.push(current_agent_type);
    }

    // 搜索
    if (search) {
      whereClause +=
        " AND (cc.name LIKE ? OR cc.email LIKE ? OR last_msg.content LIKE ?)";
      const searchTerm = `%${search}%`;
      whereParams.push(searchTerm, searchTerm, searchTerm);
    }

    const sql = `
      SELECT 
        c.id,
        c.uuid,
        c.status,
        c.priority,
        c.channel_type,
        c.current_agent_type,
        c.agent_switched_at,
        0 as unread_count,
        c.created_at,
        c.updated_at,
        cc.id as contact_id,
        cc.uuid as contact_identifier,
        cc.name as contact_name,
        cc.email as contact_email,
        cc.avatar_url as contact_avatar,
        u.id as assignee_id,
        u.full_name as assignee_name,
        u.email as assignee_email,
        i.name as inbox_name,
        i.channel_type as inbox_channel_type,
        last_msg.content as last_message_content,
        last_msg.created_at as last_message_at
      FROM conversations c
      ${joins}
      WHERE ${whereClause}
      ORDER BY c.updated_at DESC
    `;

    try {
      const result = await db.paginate(sql, whereParams, page, per_page);

      // 格式化数据
      const formattedData = result.data.map((row) => ({
        id: row.id,
        uuid: row.uuid,
        status: row.status,
        priority: row.priority,
        channel_type: row.channel_type,
        current_agent_type: row.current_agent_type,
        agent_switched_at: row.agent_switched_at,
        unread_count: row.unread_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
        contact: {
          id: row.contact_id,
          identifier: row.contact_identifier,
          name: row.contact_name,
          email: row.contact_email,
          avatar_url: row.contact_avatar,
        },
        assignee: row.assignee_id
          ? {
              id: row.assignee_id,
              full_name: row.assignee_name,
              email: row.assignee_email,
            }
          : null,
        inbox: {
          name: row.inbox_name,
          channel_type: row.inbox_channel_type,
        },
        last_message: row.last_message_content
          ? {
              content: row.last_message_content,
              created_at: row.last_message_at,
            }
          : null,
      }));

      return {
        ...result,
        data: formattedData,
      };
    } catch (error) {
      console.error("ConversationService.getList error:", error);
      throw error;
    }
  }

  // 获取会话详情
  static async getById(conversationId) {
    const sql = `
      SELECT 
        c.*,
        cc.id as contact_id,
        cc.uuid as contact_identifier,
        cc.name as contact_name,
        cc.email as contact_email,
        cc.phone as contact_phone,
        cc.avatar_url as contact_avatar,
        cc.custom_attributes as contact_attributes,
        u.id as assignee_id,
        u.full_name as assignee_name,
        u.email as assignee_email,
        u.avatar_url as assignee_avatar,
        i.name as inbox_name,
        i.channel_type as inbox_channel_type
      FROM conversations c
      LEFT JOIN customer_contacts cc ON c.contact_id = cc.id
      LEFT JOIN users u ON c.assignee_id = u.id
      LEFT JOIN inboxes i ON c.inbox_id = i.id
      WHERE c.id = ?
    `;

    try {
      const [rows] = await db.execute(sql, [conversationId]);

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        id: row.id,
        uuid: row.uuid,
        status: row.status,
        priority: row.priority,
        channel_type: row.channel_type,
        current_agent_type: row.current_agent_type,
        agent_switched_at: row.agent_switched_at,
        unread_count: row.unread_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
        contact: {
          id: row.contact_id,
          identifier: row.contact_identifier,
          name: row.contact_name,
          email: row.contact_email,
          phone: row.contact_phone,
          avatar_url: row.contact_avatar,
          custom_attributes: row.contact_attributes
            ? JSON.parse(row.contact_attributes)
            : {},
        },
        assignee: row.assignee_id
          ? {
              id: row.assignee_id,
              full_name: row.assignee_name,
              email: row.assignee_email,
              avatar_url: row.assignee_avatar,
            }
          : null,
        inbox: {
          name: row.inbox_name,
          channel_type: row.inbox_channel_type,
        },
      };
    } catch (error) {
      console.error("ConversationService.getById error:", error);
      throw error;
    }
  }

  // 分配会话
  static async assign(conversationId, assigneeId) {
    const sql = `
      UPDATE conversations 
      SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      const [result] = await db.execute(sql, [assigneeId, conversationId]);

      if (result.affectedRows === 0) {
        throw new Error("Conversation not found");
      }

      return { success: true };
    } catch (error) {
      console.error("ConversationService.assign error:", error);
      throw error;
    }
  }

  // 更新会话状态
  static async updateStatus(conversationId, status) {
    const sql = `
      UPDATE conversations 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      const [result] = await db.execute(sql, [status, conversationId]);

      if (result.affectedRows === 0) {
        throw new Error("Conversation not found");
      }

      return { success: true };
    } catch (error) {
      console.error("ConversationService.updateStatus error:", error);
      throw error;
    }
  }

  // 切换代理类型
  static async switchAgent(conversationId, agentType) {
    const sql = `
      UPDATE conversations 
      SET current_agent_type = ?, agent_switched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      const [result] = await db.execute(sql, [agentType, conversationId]);

      if (result.affectedRows === 0) {
        throw new Error("Conversation not found");
      }

      return { success: true, agent_type: agentType };
    } catch (error) {
      console.error("ConversationService.switchAgent error:", error);
      throw error;
    }
  }

  // 获取会话消息列表
  static async getMessages(conversationId, page = 1, per_page = 50) {
    const sql = `
      SELECT 
        m.*,
        u.full_name as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id AND m.sender_type = 'agent'
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
    `;

    try {
      const result = await db.paginate(sql, [conversationId], page, per_page);

      // 格式化消息数据
      const formattedData = result.data.map((msg) => ({
        id: msg.id,
        uuid: msg.uuid,
        conversation_id: msg.conversation_id,
        sender_type: msg.sender_type,
        sender: msg.sender_id
          ? {
              id: msg.sender_id,
              full_name: msg.sender_name,
              avatar_url: msg.sender_avatar,
            }
          : null,
        content: msg.content,
        message_type: msg.message_type,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
        is_private: msg.is_private,
        created_at: msg.created_at,
      }));

      return {
        ...result,
        data: formattedData,
      };
    } catch (error) {
      console.error("ConversationService.getMessages error:", error);
      throw error;
    }
  }

  // 接管会话
  static async takeover(conversationId, userId) {
    try {


      // 检查会话是否存在
      const conversation = await this.getById(conversationId);
      if (!conversation) {
        throw new Error("会话不存在");
      }

      const now = new Date();

      // 更新会话分配和代理类型
      await db.query(
        `UPDATE conversations SET 
          assignee_id = ?, 
          current_agent_type = 'human',
          agent_switched_at = ?,
          status = CASE WHEN status = 'open' THEN 'pending' ELSE status END,
          updated_at = ?
        WHERE id = ?`,
        [userId, now, now, conversationId]
      );

      return await this.getById(conversationId);
    } catch (error) {
      console.error("ConversationService.takeover error:", error);
      throw error;
    }
  }

  // 更新会话状态
  static async updateStatus(conversationId, status, userId) {
    try {


      // 检查会话是否存在
      const conversation = await this.getById(conversationId);
      if (!conversation) {
        throw new Error("会话不存在");
      }

      const now = new Date();

      // 更新会话状态
      await db.query(
        `UPDATE conversations SET 
          status = ?,
          updated_at = ?
        WHERE id = ?`,
        [status, now, conversationId]
      );

      return await this.getById(conversationId);
    } catch (error) {
      console.error("ConversationService.updateStatus error:", error);
      throw error;
    }
  }

  // 切换代理类型
  static async switchAgentType(conversationId, agentType, userId) {
    try {


      // 检查会话是否存在
      const conversation = await this.getById(conversationId);
      if (!conversation) {
        throw new Error("会话不存在");
      }

      const now = new Date();
      let updateFields = {
        current_agent_type: agentType,
        agent_switched_at: now,
        updated_at: now
      };

      // 如果切换到人工，分配给当前用户
      if (agentType === 'human') {
        updateFields.assignee_id = userId;
        updateFields.status = 'pending';
      }

      const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateFields);
      values.push(conversationId);

      await db.query(
        `UPDATE conversations SET ${setClause} WHERE id = ?`,
        values
      );

      return await this.getById(conversationId);
    } catch (error) {
      console.error("ConversationService.switchAgentType error:", error);
      throw error;
    }
  }

  // 添加私有备注
  static async addNote(conversationId, content, userId) {
    try {


      // 检查会话是否存在
      const conversation = await this.getById(conversationId);
      if (!conversation) {
        throw new Error("会话不存在");
      }

      const messageUuid = uuidv4();
      const now = new Date();

      // 插入私有备注消息
      await db.query(
        `INSERT INTO messages (
          uuid, conversation_id, sender_id, sender_type, content, 
          message_type, is_private, created_at
        ) VALUES (?, ?, ?, 'agent', ?, 'text', true, ?)`,
        [
          messageUuid,
          conversationId,
          userId,
          content,
          now,
        ]
      );

      return {
        uuid: messageUuid,
        conversation_id: conversationId,
        sender_id: userId,
        sender_type: "agent",
        content,
        message_type: "text",
        is_private: true,
        created_at: now,
      };
    } catch (error) {
      console.error("ConversationService.addNote error:", error);
      throw error;
    }
  }

  // 发送消息
  static async sendMessage(
    conversationId,
    content,
    senderId,
    messageType = "text",
    isPrivate = false
  ) {
    try {


      // 检查会话是否存在
      const conversation = await this.getById(conversationId);
      if (!conversation) {
        throw new Error("会话不存在");
      }

      const messageUuid = uuidv4();
      const now = new Date();

      // 插入消息
      await db.query(
        `INSERT INTO messages (
          uuid, conversation_id, sender_id, sender_type, content, 
          message_type, is_private, created_at
        ) VALUES (?, ?, ?, 'agent', ?, ?, ?, ?)`,
        [
          messageUuid,
          conversationId,
          senderId,
          content,
          messageType,
          isPrivate,
          now,
        ]
      );

      // 更新会话最后活动时间
      await db.query(
        "UPDATE conversations SET last_activity_at = ? WHERE id = ?",
        [now, conversationId]
      );

      return {
        uuid: messageUuid,
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: "agent",
        content,
        message_type: messageType,
        is_private: isPrivate,
        created_at: now,
      };
    } catch (error) {
      console.error("ConversationService.sendMessage error:", error);
      throw error;
    }
  }

  // 获取统计数据
  static async getStats(userId = null) {
    let whereClause = "1=1";
    let whereParams = [];

    if (userId) {
      whereClause = "assignee_id = ?";
      whereParams.push(userId);
    }

    const sql = `
      SELECT 
        COUNT(*) as total_conversations,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_conversations,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_conversations,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_conversations,
        SUM(CASE WHEN current_agent_type = 'ai' THEN 1 ELSE 0 END) as ai_conversations,
        SUM(CASE WHEN current_agent_type = 'human' THEN 1 ELSE 0 END) as human_conversations,
        0 as total_unread
      FROM conversations
      WHERE ${whereClause}
    `;

    try {
      const [rows] = await db.execute(sql, whereParams);
      return rows[0];
    } catch (error) {
      console.error("ConversationService.getStats error:", error);
      throw error;
    }
  }
}

module.exports = ConversationService;
