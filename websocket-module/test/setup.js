// Jest测试环境设置文件

// 设置测试超时
jest.setTimeout(10000);

// 全局测试变量
global.testUtils = {
  // 生成随机端口
  getRandomPort: () => {
    return 3000 + Math.floor(Math.random() * 1000);
  },
  
  // 等待指定时间
  wait: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // 创建测试消息
  createTestMessage: (type = 'text', content = {}) => {
    return {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date().toISOString()
    };
  },
  
  // 创建WebSocket连接的Promise包装
  createWebSocketConnection: (url) => {
    const WebSocket = require('ws');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        resolve(ws);
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  },
  
  // 发送消息并等待响应
  sendAndWaitForResponse: (ws, message, expectedType) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, 5000);
      
      const messageHandler = (data) => {
        try {
          const response = JSON.parse(data);
          if (!expectedType || response.type === expectedType) {
            clearTimeout(timeout);
            ws.removeListener('message', messageHandler);
            resolve(response);
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.removeListener('message', messageHandler);
          reject(error);
        }
      };
      
      ws.on('message', messageHandler);
      ws.send(JSON.stringify(message));
    });
  }
};

// 控制台输出过滤
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// 过滤掉一些预期的错误和警告
console.error = (...args) => {
  const message = args.join(' ');
  
  // 过滤掉测试中预期的错误
  if (
    message.includes('测试错误') ||
    message.includes('Test error') ||
    message.includes('ECONNRESET') ||
    message.includes('WebSocket connection closed')
  ) {
    return;
  }
  
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  
  // 过滤掉一些预期的警告
  if (
    message.includes('deprecated') ||
    message.includes('experimental')
  ) {
    return;
  }
  
  originalConsoleWarn.apply(console, args);
};

// 测试前清理
beforeEach(() => {
  // 清理定时器
  jest.clearAllTimers();
});

// 测试后清理
afterEach(async () => {
  // 等待异步操作完成
  await global.testUtils.wait(10);
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  // 在测试环境中，某些未处理的Promise拒绝是预期的
  if (process.env.NODE_ENV === 'test') {
    const reasonStr = reason?.toString() || '';
    if (
      reasonStr.includes('测试错误') ||
      reasonStr.includes('Test error') ||
      reasonStr.includes('ECONNRESET')
    ) {
      return;
    }
  }
  
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  // 在测试环境中，某些未捕获的异常是预期的
  if (process.env.NODE_ENV === 'test') {
    const errorStr = error?.toString() || '';
    if (
      errorStr.includes('测试错误') ||
      errorStr.includes('Test error') ||
      errorStr.includes('ECONNRESET')
    ) {
      return;
    }
  }
  
  console.error('Uncaught Exception:', error);
});

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';