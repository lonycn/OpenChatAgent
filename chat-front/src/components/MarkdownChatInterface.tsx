import React, { useEffect, useRef, useState } from 'react';
import { Bubble, Sender } from '@ant-design/x';
import { Avatar, Card, Typography, Space, Tag, Button } from 'antd';
import { 
  RobotOutlined, 
  UserOutlined, 
  CheckOutlined, 
  ClockCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  ClearOutlined,
  SwapOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { ChatMessage } from '../types';

const { Text } = Typography;

/**
 * Markdown聊天界面组件
 * 支持完整的Markdown渲染，包括代码高亮、表格、列表等
 */
export const MarkdownChatInterface: React.FC = () => {
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
    getStreamingStatus,
  } = useStreamingChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 渲染消息状态图标
  const renderMessageStatus = (message: ChatMessage) => {
    if (message.role !== 'user') return null;

    switch (message.status) {
      case 'sending':
        return <ClockCircleOutlined style={{ color: '#1890ff', marginLeft: 8 }} />;
      case 'sent':
        return <CheckOutlined style={{ color: '#52c41a', marginLeft: 8 }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} />;
      default:
        return null;
    }
  };

  // 渲染用户头像
  const renderUserAvatar = () => (
    <Avatar 
      size={32} 
      icon={<UserOutlined />} 
      style={{ 
        backgroundColor: '#1890ff',
        flexShrink: 0
      }} 
    />
  );

  // 渲染AI头像
  const renderAIAvatar = () => (
    <Avatar 
      size={32} 
      icon={<RobotOutlined />} 
      style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        flexShrink: 0
      }} 
    />
  );

  // 渲染系统头像
  const renderSystemAvatar = () => (
    <Avatar 
      size={32} 
      style={{ 
        backgroundColor: '#f0f0f0',
        color: '#666',
        flexShrink: 0
      }}
    >
      系统
    </Avatar>
  );

  // Markdown组件配置
  const markdownComponents = {
    // 代码块样式
    code: ({ node, inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code 
            style={{
              backgroundColor: '#f6f8fa',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '0.9em',
              fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
            }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <pre style={{ 
          backgroundColor: '#f6f8fa',
          padding: '16px',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '0.9em'
        }}>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    // 表格样式
    table: ({ children }: any) => (
      <div style={{ overflowX: 'auto', margin: '16px 0' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          border: '1px solid #d0d7de'
        }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th style={{ 
        padding: '8px 12px',
        backgroundColor: '#f6f8fa',
        border: '1px solid #d0d7de',
        fontWeight: 600,
        textAlign: 'left'
      }}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td style={{ 
        padding: '8px 12px',
        border: '1px solid #d0d7de'
      }}>
        {children}
      </td>
    ),
    // 列表样式
    ul: ({ children }: any) => (
      <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li style={{ margin: '4px 0' }}>
        {children}
      </li>
    ),
    // 引用样式
    blockquote: ({ children }: any) => (
      <blockquote style={{
        borderLeft: '4px solid #d0d7de',
        paddingLeft: '16px',
        margin: '16px 0',
        color: '#656d76',
        fontStyle: 'italic'
      }}>
        {children}
      </blockquote>
    ),
    // 链接样式
    a: ({ children, href }: any) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: '#0969da', textDecoration: 'none' }}
        onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
        onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
      >
        {children}
      </a>
    ),
    // 标题样式
    h1: ({ children }: any) => <h1 style={{ fontSize: '1.5em', margin: '16px 0 8px 0', fontWeight: 600 }}>{children}</h1>,
    h2: ({ children }: any) => <h2 style={{ fontSize: '1.3em', margin: '16px 0 8px 0', fontWeight: 600 }}>{children}</h2>,
    h3: ({ children }: any) => <h3 style={{ fontSize: '1.1em', margin: '16px 0 8px 0', fontWeight: 600 }}>{children}</h3>,
    // 段落样式
    p: ({ children }: any) => <p style={{ margin: '8px 0', lineHeight: '1.6' }}>{children}</p>,
  };

  // 渲染消息内容
  const renderMessageContent = (message: ChatMessage) => {
    if (message.role === 'system') {
      return message.content;
    }

    // 对于AI和用户消息，使用Markdown渲染
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {message.content}
      </ReactMarkdown>
    );
  };

  // 转换消息格式为Ant Design X格式
  const convertToAntDXMessages = () => {
    return messages.map((message) => {
      const baseMessage = {
        key: message.id,
        content: renderMessageContent(message),
        timestamp: new Date(message.timestamp).getTime(),
      };

      switch (message.role) {
        case 'user':
          return {
            ...baseMessage,
            placement: 'end' as const,
            avatar: renderUserAvatar(),
            status: renderMessageStatus(message),
          };
        case 'assistant':
          return {
            ...baseMessage,
            placement: 'start' as const,
            avatar: renderAIAvatar(),
            typing: message.isStreaming ? {
              step: message.content.length,
              perStep: 1,
            } : undefined,
            variant: message.isStreaming ? 'shadow' as const : undefined,
          };
        case 'system':
          return {
            ...baseMessage,
            placement: 'start' as const,
            avatar: renderSystemAvatar(),
            variant: 'borderless' as const,
            styles: {
              content: {
                backgroundColor: '#f6f6f6',
                color: '#666',
                fontSize: '12px',
                padding: '8px 12px',
                borderRadius: '12px',
                textAlign: 'center' as const,
                width: '100%',
                margin: '0 auto',
              }
            }
          };
        default:
          return {
            ...baseMessage,
            placement: 'start' as const,
            avatar: renderSystemAvatar(),
          };
      }
    });
  };

  // 处理消息发送
  const handleSend = (message: string) => {
    if (message.trim()) {
      sendMessage(message.trim());
      setInputValue(''); // 清空输入框
    }
  };

  // 获取连接状态颜色
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#52c41a';
      case 'connecting': return '#1890ff';
      case 'reconnecting': return '#faad14';
      case 'disconnected': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 获取连接状态文本
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '已连接';
      case 'connecting': return '连接中';
      case 'reconnecting': return '重连中';
      case 'disconnected': return '已断开';
      default: return '未知';
    }
  };

  // 获取接待状态信息
  const getHandoverStatusInfo = () => {
    return handoverStatus === 'AI' 
      ? { text: 'AI助手', color: '#1890ff', icon: <RobotOutlined /> }
      : { text: '人工客服', color: '#52c41a', icon: <UserOutlined /> };
  };

  const handoverInfo = getHandoverStatusInfo();
  const streamingStatus = getStreamingStatus();

  return (
    <Card 
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        border: 'none',
        borderRadius: 0,
      }}
      styles={{
        body: {
          padding: 0, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column' 
        }
      }}
    >
      {/* 状态栏 */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        flexShrink: 0,
      }}>
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>} size="middle">
          {/* 连接状态 */}
          <Space size="small">
            <div 
              style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: getConnectionStatusColor() 
              }} 
            />
            <Text style={{ fontSize: 12 }}>{getConnectionStatusText()}</Text>
          </Space>

          {/* 接待状态 */}
          <Space size="small">
            <Tag 
              icon={handoverInfo.icon} 
              color={handoverInfo.color}
              style={{ margin: 0 }}
            >
              {handoverInfo.text}
            </Tag>
          </Space>

          {/* 会话信息 */}
          {sessionId && (
            <Text style={{ fontSize: 12, color: '#666' }}>
              会话: {sessionId.slice(-8)}
            </Text>
          )}

          {/* 流式状态 */}
          {isTyping && (
            <Tag color="processing" style={{ margin: 0 }}>
              正在输入...
            </Tag>
          )}
        </Space>

        {/* 操作按钮 */}
        <div style={{ marginTop: 8 }}>
          <Space size="small">
            {handoverStatus === 'AI' ? (
              <Button 
                size="small" 
                type="primary" 
                ghost
                icon={<SwapOutlined />}
                onClick={requestHandover}
                disabled={connectionStatus !== 'connected'}
              >
                转人工
              </Button>
            ) : (
              <Button 
                size="small" 
                type="primary" 
                ghost
                icon={<RobotOutlined />}
                onClick={requestAITakeover}
                disabled={connectionStatus !== 'connected'}
              >
                AI接管
              </Button>
            )}
            
            <Button 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={reconnect}
              disabled={connectionStatus === 'connecting'}
            >
              重连
            </Button>
            
            <Button 
              size="small" 
              icon={<ClearOutlined />}
              onClick={clearMessages}
            >
              清空
            </Button>
          </Space>
        </div>
      </div>

      {/* 消息列表 */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Bubble.List
          items={convertToAntDXMessages()}
          style={{ 
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
          }}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        flexShrink: 0,
      }}>
        <Sender
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          placeholder={
            connectionStatus === 'connected' 
              ? `向${handoverInfo.text}发送消息...` 
              : '连接中，请稍候...'
          }
          disabled={connectionStatus !== 'connected'}
          loading={isTyping}
          style={{ width: '100%' }}
        />
      </div>

      {/* 调试信息 - 已隐藏，如需显示请在URL添加?debug参数 */}
      {process.env.NODE_ENV === 'development' && new URLSearchParams(window.location.search).has('debug') && (
        <div style={{ 
          position: 'fixed', 
          bottom: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '8px 12px', 
          borderRadius: 4, 
          fontSize: 12,
          zIndex: 1000,
        }}>
          <div>用户: {userId}</div>
          <div>消息数: {messages.length}</div>
          <div>流式: {streamingStatus.activeStreams}</div>
          <div>状态: {connectionStatus}</div>
        </div>
      )}
    </Card>
  );
};

export default MarkdownChatInterface;