const Database = require("../../config/database");

class ReportService {
  // 获取概览统计
  static async getOverview(startDate, endDate) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    // 总会话数
    const totalConversationsQuery = `
      SELECT COUNT(*) as total
      FROM conversations
      ${dateFilter.where}
    `;
    const totalConversations = await Database.query(totalConversationsQuery, dateFilter.params);

    // 活跃会话数
    const activeConversationsQuery = `
      SELECT COUNT(*) as total
      FROM conversations
      WHERE status = 'open' ${dateFilter.where ? 'AND ' + dateFilter.where.replace('WHERE ', '') : ''}
    `;
    const activeConversations = await Database.query(activeConversationsQuery, dateFilter.params);

    // 已解决会话数
    const resolvedConversationsQuery = `
      SELECT COUNT(*) as total
      FROM conversations
      WHERE status = 'resolved' ${dateFilter.where ? 'AND ' + dateFilter.where.replace('WHERE ', '') : ''}
    `;
    const resolvedConversations = await Database.query(resolvedConversationsQuery, dateFilter.params);

    // 总消息数
    const totalMessagesQuery = `
      SELECT COUNT(*) as total
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      ${dateFilter.where}
    `;
    const totalMessages = await Database.query(totalMessagesQuery, dateFilter.params);

    // 平均响应时间
    const avgResponseTimeQuery = `
      SELECT 
        AVG(TIMESTAMPDIFF(MINUTE, c.created_at, 
          (SELECT MIN(m.created_at) 
           FROM messages m 
           WHERE m.conversation_id = c.id AND m.sender_type = 'agent')
        )) as avg_response_time
      FROM conversations c
      ${dateFilter.where}
        AND EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.conversation_id = c.id AND m.sender_type = 'agent'
        )
    `;
    const avgResponseTime = await Database.query(avgResponseTimeQuery, dateFilter.params);

    // 客服在线数
    const onlineAgentsQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE role = 'agent' AND status = 'active'
    `;
    const onlineAgents = await Database.query(onlineAgentsQuery);

    return {
      total_conversations: totalConversations[0].total,
      active_conversations: activeConversations[0].total,
      resolved_conversations: resolvedConversations[0].total,
      total_messages: totalMessages[0].total,
      avg_response_time_minutes: Math.round(avgResponseTime[0].avg_response_time || 0),
      online_agents: onlineAgents[0].total,
    };
  }

  // 获取会话统计
  static async getConversationStats(startDate, endDate, groupBy = "day") {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const groupByClause = this.buildGroupByClause(groupBy);
    
    const query = `
      SELECT 
        ${groupByClause.select} as period,
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conversations,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conversations,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations,
        COUNT(CASE WHEN agent_type = 'ai' THEN 1 END) as ai_conversations,
        COUNT(CASE WHEN agent_type = 'human' THEN 1 END) as human_conversations
      FROM conversations
      ${dateFilter.where}
      GROUP BY ${groupByClause.group}
      ORDER BY period
    `;

    const result = await Database.query(query, dateFilter.params);
    return result;
  }

  // 获取客服绩效统计
  static async getAgentPerformance(startDate, endDate, agentId) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    let whereClause = dateFilter.where;
    let params = [...dateFilter.params];

    if (agentId) {
      whereClause += whereClause ? " AND assignee_id = ?" : "WHERE assignee_id = ?";
      params.push(agentId);
    }

    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(c.id) as total_conversations,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END) as resolved_conversations,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END) as closed_conversations,
        AVG(TIMESTAMPDIFF(MINUTE, c.created_at, 
          (SELECT MIN(m.created_at) 
           FROM messages m 
           WHERE m.conversation_id = c.id AND m.sender_type = 'agent')
        )) as avg_response_time,
        COUNT(DISTINCT DATE(c.created_at)) as active_days,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.conversation_id IN (
            SELECT id FROM conversations WHERE assignee_id = u.id
          ) AND m.sender_type = 'agent'
        ) as total_messages
      FROM users u
      LEFT JOIN conversations c ON u.id = c.assignee_id ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
      WHERE u.role = 'agent'
      GROUP BY u.id, u.name, u.email
      ORDER BY total_conversations DESC
    `;

    const result = await Database.query(query, params);
    
