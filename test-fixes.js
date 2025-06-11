// 🧪 测试修复效果的脚本
console.log("🧪 开始测试修复效果...");

// 1. 测试全局错误处理器
if (window.globalErrorHandler) {
  console.log("✅ 全局错误处理器已加载");
  window.globalErrorHandler.logInfo("测试日志记录功能", { test: true });
} else {
  console.log("❌ 全局错误处理器未加载");
}

// 2. 测试拦截器
if (window.requestInterceptor) {
  console.log("✅ 请求拦截器已加载");
  console.log("📊 拦截统计:", window.requestInterceptor.getStats());
} else {
  console.log("❌ 请求拦截器未加载");
}

// 3. 测试WebSocket状态
setTimeout(() => {
  console.log("🔌 WebSocket状态检查...");

  // 检查是否有活跃的WebSocket连接
  const wsConnected = window.wsConnected || false;
  console.log(wsConnected ? "✅ WebSocket已连接" : "❌ WebSocket未连接");

  console.log("🧪 测试完成");
}, 2000);
