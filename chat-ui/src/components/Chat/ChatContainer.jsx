import React, { useState, useEffect, useRef } from 'react';
import Chat, { Bubble, useMessages } from '@chatui/core';
import StatusBar from './StatusBar';
import { createWebSocketService } from '../../services/robustWebSocketService';
import { v4 as uuidv4 } from 'uuid';
import WebSocketMonitor from '../Debug/WebSocketMonitor';
import ChatErrorBoundary from '../ErrorBoundary/ChatErrorBoundary';
import requestInterceptor from '../../utils/requestInterceptor';

const API_URL = import.meta.env.VITE_CHAT_CORE_API_URL || 'http://localhost:3001/api';

/**
 * 聊天容器组件
 * 整合 ChatUI 组件和 WebSocket 服务
 */
const ChatContainer = () => {
  const { messages, appendMsg, setTyping } = useMessages([]);
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [reconnectInfo, setReconnectInfo] = useState(null);
  const [connectionHealth, setConnectionHealth] = useState('disconnected');
  const [handoverStatus, setHandoverStatus] = useState('AI'); // AI or HUMAN
  const [sessionId, setSessionId] = useState(null);
  const [clientGeneratedUserId, setClientGeneratedUserId] = useState(null);
  const [showDebugMonitor, setShowDebugMonitor] = useState(false);
  const [interceptorStats, setInterceptorStats] = useState({});
  const wsServiceRef = useRef(null);
  const sessionInitialized = useRef(false);

  // 🚨 监听拦截器事件
  useEffect(() => {
    const handleHttpRequestBlocked = (event) => {
      console.log('🚫 HTTP request blocked:', event.detail);
      setInterceptorStats(prev => ({
        ...prev,
        blockedRequests: (prev.blockedRequests || 0) + 1,
        lastBlockedUrl: event.detail.url
      }));
    };

    const handleHttpRequestAllowed = (event) => {
      console.log('✅ HTTP request allowed:', event.detail);
      setInterceptorStats(prev => ({
        ...prev,
        allowedRequests: (prev.allowedRequests || 0) + 1,
        lastAllowedUrl: event.detail.url
      }));
    };

    window.addEventListener('httpRequestBlocked', handleHttpRequestBlocked);
    window.addEventListener('httpRequestAllowed', handleHttpRequestAllowed);

    return () => {
      window.removeEventListener('httpRequestBlocked', handleHttpRequestBlocked);
      window.removeEventListener('httpRequestAllowed', handleHttpRequestAllowed);
    };
  }, []);

  useEffect(() => {
    // Generate client-side user ID
    const userId = uuidv4();
    setClientGeneratedUserId(userId);
    console.log('Generated client user ID:', userId);

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

  // WebSocket Event Handlers
  const handleWebSocketOpen = () => {
    console.log('🔌 WebSocket connected');
    setConnectionStatus('CONNECTED');
    setConnectionHealth('connected');
    setReconnectInfo(null);

    // Initialize session if not already done
    if (!sessionInitialized.current) {
      initializeSession();
      sessionInitialized.current = true;
    }
  };

  const handleWebSocketMessage = (data) => {
    console.log('📨 Received message:', data);
    
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      
      switch (message.type) {
        case 'message':
        case 'response':
        case 'text':
          appendMsg({
            type: 'text',
            content: { text: message.content || message.text || message.message },
            position: 'left',
            user: {
              avatar: message.sender === 'AI' || message.role === 'assistant' ? '🤖' : '👨‍💼',
              name: message.sender === 'AI' || message.role === 'assistant' ? 'AI助手' : '人工客服'
            }
          });
          break;
          
        case 'handover':
          setHandoverStatus(message.to);
          appendMsg({
            type: 'text',
            content: { 
              text: message.to === 'HUMAN' 
                ? '已为您转接人工客服，请稍候...'
                : 'AI助手已接管对话'
            },
            position: 'center'
          });
          break;
          
        case 'system':
          if (message.status === 'initialized') {
            sessionInitialized.current = true;
            setSessionId(message.sessionId);
            console.log('✅ Session initialized successfully');
          }
          
          appendMsg({
            type: 'text',
            content: { text: message.content || message.message },
            position: 'center'
          });
          break;
          
        case 'stream':
          // Handle streaming messages
          handleStreamMessage(message);
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  const handleStreamMessage = (message) => {
    // For streaming messages, we need to update existing message or create new one
    const messageId = message.id || 'stream-' + Date.now();
    
    // This is a simplified implementation - ChatUI doesn't have built-in streaming support
    // We'll treat each stream chunk as a complete message for now
    appendMsg({
      type: 'text',
      content: { text: message.fullText || message.text },
      position: 'left',
      user: {
        avatar: '🤖',
        name: 'AI助手'
      }
    });
  };

  const handleWebSocketClose = (event) => {
    console.log('🔌 WebSocket disconnected:', event);
    setConnectionStatus('DISCONNECTED');
    setConnectionHealth('disconnected');
  };

  const handleWebSocketError = (error) => {
    console.error('🔌 WebSocket error:', error);
    setConnectionStatus('ERROR');
    setConnectionHealth('error');
  };

  const handleReconnecting = (attempt, maxAttempts) => {
    console.log(`🔄 Reconnecting... (${attempt}/${maxAttempts})`);
    setConnectionStatus('RECONNECTING');
    setConnectionHealth('reconnecting');
    setReconnectInfo({ attempt, maxAttempts });
  };

  const handleReconnected = () => {
    console.log('🔌 Reconnected successfully');
    setConnectionStatus('CONNECTED');
    setConnectionHealth('connected');
    setReconnectInfo(null);
  };

  const handleMaxReconnectAttemptsReached = () => {
    console.log('❌ Max reconnect attempts reached');
    setConnectionStatus('FAILED');
    setConnectionHealth('failed');
  };

  // Initialize session
  const initializeSession = () => {
    if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
      const initMessage = {
        type: 'init',
        payload: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          userId: clientGeneratedUserId
        }
      };
      
      wsServiceRef.current.send(initMessage);
      console.log('🚀 Session initialization sent');
      
      // Add welcome message
      appendMsg({
        type: 'text',
        content: { text: '您好！我是AI助手，有什么可以帮助您的吗？' },
        position: 'left',
        user: {
          avatar: '🤖',
          name: 'AI助手'
        }
      });
    }
  };

  // Handle message send
  const handleSend = (type, val) => {
    if (type === 'text' && val.trim()) {
      // Add user message
      const userMessage = {
        type: 'text',
        content: { text: val },
        position: 'right'
      };
      appendMsg(userMessage);

      // Send to server
      if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
        const messageToSend = {
          type: 'text',
          text: val,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          userId: clientGeneratedUserId
        };
        
        const sent = wsServiceRef.current.send(messageToSend);
        
        if (sent) {
          // Show typing indicator
          setTyping(true);
          setTimeout(() => setTyping(false), 3000);
        } else {
          // Queue message if disconnected
          appendMsg({
            type: 'text',
            content: { text: '连接已断开，消息将在重连后发送' },
            position: 'center'
          });
        }
      } else {
        // Queue message if disconnected
        appendMsg({
          type: 'text',
          content: { text: '连接已断开，消息将在重连后发送' },
          position: 'center'
        });
      }
    }
  };

  // Handle handover request
  const handleHandoverRequest = () => {
    const newStatus = handoverStatus === 'AI' ? 'HUMAN' : 'AI';
    
    if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
      wsServiceRef.current.send({
        type: 'handover_request',
        to: newStatus,
        timestamp: Date.now(),
        userId: clientGeneratedUserId
      });
    }
  };

  // Handle retry connection
  const handleRetryConnection = () => {
    if (wsServiceRef.current) {
      wsServiceRef.current.reset();
    }
  };

  // Clear messages
  const handleClearMessages = () => {
    // ChatUI useMessages doesn't have a clear method, so we'll need to work around this
    window.location.reload(); // Simple solution for now
  };

  // Toggle debug monitor
  const toggleDebugMonitor = () => {
    setShowDebugMonitor(!showDebugMonitor);
  };

  // Render message content
  const renderMessageContent = (msg) => {
    const { content } = msg;
    return <Bubble content={content.text} />;
  };

  return (
    <ChatErrorBoundary>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Status Bar */}
        <StatusBar
          connectionHealth={connectionHealth}
          reconnectInfo={reconnectInfo}
          handoverStatus={handoverStatus}
          onHandoverRequest={handleHandoverRequest}
        />

        {/* Debug Controls */}
        <div style={{
          padding: '8px 16px',
          background: '#fafafa',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span>Session: {sessionId || 'Not initialized'}</span>
            <span>User: {clientGeneratedUserId?.slice(0, 8)}...</span>
            {interceptorStats.blockedRequests > 0 && (
              <span style={{ color: '#ff4d4f' }}>
                🚫 Blocked: {interceptorStats.blockedRequests}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={toggleDebugMonitor}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                border: '1px solid #d9d9d9',
                borderRadius: '3px',
                background: showDebugMonitor ? '#1890ff' : 'white',
                color: showDebugMonitor ? 'white' : '#666',
                cursor: 'pointer'
              }}
            >
              Debug
            </button>
            
            <button
              onClick={handleClearMessages}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                border: '1px solid #d9d9d9',
                borderRadius: '3px',
                background: 'white',
                color: '#666',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
            
            {(connectionHealth === 'error' || connectionHealth === 'failed') && (
              <button
                onClick={handleRetryConnection}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  border: '1px solid #1890ff',
                  borderRadius: '3px',
                  background: 'white',
                  color: '#1890ff',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            )}
          </div>
        </div>

        {/* Chat Container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Chat
            navbar={{ title: 'OpenChatAgent' }}
            messages={messages}
            renderMessageContent={renderMessageContent}
            onSend={handleSend}
            placeholder="请输入消息..."
          />
          
          {/* Debug Monitor Overlay */}
          {showDebugMonitor && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '300px',
              maxHeight: '400px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '11px',
              overflow: 'auto',
              zIndex: 1000
            }}>
              <WebSocketMonitor wsService={wsServiceRef.current} />
            </div>
          )}
        </div>
      </div>
    </ChatErrorBoundary>
  );
};

export default ChatContainer;
