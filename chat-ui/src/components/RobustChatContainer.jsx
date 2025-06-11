import React, { useState, useEffect, useRef } from 'react';
import { ProChat } from '@ant-design/pro-chat';
import { createWebSocketService } from '../services/robustWebSocketService';

/**
 * 🔌 Robust Chat Container with Enhanced WebSocket Management
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat mechanism to detect dead connections
 * - Message queuing during disconnection
 * - Connection status indicators
 * - Error handling and recovery
 */
const RobustChatContainer = () => {
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [reconnectInfo, setReconnectInfo] = useState(null);
  const [connectionHealth, setConnectionHealth] = useState('disconnected');
  const wsServiceRef = useRef(null);
  const sessionInitialized = useRef(false);

  useEffect(() => {
    // Initialize WebSocket service
    wsServiceRef.current = createWebSocketService({
      debug: true,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000, // 30s
      pongTimeout: 10000, // 10s
      enableMessageQueue: true
    });

    const wsService = wsServiceRef.current;

    // Setup event handlers
    wsService.on('onOpen', handleWebSocketOpen);
    wsService.on('onMessage', handleWebSocketMessage);
    wsService.on('onClose', handleWebSocketClose);
    wsService.on('onError', handleWebSocketError);
    wsService.on('onReconnecting', handleReconnecting);
    wsService.on('onReconnected', handleReconnected);
    wsService.on('onMaxReconnectAttemptsReached', handleMaxReconnectAttemptsReached);

    // Connect
    wsService.connect();

    // Cleanup on unmount
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
    };
  }, []);

  // Monitor connection health and fetch server metrics
  useEffect(() => {
    const checkHealth = async () => {
      const state = wsServiceRef.current?.getConnectionState();
      
      if (state === 'connected') {
        setConnectionHealth('good');
        
        // Fetch server health metrics
        try {
          const response = await fetch('/api/websocket/health');
          if (response.ok) {
            const healthData = await response.json();
            console.log('Server health:', healthData);
          }
        } catch (error) {
          console.warn('Failed to fetch server health:', error);
        }
      } else if (state === 'connecting') {
        setConnectionHealth('poor');
      } else {
        setConnectionHealth('disconnected');
      }
    };

    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds
    checkHealth(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const handleWebSocketOpen = () => {
    console.log('✅ WebSocket connected in React component');
    setConnectionStatus('CONNECTED');
    setReconnectInfo(null);
    
    // Initialize session if not already done
    if (!sessionInitialized.current) {
      initializeSession();
    }
  };

  const handleWebSocketMessage = (message) => {
    console.log('📨 Message received:', message);
    
    if (message.type === 'system') {
      if (message.status === 'initialized') {
        sessionInitialized.current = true;
        console.log('✅ Session initialized successfully');
      }
      
      // Add system message to chat
      setMessages(prev => [...prev, {
        id: message.id || Date.now().toString(),
        content: message.message,
        createAt: new Date(message.timestamp).getTime(),
        role: 'assistant',
        meta: {
          avatar: '🤖',
          title: 'System',
          backgroundColor: '#f0f0f0'
        }
      }]);
    } else if (message.type === 'stream') {
      // Handle streaming message chunks
      setMessages(prev => {
        const existingIndex = prev.findIndex(msg => msg.id === message.id);
        
        if (existingIndex >= 0) {
          // Update existing streaming message
          const updatedMessages = [...prev];
          updatedMessages[existingIndex] = {
            ...updatedMessages[existingIndex],
            content: message.fullText || message.text,
            meta: {
              ...updatedMessages[existingIndex].meta,
              isStreaming: !message.isComplete
            }
          };
          return updatedMessages;
        } else {
          // Create new streaming message
          return [...prev, {
            id: message.id,
            content: message.fullText || message.text,
            createAt: new Date(message.timestamp).getTime(),
            role: 'assistant',
            meta: {
              avatar: '🤖',
              title: 'AI Assistant',
              isStreaming: !message.isComplete
            }
          }];
        }
      });
    } else if (message.type === 'response' || message.type === 'text') {
      // Handle complete AI response (either final streaming message or non-streaming)
      setMessages(prev => {
        const existingIndex = prev.findIndex(msg => msg.id === message.id);
        
        if (existingIndex >= 0) {
          // Update existing message (final streaming update)
          const updatedMessages = [...prev];
          updatedMessages[existingIndex] = {
            ...updatedMessages[existingIndex],
            content: message.content || message.text || message.fullText,
            meta: {
              ...updatedMessages[existingIndex].meta,
              isStreaming: false
            }
          };
          return updatedMessages;
        } else {
          // Add new complete AI response (non-streaming mode)
          return [...prev, {
            id: message.id || Date.now().toString(),
            content: message.content || message.text,
            createAt: new Date(message.timestamp).getTime(),
            role: 'assistant',
            meta: {
              avatar: '🤖',
              title: 'AI Assistant',
              isStreaming: false
            }
          }];
        }
      });
    }
  };

  const handleWebSocketClose = (event) => {
    console.log('🔌 WebSocket closed:', event);
    setConnectionStatus('DISCONNECTED');
    
    if (event.code !== 1000 && event.code !== 1001) {
      console.warn('⚠️ Abnormal WebSocket closure');
    }
  };

  const handleWebSocketError = (error) => {
    console.error('❌ WebSocket error:', error);
    setConnectionStatus('ERROR');
  };

  const handleReconnecting = (info) => {
    console.log('🔄 Reconnecting...', info);
    setConnectionStatus('RECONNECTING');
    setReconnectInfo(info);
  };

  const handleReconnected = () => {
    console.log('✅ Reconnected successfully');
    setConnectionStatus('CONNECTED');
    setReconnectInfo(null);
  };

  const handleMaxReconnectAttemptsReached = () => {
    console.error('❌ Max reconnection attempts reached');
    setConnectionStatus('FAILED');
    setReconnectInfo(null);
  };

  const initializeSession = () => {
    if (wsServiceRef.current) {
      const initMessage = {
        type: 'init',
        payload: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };
      
      wsServiceRef.current.send(initMessage);
      console.log('🚀 Session initialization sent');
    }
  };

  const handleSendMessage = async (content) => {
    if (!wsServiceRef.current || connectionStatus !== 'CONNECTED') {
      console.warn('Cannot send message - WebSocket not connected');
      return;
    }

    // 处理ProChat传递的参数 - 可能是字符串、对象或消息数组
    let messageText;
    
    console.log('ProChat content received:', content);
    
    if (typeof content === 'string') {
      messageText = content;
    } else if (Array.isArray(content)) {
      // ProChat直接传递消息数组，获取最新的用户消息
      const userMessages = content.filter(msg => msg && msg.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];
      
      if (lastUserMessage) {
        messageText = lastUserMessage.content || lastUserMessage.message || lastUserMessage.text;
        console.log('Extracted message from array:', messageText);
      } else {
        console.warn('No user message found in array:', content);
        return;
      }
    } else if (content && typeof content === 'object') {
      // ProChat传递包含messages数组的对象
      if (content.messages && Array.isArray(content.messages)) {
        // 获取最后一条用户消息
        const userMessages = content.messages.filter(msg => msg && msg.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];
        messageText = lastUserMessage ? (lastUserMessage.content || lastUserMessage.message || lastUserMessage.text) : '';
      } else if (content.content) {
        messageText = content.content;
      } else if (content.text) {
        messageText = content.text;
      } else if (content.message) {
        messageText = content.message;
      } else {
        console.warn('Unknown content format from ProChat:', content);
        return;
      }
    } else {
      console.warn('Invalid content type:', typeof content, content);
      return;
    }

    if (!messageText || !messageText.trim()) {
      console.warn('Empty message text');
      return;
    }

    // Add user message to chat immediately
    const userMessage = {
      id: Date.now().toString(),
      content: messageText,
      createAt: Date.now(),
      role: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Send message via WebSocket
    const messageToSend = {
      type: 'text',
      text: messageText,
      id: userMessage.id,
      timestamp: new Date().toISOString()
    };

    const sent = wsServiceRef.current.send(messageToSend);
    
    if (!sent) {
      console.warn('Message queued due to connection issues');
      // Show user that message is queued
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, meta: { ...msg.meta, status: 'queued' } }
          : msg
      ));
    }
  };

  const handleRetryConnection = () => {
    if (wsServiceRef.current) {
      wsServiceRef.current.reset();
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'CONNECTED': return '#52c41a';
      case 'CONNECTING': return '#1890ff';
      case 'RECONNECTING': return '#faad14';
      case 'ERROR': return '#ff4d4f';
      case 'FAILED': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'CONNECTED': return '已连接';
      case 'CONNECTING': return '连接中...';
      case 'RECONNECTING': return `重连中... (${reconnectInfo?.attempt}/${reconnectInfo?.maxAttempts})`;
      case 'ERROR': return '连接错误';
      case 'FAILED': return '连接失败';
      default: return '未连接';
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Connection Status Bar */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #d9d9d9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getConnectionStatusColor()
          }} />
          <span style={{ fontSize: '14px', color: '#666' }}>
            {getConnectionStatusText()}
          </span>
          {reconnectInfo && (
            <span style={{ fontSize: '12px', color: '#999' }}>
              (延迟: {Math.round(reconnectInfo.delay / 1000)}s)
            </span>
          )}
        </div>
        
        {(connectionStatus === 'ERROR' || connectionStatus === 'FAILED') && (
          <button
            onClick={handleRetryConnection}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: '1px solid #1890ff',
              backgroundColor: '#fff',
              color: '#1890ff',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            重试连接
          </button>
        )}
      </div>

      {/* Chat Interface */}
      <div style={{ flex: 1 }}>
        <ProChat
          loading={connectionStatus === 'CONNECTING' || connectionStatus === 'DISCONNECTED'}
          chats={messages}
          onChatsChange={setMessages}
          request={handleSendMessage}
          config={{
            model: 'gpt-3.5-turbo',
            systemRole: 'You are a helpful AI assistant powered by a robust WebSocket connection.'
          }}
          assistantMeta={{
            avatar: '🤖',
            title: 'AI Assistant',
            backgroundColor: '#f0f0f0'
          }}
          userMeta={{
            avatar: '👤',
            title: 'You'
          }}
          placeholder="输入消息... (支持断线重连和消息队列)"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};

export default RobustChatContainer;