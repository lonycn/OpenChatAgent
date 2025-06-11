/**
 * 📚 WebSocket模块基础使用示例
 * 
 * 展示如何使用新的WebSocket独立模块
 * 解决对话无响应等问题
 */

const http = require('http');
const WebSocketModule = require('../index');
const AuthHandler = require('../handlers/AuthHandler');
const validationMiddleware = require('../middleware/validation');

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket管理器
const wsManager = WebSocketModule.create({
  server: server,
  maxConnections: 1000,
  heartbeat: {
    interval: 30000,
    timeout: 5000
  },
  message: {
    timeout: 30000,
    maxRetries: 3
  },
  plugins: ['monitoring'],
  middleware: ['validation']
});

// 创建认证处理器
const authHandler = new AuthHandler({
  allowAnonymous: true,
  requireAuth: false
});

// 添加连接中间件（认证）
wsManager.use({
  type: 'connection',
  handler: async (ws, req, metadata) => {
    try {
      const userInfo = await authHandler.authenticateConnection(ws, req, metadata);
      return userInfo; // 返回用户信息，会被合并到metadata中
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return false; // 拒绝连接
    }
  }
});

// 添加消息验证中间件
wsManager.use(validationMiddleware({
  maxMessageLength: 10000,
  maxContentLength: 8000,
  enableSanitization: true
}));

// 注册消息处理器

// 1. 初始化消息处理
wsManager.registerHandler('init', async (message, connectionInfo) => {
  console.log(`🔄 Initializing session for user: ${connectionInfo.userId}`);
  
  // 创建或获取会话ID
  const sessionId = message.content.sessionId || require('uuid').v4();
  
  // 更新连接信息
  connectionInfo.sessionId = sessionId;
  
  // 发送初始化响应
  return {
    type: 'init_response',
    content: {
      sessionId: sessionId,
      userId: connectionInfo.userId,
      status: 'connected',
      timestamp: new Date().toISOString()
    }
  };
});

// 2. 文本消息处理
wsManager.registerHandler('text', async (message, connectionInfo) => {
  console.log(`💬 Processing text message from ${connectionInfo.userId}`);
  
  const userText = message.content.text;
  
  // 模拟AI处理（实际应该调用AI服务）
  const aiResponse = await simulateAIResponse(userText, connectionInfo.sessionId);
  
  // 返回AI响应
  return {
    type: 'text',
    from: 'ai',
    content: {
      text: aiResponse,
      messageId: require('uuid').v4()
    },
    sessionId: connectionInfo.sessionId
  };
});

// 3. Ping/Pong处理
wsManager.registerHandler('ping', async (message, connectionInfo) => {
  return {
    type: 'pong',
    content: {
      timestamp: new Date().toISOString()
    }
  };
});

// 4. 系统消息处理
wsManager.registerHandler('system', async (message, connectionInfo) => {
  console.log(`🔧 System message: ${message.content.action}`);
  
  switch (message.content.action) {
    case 'get_status':
      return {
        type: 'system',
        content: {
          action: 'status_response',
          data: wsManager.getHealth()
        }
      };
      
    case 'get_metrics':
      return {
        type: 'system',
        content: {
          action: 'metrics_response',
          data: wsManager.getMetrics()
        }
      };
      
    default:
      throw new Error(`Unknown system action: ${message.content.action}`);
  }
});

// 事件监听

// 连接事件
wsManager.on('connection:added', (connectionInfo) => {
  console.log(`✅ New connection: ${connectionInfo.id} (User: ${connectionInfo.userId})`);
  
  // 发送欢迎消息
  setTimeout(() => {
    wsManager.sendMessage(connectionInfo.id, {
      type: 'system',
      from: 'system',
      content: {
        text: '欢迎使用智能客服系统！请发送消息开始对话。',
        action: 'welcome'
      }
    }).catch(console.error);
  }, 1000);
});

wsManager.on('connection:removed', (connectionInfo) => {
  console.log(`❌ Connection closed: ${connectionInfo.id}`);
});

// 消息事件
wsManager.on('message:processed', (data) => {
  console.log(`📨 Message processed in ${data.processingTime}ms`);
});

wsManager.on('message:error', (data) => {
  console.error(`❌ Message error:`, data.error.message);
  
  // 发送用户友好的错误消息
  if (data.connectionInfo) {
    wsManager.sendMessage(data.connectionInfo.id, {
      type: 'error',
      content: {
        message: '抱歉，处理您的消息时出现了问题，请稍后重试。',
        code: 'PROCESSING_ERROR'
      }
    }).catch(console.error);
  }
});

// 告警事件
wsManager.on('alert:triggered', (alert) => {
  console.warn(`🚨 Alert: ${alert.message}`);
  
  // 可以在这里发送通知给管理员
  // sendAdminNotification(alert);
});

// 模拟AI响应函数
async function simulateAIResponse(userText, sessionId) {
  // 模拟处理延迟
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // 简单的响应逻辑
  const responses = [
    `我理解您说的"${userText}"，让我为您提供帮助。`,
    `关于"${userText}"，我建议您可以尝试以下方法...`,
    `感谢您的问题"${userText}"，这是一个很好的问题。`,
    `针对"${userText}"，我为您找到了相关信息。`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// 启动服务器
async function startServer() {
  try {
    // 启动WebSocket服务
    await wsManager.start();
    
    // 启动HTTP服务器
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 WebSocket endpoint: ws://localhost:${PORT}/ws`);
      console.log(`📈 Health check: http://localhost:${PORT}/health`);
    });
    
    // 添加HTTP路由
    server.on('request', (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(wsManager.getHealth(), null, 2));
      } else if (req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(wsManager.getMetrics(), null, 2));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  try {
    await wsManager.stop();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// 启动服务器
if (require.main === module) {
  startServer();
}

module.exports = { wsManager, server };