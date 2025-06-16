import React, { useEffect, useRef } from 'react';
import { Bubble, Sender } from '@ant-design/x';
import { Avatar, Card, Typography } from 'antd';
import { RobotOutlined, UserOutlined, CheckOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useChat } from '../hooks/useChat';
import { StatusBar } from './StatusBar';
import { StreamingText } from './StreamingText';
import { ChatMessage } from '../types';
import dayjs from 'dayjs';

const { Text } = Typography;

/**
 * 聊天界面组件 - 基于 Ant Design X
 */
export const ChatInterface: React.FC = () => {
  const {
    messages,
    connectionStatus,
    handoverStatus,
    isTyping,
    sessionId,
    userId,
    sendMessage,
    requestHandover,
    requestAITakeover,
    reconnect,
    clearMessages,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 获取消息状态图标
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <ClockCircleOutlined style={{ color: '#faad14', marginLeft: '4px' }} />;
      case 'sent':
        return <CheckOutlined style={{ color: '#52c41a', marginLeft: '4px' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginLeft: '4px' }} />;
      default:
        return null;
    }
  };

  // 转换消息格式为 Ant Design X 格式
  const convertMessages = (chatMessages: ChatMessage[]) => {
    return chatMessages.map((msg) => {
      const isUser = msg.role === 'user';
      const isSystem = msg.role === 'system';
      
      // 构建消息内容
      const messageContent = msg.isStreaming ? (
        <StreamingText 
          value={msg.content} 
          speed={15}
          onComplete={() => console.log('✅ 流式消息完成:', msg.id)}
        />
      ) : (
        <div>
          {msg.content}
          {isUser && getStatusIcon(msg.status)}
        </div>
      );
      
      return {
        key: msg.id,
        content: messageContent,
        role: isUser ? ('user' as const) : ('assistant' as const),
        avatar: isUser ? (
          <Avatar 
            size="small" 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: '#1890ff',
              border: '2px solid #fff',
              boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)'
            }} 
          />
        ) : isSystem ? (
          <Avatar 
            size="small" 
            style={{ 
              backgroundColor: '#faad14',
              color: '#fff',
              fontWeight: 'bold',
              border: '2px solid #fff',
              boxShadow: '0 2px 8px rgba(250, 173, 20, 0.2)'
            }}
          >
            系
          </Avatar>
        ) : handoverStatus === 'AI' ? (
          <Avatar 
            size="small" 
            icon={<RobotOutlined />} 
            style={{ 
              backgroundColor: '#52c41a',
              border: '2px solid #fff',
              boxShadow: '0 2px 8px rgba(82, 196, 26, 0.2)'
            }} 
          />
        ) : (
          <Avatar 
            size="small" 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: '#13c2c2',
              border: '2px solid #fff',
              boxShadow: '0 2px 8px rgba(19, 194, 194, 0.2)'
            }} 
          />
        ),
        placement: isUser ? ('end' as const) : ('start' as const),
        typing: msg.isStreaming,
        time: dayjs(msg.timestamp).format('HH:mm'),
        status: msg.status === 'error' ? ('error' as const) : undefined,
        variant: isSystem ? ('shadow' as const) : isUser ? ('filled' as const) : ('borderless' as const),
        color: isSystem ? ('warning' as const) : isUser ? ('primary' as const) : ('default' as const),
        styles: {
          content: {
            maxWidth: isUser ? '70%' : '85%',
            wordBreak: 'break-word' as const,
            whiteSpace: 'pre-wrap' as const,
          },
        },
      };
    });
  };

  // 处理消息发送
  const handleSend = (message: string) => {
    if (message.trim() && connectionStatus === 'connected') {
      sendMessage(message);
    }
  };

  const convertedMessages = convertMessages(messages);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 状态栏 */}
      <StatusBar
        connectionStatus={connectionStatus}
        handoverStatus={handoverStatus}
        isTyping={isTyping}
        sessionId={sessionId}
        userId={userId}
        onRequestHandover={requestHandover}
        onRequestAITakeover={requestAITakeover}
        onReconnect={reconnect}
        onClearMessages={clearMessages}
      />

      {/* 聊天区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 消息列表 */}
        <div 
          style={{ 
            flex: 1, 
            padding: '16px', 
            overflowY: 'auto',
            backgroundColor: '#f5f5f5'
          }}
        >
          {convertedMessages.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              color: '#999'
            }}>
              <Card style={{ textAlign: 'center', border: 'none', boxShadow: 'none', backgroundColor: 'transparent' }}>
                <RobotOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                <h3 style={{ color: '#666', marginBottom: '8px' }}>OpenChatAgent - 智能客服</h3>
                <p style={{ color: '#999', margin: 0 }}>
                  {connectionStatus === 'connected' 
                    ? '您好！我是智能客服助手，很高兴为您服务！' 
                    : '正在连接服务器，请稍候...'}
                </p>
              </Card>
            </div>
          ) : (
            <>
              <Bubble.List 
                items={convertedMessages}
                style={{ marginBottom: '16px' }}
              />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div style={{ 
          padding: '16px', 
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#fff',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <Sender
            placeholder={
              connectionStatus === 'connected' 
                ? `向${handoverStatus === 'AI' ? 'AI助手' : '人工客服'}发送消息...`
                : '连接中，请稍候...'
            }
            onSubmit={handleSend}
            disabled={connectionStatus !== 'connected'}
            loading={isTyping}
            style={{ 
              maxWidth: 'none',
              borderRadius: '8px',
              border: '1px solid #d9d9d9',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
            }}

          />
          
          {/* 连接状态提示 */}
          {connectionStatus !== 'connected' && (
            <div style={{ 
              marginTop: '8px', 
              textAlign: 'center' 
            }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {connectionStatus === 'connecting' && '正在连接服务器...'}
                {connectionStatus === 'reconnecting' && '正在重新连接...'}
                {connectionStatus === 'disconnected' && '连接已断开，请检查网络'}
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 