#!/usr/bin/env node

const WebSocket = require("ws");

console.log("🔍 开始验证流式回复修复效果...\n");

// 连接到WebSocket服务器
const ws = new WebSocket("ws://localhost:8002");

let messageCount = 0;
let streamMessages = [];

ws.on("open", function open() {
  console.log("✅ WebSocket连接成功");

  // 发送初始化消息
  const initMessage = {
    type: "init",
    payload: {
      userAgent: "Node.js Test Client",
      timestamp: new Date().toISOString(),
      userId: "test_user_" + Date.now(),
    },
  };

  ws.send(JSON.stringify(initMessage));
  console.log("📤 发送初始化消息");

  // 等待1秒后发送测试消息
  setTimeout(() => {
    const testMessage = {
      type: "text",
      text: "请给我讲一个关于程序员的笑话",
      id: "test_" + Date.now(),
      timestamp: new Date().toISOString(),
      userId: "test_user_" + Date.now(),
    };

    ws.send(JSON.stringify(testMessage));
    console.log("📤 发送测试消息:", testMessage.text);
    console.log("⏳ 等待流式回复...\n");
  }, 1000);
});

ws.on("message", function message(data) {
  try {
    const msg = JSON.parse(data.toString());
    messageCount++;

    console.log(`📨 [${messageCount}] 收到消息:`, {
      type: msg.type,
      id: msg.id ? msg.id.substring(0, 8) + "..." : "N/A",
      textLength: msg.text ? msg.text.length : 0,
      fullTextLength: msg.fullText ? msg.fullText.length : 0,
      isComplete: msg.isComplete,
    });

    if (msg.type === "stream") {
      streamMessages.push({
        id: msg.id,
        text: msg.text,
        fullText: msg.fullText,
        isComplete: msg.isComplete,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `   📝 流式内容: "${msg.fullText ? msg.fullText.substring(0, 50) : msg.text}${msg.fullText && msg.fullText.length > 50 ? "..." : ""}"`
      );

      if (msg.isComplete) {
        console.log("   ✅ 流式消息完成\n");
        analyzeStreamMessages();
      }
    } else if (msg.type === "response") {
      console.log(
        `   📝 响应内容: "${msg.text ? msg.text.substring(0, 50) : ""}${msg.text && msg.text.length > 50 ? "..." : ""}"`
      );
      console.log("   ✅ 响应消息完成\n");
      analyzeStreamMessages();
    }
  } catch (error) {
    console.error("❌ 解析消息失败:", error.message);
  }
});

ws.on("close", function close() {
  console.log("🔌 WebSocket连接关闭");
  process.exit(0);
});

ws.on("error", function error(err) {
  console.error("❌ WebSocket错误:", err.message);
  process.exit(1);
});

function analyzeStreamMessages() {
  if (streamMessages.length === 0) {
    console.log("⚠️  没有收到流式消息");
    return;
  }

  console.log("📊 流式消息分析:");
  console.log(`   消息数量: ${streamMessages.length}`);

  // 检查消息ID一致性
  const uniqueIds = new Set(streamMessages.map((m) => m.id));
  console.log(`   唯一ID数量: ${uniqueIds.size}`);

  if (uniqueIds.size === 1) {
    console.log("   ✅ 消息ID一致");
  } else {
    console.log("   ❌ 消息ID不一致");
  }

  // 检查内容累积
  let contentGrowing = true;
  for (let i = 1; i < streamMessages.length; i++) {
    const prev = streamMessages[i - 1];
    const curr = streamMessages[i];

    if (
      curr.fullText &&
      prev.fullText &&
      curr.fullText.length < prev.fullText.length
    ) {
      contentGrowing = false;
      break;
    }
  }

  if (contentGrowing) {
    console.log("   ✅ 内容正确累积");
  } else {
    console.log("   ❌ 内容累积异常");
  }

  // 显示最终内容
  const lastMessage = streamMessages[streamMessages.length - 1];
  if (lastMessage.fullText) {
    console.log(`   📄 最终内容长度: ${lastMessage.fullText.length} 字符`);
    console.log(
      `   📄 最终内容预览: "${lastMessage.fullText.substring(0, 100)}..."`
    );
  }

  console.log("\n🎉 验证完成！");

  // 5秒后关闭连接
  setTimeout(() => {
    ws.close();
  }, 5000);
}

// 30秒超时
setTimeout(() => {
  console.log("⏰ 测试超时，关闭连接");
  ws.close();
}, 30000);
