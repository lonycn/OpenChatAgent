import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Divider, Alert, Input } from 'antd';
import { PlayCircleOutlined, StopOutlined, ClearOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 流式消息测试页面
 * 用于测试和验证WebSocket流式消息处理功能
 */
export const StreamingTestPage: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [currentStream, setCurrentStream] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [testMessage, setTestMessage] = useState('你好，请介绍一下你自己');

  // 连接WebSocket
  const connect = () => {
    try {
      const websocket = new WebSocket('ws://localhost:8002');
      
      websocket.onopen = () => {
        console.log('✅ WebSocket连接已建立');
        setIsConnected(true);
        addMessage('系统: WebSocket连接已建立');
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 收到消息:', data);
          
          if (data.type === 'stream') {
            // 处理流式消息
            const content = data.fullText || data.text || '';
            setCurrentStream(content);
            
            if (data.isComplete) {
              addMessage(`AI (流式完成): ${content}`);
              setCurrentStream('');
            }
          } else if (data.type === 'text') {
            // 处理普通文本消息
            addMessage(`AI: ${data.text || ''}`);
          } else if (data.type === 'system') {
            // 处理系统消息
            addMessage(`系统: ${data.text || ''}`);
          }
        } catch (error) {
          console.error('❌ 解析消息失败:', error);
          addMessage(`错误: 无法解析消息 - ${event.data}`);
        }
      };

      websocket.onclose = () => {
        console.log('🔌 WebSocket连接已关闭');
        setIsConnected(false);
        setCurrentStream('');
        addMessage('系统: WebSocket连接已关闭');
      };

      websocket.onerror = (error) => {
        console.error('❌ WebSocket错误:', error);
        addMessage('系统: WebSocket连接错误');
      };

      setWs(websocket);
    } catch (error) {
      console.error('❌ 连接失败:', error);
      addMessage('系统: 连接失败');
    }
  };

  // 断开连接
  const disconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  // 发送测试消息
  const sendTestMessage = () => {
    if (!ws || !isConnected) {
      addMessage('错误: WebSocket未连接');
      return;
    }

    const message = {
      type: 'text',
      id: `test_${Date.now()}`,
      text: testMessage,
      timestamp: new Date().toISOString(),
      userId: `test_user_${Date.now()}`,
    };

    try {
      ws.send(JSON.stringify(message));
      addMessage(`用户: ${testMessage}`);
      console.log('📤 发送消息:', message);
    } catch (error) {
      console.error('❌ 发送失败:', error);
      addMessage('错误: 消息发送失败');
    }
  };

  // 添加消息到日志
  const addMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 清空消息日志
  const clearMessages = () => {
    setMessages([]);
    setCurrentStream('');
  };

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>WebSocket 流式消息测试</Title>
      
      <Alert
        message="测试说明"
        description="此页面用于测试WebSocket流式消息处理功能。连接到后端服务后，发送消息并观察流式响应。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* 控制面板 */}
        <Card title="控制面板" style={{ width: '300px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>连接状态: </Text>
              <Text type={isConnected ? 'success' : 'danger'}>
                {isConnected ? '已连接' : '未连接'}
              </Text>
            </div>

            <Divider />

            <Space>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={connect}
                disabled={isConnected}
              >
                连接
              </Button>
              <Button 
                icon={<StopOutlined />}
                onClick={disconnect}
                disabled={!isConnected}
              >
                断开
              </Button>
            </Space>

            <Divider />

            <div>
              <Text strong>测试消息:</Text>
              <TextArea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                placeholder="输入要发送的测试消息"
                style={{ marginTop: 8 }}
              />
              <Button 
                type="primary" 
                onClick={sendTestMessage}
                disabled={!isConnected || !testMessage.trim()}
                style={{ marginTop: 8, width: '100%' }}
              >
                发送测试消息
              </Button>
            </div>

            <Divider />

            <Button 
              icon={<ClearOutlined />}
              onClick={clearMessages}
              style={{ width: '100%' }}
            >
              清空日志
            </Button>
          </Space>
        </Card>

        {/* 消息日志 */}
        <Card title="消息日志" style={{ flex: 1 }}>
          <div style={{ height: '500px', overflowY: 'auto', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
            {messages.length === 0 ? (
              <Text type="secondary">暂无消息...</Text>
            ) : (
              messages.map((message, index) => (
                <div key={index} style={{ marginBottom: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                  {message}
                </div>
              ))
            )}
            
            {/* 当前流式消息 */}
            {currentStream && (
              <div style={{ 
                marginBottom: '8px', 
                fontFamily: 'monospace', 
                fontSize: '12px',
                backgroundColor: '#e6f7ff',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #91d5ff'
              }}>
                <Text strong>[流式中] AI: </Text>
                <Text>{currentStream}</Text>
                <span style={{ animation: 'blink 1s infinite' }}>|</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};

export default StreamingTestPage; 