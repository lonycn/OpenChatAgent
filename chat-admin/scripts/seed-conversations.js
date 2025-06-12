const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

// 模拟客户数据
const customers = [
  { name: "张三", email: "zhangsan@example.com", phone: "13800138001" },
  { name: "李四", email: "lisi@example.com", phone: "13800138002" },
  { name: "王五", email: "wangwu@example.com", phone: "13800138003" },
  { name: "赵六", email: "zhaoliu@example.com", phone: "13800138004" },
  { name: "孙七", email: "sunqi@example.com", phone: "13800138005" },
  { name: "周八", email: "zhouba@example.com", phone: "13800138006" },
  { name: "吴九", email: "wujiu@example.com", phone: "13800138007" },
  { name: "郑十", email: "zhengshi@example.com", phone: "13800138008" },
];

// 模拟消息内容
const messageContents = [
  "你好，我想咨询一下产品价格",
  "请问这个产品有什么优势？",
  "我的订单什么时候能发货？",
  "可以帮我查看一下订单状态吗？",
  "这个产品有售后服务吗？",
  "我想退换货，怎么操作？",
  "请问支持哪些支付方式？",
  "有什么优惠活动吗？",
  "产品质量怎么样？",
  "配送范围包括我这里吗？",
];

const aiResponses = [
  "您好！我是AI助手，很高兴为您服务。",
  "好的，我来为您查询一下相关信息。",
  "根据您的需求，我推荐以下方案：",
  "感谢您的咨询，这个问题我来帮您解答。",
  "请稍等，我正在为您查询订单信息。",
  "关于您提到的问题，我们的政策是：",
  "非常感谢您的反馈，我会及时处理。",
  "如果您还有其他问题，请随时联系我们。",
];

async function createTestData() {
  try {
    console.log("🚀 开始创建测试会话数据...");

    // 获取收件箱和用户信息
    const [inboxes] = await db.execute("SELECT id, name FROM inboxes LIMIT 3");
    const [users] = await db.execute(
      'SELECT id, full_name FROM users WHERE role IN ("agent", "supervisor") LIMIT 3'
    );

    console.log(`📋 找到 ${inboxes.length} 个收件箱, ${users.length} 个客服`);

    // 创建客户数据
    const createdCustomers = [];
    for (const customer of customers) {
      const customerUuid = uuidv4();
      const [result] = await db.execute(
        `INSERT INTO customer_contacts (email, phone, name) 
         VALUES (?, ?, ?)`,
        [customer.email, customer.phone, customer.name]
      );

      createdCustomers.push({
        id: result.insertId,
        ...customer,
      });
    }

    console.log(`👥 创建了 ${createdCustomers.length} 个客户`);

    // 创建会话数据
    const statuses = ["open", "pending", "resolved", "closed"];
    const priorities = ["low", "medium", "high", "urgent"];
    const channelTypes = ["web_widget", "email", "api"];
    const agentTypes = ["ai", "human"];

    const createdConversations = [];

    for (let i = 0; i < 20; i++) {
      const customer =
        createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const inbox = inboxes[Math.floor(Math.random() * inboxes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority =
        priorities[Math.floor(Math.random() * priorities.length)];
      const channelType =
        channelTypes[Math.floor(Math.random() * channelTypes.length)];
      const agentType =
        agentTypes[Math.floor(Math.random() * agentTypes.length)];

      // 随机分配客服（50%概率）
      const assignee =
        Math.random() > 0.5
          ? users[Math.floor(Math.random() * users.length)]
          : null;

      const conversationUuid = uuidv4();

      // 创建时间（最近7天内的随机时间）
      const createdAt = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      );
      const updatedAt = new Date(
        createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000
      );

      const [result] = await db.execute(
        `INSERT INTO conversations 
         (uuid, contact_id, assignee_id, inbox_id, status, priority, channel_type, current_agent_type, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conversationUuid,
          customer.id,
          assignee ? assignee.id : null,
          inbox.id,
          status,
          priority,
          channelType,
          agentType,
          createdAt,
          updatedAt,
        ]
      );

      const conversationId = result.insertId;
      createdConversations.push({
        id: conversationId,
        uuid: conversationUuid,
        customer,
        assignee,
        status,
        priority,
        channelType,
        agentType,
        createdAt,
        updatedAt,
      });

      // 为每个会话创建一些消息
      const messageCount = Math.floor(Math.random() * 5) + 2; // 2-6条消息

      for (let j = 0; j < messageCount; j++) {
        const messageUuid = uuidv4();
        const isUserMessage = j % 2 === 0; // 交替发送用户和AI/客服消息

        let content, senderType, senderId;

        if (isUserMessage) {
          content =
            messageContents[Math.floor(Math.random() * messageContents.length)];
          senderType = "contact";
          senderId = null;
        } else {
          content = aiResponses[Math.floor(Math.random() * aiResponses.length)];
          senderType = agentType === "human" ? "agent" : "ai";
          senderId = agentType === "human" && assignee ? assignee.id : null;
        }

        const messageTime = new Date(createdAt.getTime() + j * 10 * 60 * 1000); // 每10分钟一条消息

        await db.execute(
          `INSERT INTO messages 
           (uuid, conversation_id, sender_type, sender_id, content, message_type, is_private, created_at) 
           VALUES (?, ?, ?, ?, ?, 'text', false, ?)`,
          [
            messageUuid,
            conversationId,
            senderType,
            senderId,
            content,
            messageTime,
          ]
        );
      }
    }

    console.log(`💬 创建了 ${createdConversations.length} 个会话`);

    // 输出一些统计信息
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_conversations,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_conversations,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_conversations,
        SUM(CASE WHEN current_agent_type = 'ai' THEN 1 ELSE 0 END) as ai_conversations,
        SUM(CASE WHEN current_agent_type = 'human' THEN 1 ELSE 0 END) as human_conversations
      FROM conversations
    `);

    console.log("📊 会话统计:");
    console.log(`  总会话数: ${stats[0].total_conversations}`);
    console.log(`  进行中: ${stats[0].open_conversations}`);
    console.log(`  待处理: ${stats[0].pending_conversations}`);
    console.log(`  AI处理: ${stats[0].ai_conversations}`);
    console.log(`  人工处理: ${stats[0].human_conversations}`);

    console.log("✅ 测试数据创建完成!");
  } catch (error) {
    console.error("❌ 创建测试数据失败:", error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createTestData()
    .then(() => {
      console.log("🎉 所有测试数据创建完成!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 创建测试数据失败:", error);
      process.exit(1);
    });
}

module.exports = { createTestData };
