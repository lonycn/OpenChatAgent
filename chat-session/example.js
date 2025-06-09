const {
  SessionManager,
  SessionCleanup,
  closeRedisClient,
} = require("./src/index");

async function main() {
  console.log("🚀 Chat Session 模块使用示例");

  try {
    // 创建会话管理器
    const sessionManager = new SessionManager();

    // 创建清理工具
    const cleanup = new SessionCleanup(sessionManager);

    console.log("\n📝 创建新会话...");
    const sessionResult = await sessionManager.createSession("user123", {
      name: "测试会话",
      type: "chat",
    });
    const sessionId = sessionResult.sessionId;
    console.log(`✅ 会话创建成功: ${sessionId}`);

    console.log("\n💬 添加消息...");
    await sessionManager.addMessage(sessionId, {
      id: "msg-1",
      from: "user",
      text: "你好，这是第一条消息",
      timestamp: new Date().toISOString(),
      type: "text",
    });

    await sessionManager.addMessage(sessionId, {
      id: "msg-2",
      from: "assistant",
      text: "你好！很高兴为您服务。",
      timestamp: new Date().toISOString(),
      type: "text",
    });

    await sessionManager.addMessage(sessionId, {
      id: "msg-3",
      from: "user",
      text: "请介绍一下你的功能",
      timestamp: new Date().toISOString(),
      type: "text",
    });
    console.log("✅ 消息添加成功");

    console.log("\n📖 获取会话信息...");
    const session = await sessionManager.getSession(sessionId);
    console.log("会话信息:", JSON.stringify(session, null, 2));

    console.log("\n📜 获取消息历史...");
    const history = await sessionManager.getHistory(sessionId);
    console.log(`消息历史 (${history.length} 条):`);
    history.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.from}] ${msg.text}`);
    });

    console.log("\n👥 获取用户会话...");
    const userSessions = await sessionManager.getUserSessions("user123");
    console.log(`用户 user123 的会话数量: ${userSessions.length}`);

    console.log("\n📊 获取统计信息...");
    const activeCount = await sessionManager.getActiveSessionsCount();
    console.log(`活跃会话数量: ${activeCount}`);

    console.log("\n🧹 启动清理服务...");
    cleanup.start();
    console.log("清理状态:", cleanup.getStatus());

    // 等待几秒钟
    console.log("\n⏳ 等待 3 秒...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("\n🛑 停止清理服务...");
    cleanup.stop();

    console.log("\n🗑️ 删除测试会话...");
    await sessionManager.deleteSession(sessionId);
    console.log("✅ 会话删除成功");

    console.log("\n✨ 示例运行完成！");
  } catch (error) {
    console.error("❌ 示例运行出错:", error);
  } finally {
    // 关闭 Redis 连接
    console.log("\n🔌 关闭 Redis 连接...");
    await closeRedisClient();
    console.log("✅ 连接已关闭");
  }
}

// 处理进程退出
process.on("SIGINT", async () => {
  console.log("\n🛑 收到退出信号，正在清理...");
  await closeRedisClient();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 收到终止信号，正在清理...");
  await closeRedisClient();
  process.exit(0);
});

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
