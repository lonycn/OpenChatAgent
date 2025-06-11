const WebSocketModule = require('../index');
const http = require('http');
const WebSocket = require('ws');
const { EventEmitter } = require('events');

describe('WebSocketManager', () => {
  let server;
  let wsManager;
  let testPort;

  beforeEach(() => {
    testPort = 3000 + Math.floor(Math.random() * 1000);
    server = http.createServer();
    wsManager = WebSocketModule.create({
      server: server,
      port: testPort,
      heartbeat: {
        interval: 1000,
        timeout: 500
      }
    });
  });

  afterEach(async () => {
    if (wsManager) {
      await wsManager.stop();
    }
    if (server) {
      server.close();
    }
  });

  describe('基础功能', () => {
    test('应该能够创建WebSocket管理器实例', () => {
      expect(wsManager).toBeDefined();
      expect(wsManager.start).toBeInstanceOf(Function);
      expect(wsManager.stop).toBeInstanceOf(Function);
      expect(wsManager.registerHandler).toBeInstanceOf(Function);
    });

    test('应该能够启动和停止WebSocket服务', async () => {
      server.listen(testPort);
      await wsManager.start();
      
      const health = wsManager.getHealth();
      expect(health.status).toBe('healthy');
      
      await wsManager.stop();
    });

    test('应该能够注册消息处理器', () => {
      const handler = jest.fn();
      wsManager.registerHandler('test', handler);
      
      // 验证处理器已注册
      expect(wsManager.messageProcessor.handlers.has('test')).toBe(true);
    });
  });

  describe('连接管理', () => {
    test('应该能够处理WebSocket连接', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        wsManager.on('connection:added', (connectionInfo) => {
          expect(connectionInfo.id).toBeDefined();
          expect(connectionInfo.status).toBe('connected');
          done();
        });
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        ws.on('error', done);
      });
    });

    test('应该能够处理连接断开', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        let connectionId;
        
        wsManager.on('connection:added', (connectionInfo) => {
          connectionId = connectionInfo.id;
        });
        
        wsManager.on('connection:removed', (connectionInfo) => {
          expect(connectionInfo.id).toBe(connectionId);
          done();
        });
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        ws.on('open', () => {
          ws.close();
        });
        ws.on('error', done);
      });
    });

    test('应该能够限制最大连接数', async () => {
      const limitedManager = WebSocketModule.create({
        server: server,
        maxConnections: 2
      });
      
      server.listen(testPort);
      await limitedManager.start();
      
      const connections = [];
      
      // 创建3个连接，第3个应该被拒绝
      for (let i = 0; i < 3; i++) {
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        connections.push(ws);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = limitedManager.getMetrics();
      expect(metrics.connections.activeConnections).toBeLessThanOrEqual(2);
      
      connections.forEach(ws => ws.close());
      await limitedManager.stop();
    });
  });

  describe('消息处理', () => {
    test('应该能够处理文本消息', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        wsManager.registerHandler('text', async (message, connectionInfo) => {
          expect(message.type).toBe('text');
          expect(message.content.text).toBe('Hello World');
          return {
            type: 'text',
            content: { text: 'Echo: ' + message.content.text }
          };
        });
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        
        ws.on('open', () => {
          ws.send(JSON.stringify({
            id: 'test-1',
            type: 'text',
            content: { text: 'Hello World' },
            timestamp: new Date().toISOString()
          }));
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data);
          expect(response.type).toBe('text');
          expect(response.content.text).toBe('Echo: Hello World');
          ws.close();
          done();
        });
        
        ws.on('error', done);
      });
    });

    test('应该能够处理ping消息', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        
        ws.on('open', () => {
          ws.send(JSON.stringify({
            id: 'ping-1',
            type: 'ping',
            content: {},
            timestamp: new Date().toISOString()
          }));
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data);
          expect(response.type).toBe('pong');
          expect(response.content.timestamp).toBeDefined();
          ws.close();
          done();
        });
        
        ws.on('error', done);
      });
    });

    test('应该能够处理消息错误', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        wsManager.registerHandler('error_test', async () => {
          throw new Error('测试错误');
        });
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        
        ws.on('open', () => {
          ws.send(JSON.stringify({
            id: 'error-1',
            type: 'error_test',
            content: {},
            timestamp: new Date().toISOString()
          }));
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data);
          expect(response.type).toBe('error');
          expect(response.content.message).toContain('测试错误');
          ws.close();
          done();
        });
        
        ws.on('error', done);
      });
    });
  });

  describe('广播功能', () => {
    test('应该能够广播消息到所有连接', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        const connections = [];
        let receivedCount = 0;
        
        const createConnection = () => {
          return new Promise((resolve) => {
            const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
            ws.on('open', () => resolve(ws));
            ws.on('message', (data) => {
              const message = JSON.parse(data);
              if (message.type === 'broadcast') {
                receivedCount++;
                if (receivedCount === 2) {
                  connections.forEach(ws => ws.close());
                  done();
                }
              }
            });
          });
        };
        
        // 创建两个连接
        connections.push(await createConnection());
        connections.push(await createConnection());
        
        // 等待连接建立
        setTimeout(() => {
          wsManager.broadcast({
            type: 'broadcast',
            content: { text: '广播消息' }
          });
        }, 100);
      });
    });
  });

  describe('健康检查和指标', () => {
    test('应该能够获取健康状态', async () => {
      server.listen(testPort);
      await wsManager.start();
      
      const health = wsManager.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.connections).toBeDefined();
    });

    test('应该能够获取性能指标', async () => {
      server.listen(testPort);
      await wsManager.start();
      
      const metrics = wsManager.getMetrics();
      expect(metrics.connections).toBeDefined();
      expect(metrics.messages).toBeDefined();
      expect(metrics.errors).toBeDefined();
      expect(metrics.connections.activeConnections).toBe(0);
    });

    test('指标应该随连接变化而更新', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        
        ws.on('open', () => {
          setTimeout(() => {
            const metrics = wsManager.getMetrics();
            expect(metrics.connections.activeConnections).toBe(1);
            ws.close();
            
            setTimeout(() => {
              const updatedMetrics = wsManager.getMetrics();
              expect(updatedMetrics.connections.activeConnections).toBe(0);
              done();
            }, 50);
          }, 50);
        });
        
        ws.on('error', done);
      });
    });
  });

  describe('中间件系统', () => {
    test('应该能够使用连接中间件', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        let middlewareCalled = false;
        
        wsManager.use({
          type: 'connection',
          handler: async (ws, req, metadata) => {
            middlewareCalled = true;
            return { userId: 'test-user' };
          }
        });
        
        wsManager.on('connection:added', (connectionInfo) => {
          expect(middlewareCalled).toBe(true);
          expect(connectionInfo.userId).toBe('test-user');
          done();
        });
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        ws.on('error', done);
      });
    });

    test('应该能够使用消息中间件', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        let middlewareCalled = false;
        
        wsManager.use({
          type: 'message',
          handler: async (message, connectionInfo, next) => {
            middlewareCalled = true;
            message.processed = true;
            return await next();
          }
        });
        
        wsManager.registerHandler('test', async (message) => {
          expect(middlewareCalled).toBe(true);
          expect(message.processed).toBe(true);
          return { type: 'test_response', content: {} };
        });
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        
        ws.on('open', () => {
          ws.send(JSON.stringify({
            id: 'test-1',
            type: 'test',
            content: {},
            timestamp: new Date().toISOString()
          }));
        });
        
        ws.on('message', () => {
          ws.close();
          done();
        });
        
        ws.on('error', done);
      });
    });
  });

  describe('错误处理', () => {
    test('应该能够处理无效的JSON消息', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        
        ws.on('open', () => {
          ws.send('invalid json');
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data);
          expect(response.type).toBe('error');
          expect(response.content.message).toContain('Invalid JSON');
          ws.close();
          done();
        });
        
        ws.on('error', done);
      });
    });

    test('应该能够处理未知消息类型', (done) => {
      server.listen(testPort, async () => {
        await wsManager.start();
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        
        ws.on('open', () => {
          ws.send(JSON.stringify({
            id: 'unknown-1',
            type: 'unknown_type',
            content: {},
            timestamp: new Date().toISOString()
          }));
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data);
          expect(response.type).toBe('error');
          expect(response.content.message).toContain('Unknown message type');
          ws.close();
          done();
        });
        
        ws.on('error', done);
      });
    });
  });

  describe('性能测试', () => {
    test('应该能够处理大量并发连接', async () => {
      const connectionCount = 50;
      const connections = [];
      
      server.listen(testPort);
      await wsManager.start();
      
      // 创建多个连接
      const connectionPromises = Array.from({ length: connectionCount }, () => {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
          ws.on('open', () => {
            connections.push(ws);
            resolve(ws);
          });
          ws.on('error', reject);
        });
      });
      
      await Promise.all(connectionPromises);
      
      const metrics = wsManager.getMetrics();
      expect(metrics.connections.activeConnections).toBe(connectionCount);
      
      // 清理连接
      connections.forEach(ws => ws.close());
      
      // 等待连接清理
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMetrics = wsManager.getMetrics();
      expect(finalMetrics.connections.activeConnections).toBe(0);
    }, 10000);

    test('应该能够处理大量消息', (done) => {
      const messageCount = 100;
      let receivedCount = 0;
      
      server.listen(testPort, async () => {
        await wsManager.start();
        
        wsManager.registerHandler('load_test', async (message) => {
          return {
            type: 'load_test_response',
            content: { id: message.content.id }
          };
        });
        
        const ws = new WebSocket(`ws://localhost:${testPort}/ws`);
        
        ws.on('open', () => {
          // 发送大量消息
          for (let i = 0; i < messageCount; i++) {
            ws.send(JSON.stringify({
              id: `load-test-${i}`,
              type: 'load_test',
              content: { id: i },
              timestamp: new Date().toISOString()
            }));
          }
        });
        
        ws.on('message', (data) => {
          const response = JSON.parse(data);
          if (response.type === 'load_test_response') {
            receivedCount++;
            if (receivedCount === messageCount) {
              const metrics = wsManager.getMetrics();
              expect(metrics.messages.totalMessages).toBeGreaterThanOrEqual(messageCount);
              ws.close();
              done();
            }
          }
        });
        
        ws.on('error', done);
      });
    }, 10000);
  });
});