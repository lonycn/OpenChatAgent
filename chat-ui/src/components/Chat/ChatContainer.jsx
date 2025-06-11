import React, { useState, useEffect, useMemo } from 'react';
import { ProChat } from '@ant-design/pro-chat';
import { Button, Tag, Switch, Card } from 'antd';
import { ReloadOutlined, BugOutlined, ClearOutlined } from '@ant-design/icons';
import * as websocketService from '../../services/websocketService';
import { v4 as uuidv4 } from 'uuid';
import WebSocketMonitor from '../Debug/WebSocketMonitor';
import ChatErrorBoundary from '../ErrorBoundary/ChatErrorBoundary';
import SimpleChatInterface from './SimpleChatInterface';
import requestInterceptor from '../../utils/requestInterceptor';

const API_URL = import.meta.env.VITE_CHAT_CORE_API_URL || 'http://localhost:3001/api';

const ChatContainer = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentAgent, setCurrentAgent] = useState('ai');
  const [isSwitchingAgent, setIsSwitchingAgent] = useState(false);
  const [clientGeneratedUserId, setClientGeneratedUserId] = useState(null);
  const [showDebugMonitor, setShowDebugMonitor] = useState(true);
  const [useSimpleInterface, setUseSimpleInterface] = useState(true); // 默认使用简单界面，更稳定
  const [interceptorStats, setInterceptorStats] = useState({});

  // 🚨 监听拦截器事件
  useEffect(() => {
    const handleHttpRequestBlocked = (event) => {
      console.log('🚫 HTTP请求被拦截:', event.detail);
      setInterceptorStats(requestInterceptor.getStats());
    };

    window.addEventListener('httpRequestBlocked', handleHttpRequestBlocked);

    // 定期更新拦截器统计
    const statsInterval = setInterval(() => {
      setInterceptorStats(requestInterceptor.getStats());
    }, 2000);

    return () => {
      window.removeEventListener('httpRequestBlocked', handleHttpRequestBlocked);
      clearInterval(statsInterval);
    };
  }, []);

  // WebSocket配置对象 - 使用useMemo确保只创建一次
  const websocketConfig = useMemo(() => ({
    onOpen: () => {
      console.log('ChatContainer: WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
    },
    onMessage: (receivedMessage) => {
      console.log('ChatContainer: WebSocket message received:', receivedMessage);
      setIsLoading(false);

      if (receivedMessage.type === 'system' && receivedMessage.status === 'initialized') {
        setSessionId(receivedMessage.sessionId);
        if(receivedMessage.userId !== clientGeneratedUserId) {
          console.warn("User ID mismatch. Client:", clientGeneratedUserId, "Server used/confirmed:", receivedMessage.userId);
        }
        setCurrentAgent(receivedMessage.currentAgent || 'ai');
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: receivedMessage.id || uuidv4(),
            role: 'system',
            content: receivedMessage.message || `Session initialized. Session ID: ${receivedMessage.sessionId}`,
            createTime: receivedMessage.timestamp ? new Date(receivedMessage.timestamp).getTime() : Date.now(),
          },
        ]);
      } else if (receivedMessage.type === 'system_ack' ||
                 (receivedMessage.from === 'system' &&
                  receivedMessage.type !== 'error' &&
                  !(receivedMessage.type === 'system' && receivedMessage.status === 'initialized'))) {
         setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: receivedMessage.id || uuidv4(),
            role: 'system',
            content: receivedMessage.text || receivedMessage.message,
            createTime: receivedMessage.timestamp ? new Date(receivedMessage.timestamp).getTime() : Date.now(),
          },
        ]);
         if (receivedMessage.newAgent) {
          setCurrentAgent(receivedMessage.newAgent);
        }
      } else if (receivedMessage.type === 'error') {
         setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: receivedMessage.id || uuidv4(),
            role: 'system',
            content: `Server Error: ${receivedMessage.message || receivedMessage.text || 'Unknown error from server.'}`,
            createTime: receivedMessage.timestamp ? new Date(receivedMessage.timestamp).getTime() : Date.now(),
          },
        ]);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: receivedMessage.id || uuidv4(),
            role: receivedMessage.from === 'ai' || receivedMessage.from === 'assistant' ? 'assistant' : 'system',
            content: receivedMessage.text || receivedMessage.content,
            createTime: receivedMessage.timestamp ? new Date(receivedMessage.timestamp).getTime() : Date.now(),
          },
        ]);
      }
    },
    onClose: (event) => {
      console.log('ChatContainer: WebSocket disconnected', event);
      setIsConnected(false);
      setIsConnecting(false);
    },
    onError: (errorEvent) => {
      console.error('ChatContainer: WebSocket error event:', errorEvent);
      setIsConnected(false);
      setIsConnecting(false);
      setIsLoading(false);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: uuidv4(),
          role: 'system',
          content: 'Connection error. Please check your connection or try refreshing.',
          createTime: Date.now(),
        },
      ]);
    }
  }), []); // 空依赖数组，只创建一次

  // 初始化用户ID
  useEffect(() => {
    if (!clientGeneratedUserId) {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setClientGeneratedUserId(userId);
      console.log('ChatContainer: Generated client user ID:', userId);
    }
  }, [clientGeneratedUserId]);

  // WebSocket连接管理 - 增加防抖和重连限制
  useEffect(() => {
    let connectionTimeout;
    let reconnectCount = 0;
    const maxReconnects = 3;
    const reconnectDelay = 3000; // 3秒延迟

    const attemptConnection = () => {
      if (reconnectCount >= maxReconnects) {
        console.warn(`ChatContainer: 已达到最大重连次数 (${maxReconnects})，停止重连`);
        return;
      }

      if (clientGeneratedUserId && !isConnected && !isConnecting) {
        console.log(`ChatContainer: 尝试连接WebSocket... (第${reconnectCount + 1}次)`);
        setIsConnecting(true);
        reconnectCount++;
        
        try {
          websocketService.connect(websocketConfig);
        } catch (error) {
          console.error('ChatContainer: WebSocket连接失败:', error);
          setIsConnecting(false);
          
          // 延迟重连
          if (reconnectCount < maxReconnects) {
            connectionTimeout = setTimeout(attemptConnection, reconnectDelay);
          }
        }
      }
    };

    // 防抖连接 - 延迟500ms后再尝试连接
    connectionTimeout = setTimeout(attemptConnection, 500);

    // 清理函数
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      console.log('ChatContainer: Component unmounting, disconnecting WebSocket...');
        websocketService.disconnect();
    };
  }, [clientGeneratedUserId, isConnected, isConnecting, websocketConfig]);

  const handleSendMessage = async (message) => {
    if (!message?.trim()) {
      console.warn('ChatContainer: Empty message, ignoring');
      return;
    }

    console.log('ChatContainer: Sending message via WebSocket:', message);
    setIsLoading(true);

    try {
      if (!sessionId) {
        // 第一条消息，需要初始化会话
        console.log('ChatContainer: Initializing session with first message');
        const initMessage = {
      id: uuidv4(),
        type: 'init',
        payload: {
            userId: clientGeneratedUserId,
          initialMessage: {
              text: message.trim(),
              type: 'text'
          }
        },
          timestamp: new Date().toISOString()
        };

        await websocketService.sendMessage(initMessage);
    } else {
        // 后续消息
        const textMessage = {
          id: uuidv4(),
        type: 'text',
          text: message.trim(),
        sessionId: sessionId,
          userId: clientGeneratedUserId,
          timestamp: new Date().toISOString()
        };

        await websocketService.sendMessage(textMessage);
      }

      // 添加用户消息到UI
      const userMessage = {
        id: uuidv4(),
        role: 'user',
        content: message.trim(),
        createTime: Date.now(),
      };

      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setInputValue(''); // 清空输入框

    } catch (error) {
      console.error('ChatContainer: Error sending message:', error);
      setIsLoading(false);

      const errorMessage = {
        id: uuidv4(),
        role: 'system',
        content: `Failed to send message: ${error.message}`,
        createTime: Date.now(),
      };

      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
  };

  const handleSwitchAgent = async () => {
    if (!sessionId) {
      console.warn('ChatContainer: Cannot switch agent - no active session');
      return;
    }

    console.log('ChatContainer: Switching agent from', currentAgent);
    setIsSwitchingAgent(true);

    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/switch-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentAgent: currentAgent,
          userId: clientGeneratedUserId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ChatContainer: Agent switch response:', result);

      if (result.success) {
        setCurrentAgent(result.newAgent);
        
        const systemMessage = {
          id: uuidv4(),
          role: 'system',
          content: result.message || `Switched to ${result.newAgent} agent`,
          createTime: Date.now(),
        };

        setMessages((prevMessages) => [...prevMessages, systemMessage]);
      } else {
        throw new Error(result.error || 'Failed to switch agent');
      }

    } catch (error) {
      console.error('ChatContainer: Error switching agent:', error);
      
      const errorMessage = {
        id: uuidv4(),
        role: 'system',
        content: `Failed to switch agent: ${error.message}`,
        createTime: Date.now(),
      };

      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsSwitchingAgent(false);
    }
  };

  const handleClearStats = () => {
    requestInterceptor.clearStats();
    setInterceptorStats(requestInterceptor.getStats());
    console.log('✅ 拦截器统计已清理');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#f5f5f5' }}>
      {/* 左侧：聊天界面 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {/* 顶部控制栏 */}
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Tag color={isConnected ? 'green' : 'red'}>
              {isConnected ? '已连接' : '未连接'}
            </Tag>
            
            <Tag color={currentAgent === 'ai' ? 'blue' : 'orange'}>
              {currentAgent === 'ai' ? 'AI客服' : '人工客服'}
            </Tag>

            {sessionId && (
              <Tag color="purple">
                会话: {sessionId.substring(0, 8)}...
              </Tag>
            )}

            {interceptorStats.totalBlocked > 0 && (
              <Tag color="red">
                🚫 已拦截: {interceptorStats.totalBlocked}
              </Tag>
            )}
      </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Switch
              checked={useSimpleInterface}
              onChange={setUseSimpleInterface}
              checkedChildren="简单界面"
              unCheckedChildren="ProChat"
              size="small"
            />
            
            <Switch
              checked={showDebugMonitor}
              onChange={setShowDebugMonitor}
              checkedChildren="调试"
              unCheckedChildren="调试"
              size="small"
            />

            <Button
              type="primary"
              size="small"
              onClick={handleSwitchAgent}
              loading={isSwitchingAgent}
              disabled={!sessionId}
            >
              {currentAgent === 'ai' ? '转人工' : 'AI接管'}
          </Button>

            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={handleClearStats}
              title="清理拦截器统计"
            >
              清理
          </Button>

            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              title="刷新页面"
            >
              刷新
        </Button>
          </div>
      </div>

        {/* 聊天区域 */}
        <div style={{ flex: 1, overflow: 'hidden', height: '100%' }}>
          <ChatErrorBoundary>
            {useSimpleInterface ? (
              <SimpleChatInterface
                messages={messages}
                onSend={handleSendMessage}
                input={inputValue}
                onInputChange={setInputValue}
                loading={isLoading || isSwitchingAgent}
                helloMessage="欢迎使用AI智能客服系统！请输入您的问题。"
                placeholder="请输入您的问题..."
              />
            ) : (
        <ProChat
          messages={messages}
          onSend={handleSendMessage}
          input={inputValue}
          onInputChange={setInputValue}
                loading={isLoading || isSwitchingAgent}
                // 🚨 完全禁用HTTP请求 - 使用最简配置
                request={false}
                // 基础配置
                helloMessage="欢迎使用AI智能客服系统！请输入您的问题。"
                placeholder="请输入您的问题..."
                // 样式配置
                style={{ height: '100%' }}
                // 🔧 修复ProChat配置错误 - 使用最简配置
                config={{
                  enableHistoryCount: false,
                  historyCount: 0,
                  enablePlugins: false,
                  enableAutoScroll: true,
                  showTitle: false,
                  showClearButton: false,
                  showModelSwitcher: false,
                  enableStreamRender: false
                }}
                // 禁用可能触发HTTP请求的功能
                enablePlugins={false}
                enableStreamRender={false}
                modelProvider={null}
                // 🚨 移除有问题的chatItemRenderConfig配置
              />
            )}
          </ChatErrorBoundary>
        </div>
      </div>
      
      {/* 右侧：调试监控面板 */}
      {showDebugMonitor && (
        <div style={{ width: '400px', display: 'flex', flexDirection: 'column' }}>
          <WebSocketMonitor 
            websocketService={websocketService}
            isConnected={isConnected}
            sessionId={sessionId}
            interceptorStats={interceptorStats}
            requestInterceptor={requestInterceptor}
          />
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
