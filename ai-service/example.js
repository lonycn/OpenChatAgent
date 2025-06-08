const DashScopeClient = require("./src");
require("dotenv").config();

async function main() {
  // 检查环境变量
  if (!process.env.DASHSCOPE_API_KEY) {
    console.log("❌ 请在 .env 文件中设置 DASHSCOPE_API_KEY");
    console.log("格式: DASHSCOPE_API_KEY=sk-your_api_key_here");
    return;
  }

  console.log("🚀 初始化阿里云百炼客户端...");

  // 初始化客户端
  const client = new DashScopeClient(
    process.env.DASHSCOPE_API_KEY,
    JSON.parse(process.env.KNOWLEDGE_BASE_CONFIGS || "[]"),
    { model: process.env.DEFAULT_MODEL || "qwen-plus" }
  );

  try {
    console.log("\n💬 测试单轮对话...");
    const response1 = await client.sendMessage(
      "demo-session",
      "你好！请介绍一下你自己。"
    );
    console.log("🤖 AI回复:", response1);

    console.log("\n🔄 测试多轮对话...");
    const response2 = await client.sendMessage(
      "demo-session",
      "你刚才说的什么？"
    );
    console.log("🤖 AI回复:", response2);

    console.log("\n📚 测试知识库查询...");
    if (client.knowledgeBaseConfigs.length > 0) {
      const kbResponse = await client.callKnowledge(
        "帮助信息",
        client.knowledgeBaseConfigs[0].id
      );
      console.log("📖 知识库回复:", kbResponse);
    } else {
      console.log("⚠️  未配置知识库，跳过知识库测试");
    }

    console.log("\n✅ 所有测试完成！");
  } catch (error) {
    console.error("❌ 错误:", error.message);
    if (error.message.includes("401")) {
      console.log("💡 提示: 请检查 API Key 是否正确");
    }
  }
}

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