    // 计算绩效指标
    return result.map(agent => ({
      ...agent,
      avg_response_time: Math.round(agent.avg_response_time || 0),
      resolution_rate: agent.total_conversations > 0 
        ? Math.round((agent.resolved_conversations / agent.total_conversations) * 100) 
        : 0,
      daily_avg_conversations: agent.active_days > 0 
        ? Math.round(agent.total_conversations / agent.active_days) 
        : 0,
    }));
  }

  // 获取响应时间统计
  static async getResponseTimeStats(startDate, endDate, groupBy = "day") {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const groupByClause = this.buildGroupByClause(groupBy);
    
    const query = `
      SELECT 
        ${groupByClause.select} as period,
        AVG(TIMESTAMPDIFF(MINUTE, c.created_at, 
          (SELECT MIN(m.created_at) 
           FROM messages m 
           WHERE m.conversation_id = c.id AND m.sender_type = 'agent')
        )) as avg_response_time,
        MIN(TIMESTAMPDIFF(MINUTE, c.created_at, 
          (SELECT MIN(m.created_at) 
           FROM messages m 
           WHERE m.conversation_id = c.id AND m.sender_type = 'agent')
        )) as min_response_time,
        MAX(TIMESTAMPDIFF(MINUTE, c.created_at, 
          (SELECT MIN(m.created_at) 
           FROM messages m 
           WHERE m.conversation_id = c.id AND m.sender_type = 'agent')
        )) as max_response_time,
        COUNT(*) as total_conversations
      FROM conversations c
      ${dateFilter.where}
        AND EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.conversation_id = c.id AND m.sender_type = 'agent'
        )
      GROUP BY ${groupByClause.group}
      ORDER BY period
    `;

    const result = await Database.query(query, dateFilter.params);
    
    return result.map(row => ({
      ...row,
      avg_response_time: Math.round(row.avg_response_time || 0),
      min_response_time: Math.round(row.min_response_time || 0),
      max_response_time: Math.round(row.max_response_time || 0),
    }));
  }

  // 获取满意度统计
  static async getSatisfactionStats(startDate, endDate, groupBy = "day") {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const groupByClause = this.buildGroupByClause(groupBy);
    
    // 注意：这里假设有一个satisfaction_ratings表，实际可能需要根据具体实现调整
    const query = `
      SELECT 
        ${groupByClause.select} as period,
        AVG(rating) as avg_rating,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_ratings,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_ratings
      FROM satisfaction_ratings sr
      JOIN conversations c ON sr.conversation_id = c.id
      ${dateFilter.where}
      GROUP BY ${groupByClause.group}
      ORDER BY period
    `;

    try {
      const result = await Database.query(query, dateFilter.params);
      
      return result.map(row => ({
        ...row,
        avg_rating: Math.round((row.avg_rating || 0) * 10) / 10,
        satisfaction_rate: row.total_ratings > 0 
          ? Math.round((row.positive_ratings / row.total_ratings) * 100) 
          : 0,
      }));
    } catch (error) {
      // 如果satisfaction_ratings表不存在，返回空数据
      console.warn("Satisfaction ratings table not found, returning empty data");
      return [];
    }
  }

  // 获取渠道统计
  static async getChannelStats(startDate, endDate) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    const query = `
      SELECT 
        channel_type,
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conversations,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_duration
      FROM conversations
      ${dateFilter.where}
      GROUP BY channel_type
      ORDER BY total_conversations DESC
    `;

    const result = await Database.query(query, dateFilter.params);
    
    return result.map(row => ({
      ...row,
      avg_duration: Math.round(row.avg_duration || 0),
      resolution_rate: row.total_conversations > 0 
        ? Math.round((row.resolved_conversations / row.total_conversations) * 100) 
        : 0,
    }));
  }

  // 导出报表
  static async exportReport(reportType, startDate, endDate, format = "csv") {
    let data;
    
    switch (reportType) {
      case "overview":
        data = await this.getOverview(startDate, endDate);
        break;
      case "conversations":
        data = await this.getConversationStats(startDate, endDate);
        break;
      case "agents":
        data = await this.getAgentPerformance(startDate, endDate);
        break;
      case "response_time":
        data = await this.getResponseTimeStats(startDate, endDate);
        break;
      case "channels":
        data = await this.getChannelStats(startDate, endDate);
        break;
      default:
        throw new Error("不支持的报表类型");
    }

    if (format === "csv") {
      return this.convertToCSV(data);
    } else {
      return JSON.stringify(data, null, 2);
    }
  }

  // 构建日期过滤条件
  static buildDateFilter(startDate, endDate) {
    let where = "";
    const params = [];

    if (startDate && endDate) {
      where = "WHERE created_at >= ? AND created_at <= ?";
      params.push(startDate, endDate);
    } else if (startDate) {
      where = "WHERE created_at >= ?";
      params.push(startDate);
    } else if (endDate) {
      where = "WHERE created_at <= ?";
      params.push(endDate);
    }

    return { where, params };
  }

  // 构建分组条件
  static buildGroupByClause(groupBy) {
    switch (groupBy) {
      case "hour":
        return {
          select: "DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')",
          group: "DATE_FORMAT(created_at, '%Y-%m-%d %H')",
        };
      case "day":
        return {
          select: "DATE(created_at)",
          group: "DATE(created_at)",
        };
      case "week":
        return {
          select: "DATE_FORMAT(created_at, '%Y-%u')",
          group: "YEAR(created_at), WEEK(created_at)",
        };
      case "month":
        return {
          select: "DATE_FORMAT(created_at, '%Y-%m')",
          group: "YEAR(created_at), MONTH(created_at)",
        };
      default:
        return {
          select: "DATE(created_at)",
          group: "DATE(created_at)",
        };
    }
  }

  // 转换为CSV格式
  static convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return "";
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // 处理包含逗号或引号的值
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    );

    return [csvHeaders, ...csvRows].join("\n");
  }
}

module.exports = ReportService;