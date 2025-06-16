import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketService, createWebSocketService } from '../services/websocketService';
import { ChatMessage, WebSocketMessage, ConnectionStatus, HandoverStatus, ChatState } from '../types';

/**
 * 聊天 Hook - 管理聊天状态和 WebSocket 连接
 */
export function useChat() {
  // 状态管理
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [handoverStatus, setHandoverStatus] = useState<HandoverStatus>('AI');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // 用户ID - 持久化存储
  const [userId] = useState(() => {
    const stored = localStorage.getItem('chat_user_id');
    if (stored) return stored;
    const newId = `user_${Date.now()}`;
    localStorage.setItem('chat_user_id', newId);
    return newId;
  });

  // WebSocket 服务实例
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // 初始化 WebSocket 服务
  useEffect(() => {
    const wsService = createWebSocketService({
      url: 'ws://localhost:8002',
      maxReconnectAttempts: 5,
      reconnectInterval: 2000,
      heartbeatInterval: 30000,
      enableReconnect: true,
      debug: true,
    });

    wsServiceRef.current = wsService;

    // 监听连接状态变化
    wsService.on('onConnectionStateChange', (state: ConnectionStatus) => {
      setConnectionStatus(state);
    });

    // 监听消息接收
    wsService.on('onMessage', handleWebSocketMessage);

    // 监听连接打开
    wsService.on('onOpen', () => {
      console.log('✅ WebSocket 连接已建立');
      // 发送欢迎消息
      addSystemMessage('欢迎使用智能客服系统！我是您的AI助手，很高兴为您服务！');
    });

    // 监听连接关闭
    wsService.on('onClose', () => {
      console.log('🔌 WebSocket 连接已关闭');
    });

    // 监听重连
    wsService.on('onReconnecting', () => {
      console.log('🔄 正在重连...');
    });

    // 监听重连成功
    wsService.on('onReconnected', () => {
      console.log('✅ 重连成功');
      addSystemMessage('连接已恢复');
    });

    // 启动连接
    wsService.connect();

    // 清理函数
    return () => {
      wsService.disconnect();
    };
  }, []);

  // 处理 WebSocket 消息
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    console.log('📨 收到消息:', data);

    // 消息去重
    let messageKey: string;
    if (data.type === 'stream') {
      const textLength = (data.fullText || data.text || '').length;
      messageKey = `${data.type}_${data.id}_${textLength}`;
      
      // 清理旧的流式消息缓存
      const streamPrefix = `${data.type}_${data.id}_`;
      const keysToDelete = Array.from(processedMessageIds.current).filter(
        key => key.startsWith(streamPrefix) && key !== messageKey
      );
      keysToDelete.forEach(key => processedMessageIds.current.delete(key));
    } else {
      messageKey = `${data.type}_${data.id || Date.now()}_${data.timestamp || ''}`;
    }

    if (processedMessageIds.current.has(messageKey)) {
      return; // 跳过重复消息
    }
    processedMessageIds.current.add(messageKey);

    // 处理不同类型的消息
    switch (data.type) {
      case 'stream':
        handleStreamMessage(data);
        break;
      case 'text':
        handleTextMessage(data);
        break;
      case 'system':
        handleSystemMessage(data);
        break;
      default:
        console.log('未知消息类型:', data.type);
    }
  }, []);

  // 处理流式消息
  const handleStreamMessage = useCallback((data: WebSocketMessage) => {
    const messageId = data.id!;
    const content = data.fullText || data.text || '';
    const isComplete = data.isComplete || false;
    const from = data.from || 'ai';

    setMessages(prev => {
      const existingIndex = prev.findIndex(msg => msg.id === messageId);
      
      const newMessage: ChatMessage = {
        id: messageId,
        content,
        role: from === 'user' ? 'user' : 'assistant',
        timestamp: data.timestamp || new Date().toISOString(),
        isStreaming: !isComplete,
      };

      if (existingIndex >= 0) {
        // 更新现有消息
        const newMessages = [...prev];
        newMessages[existingIndex] = newMessage;
        return newMessages;
      } else {
        // 添加新消息
        return [...prev, newMessage];
      }
    });

    // 设置打字状态
    setIsTyping(!isComplete);

    // 更新会话ID
    if (data.sessionId && !sessionId) {
      setSessionId(data.sessionId);
    }
  }, [sessionId]);

  // 处理普通文本消息
  const handleTextMessage = useCallback((data: WebSocketMessage) => {
    const message: ChatMessage = {
      id: data.id || uuidv4(),
      content: data.text || '',
      role: data.from === 'user' ? 'user' : 'assistant',
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'sent',
    };

    // 如果是用户消息的回复确认，更新对应消息状态
    if (data.from === 'user' && data.id) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );
    } else {
      // 添加新的助手消息
      setMessages(prev => [...prev, message]);
    }

    // 更新会话ID
    if (data.sessionId && !sessionId) {
      setSessionId(data.sessionId);
    }
  }, [sessionId]);

  // 处理系统消息
  const handleSystemMessage = useCallback((data: WebSocketMessage) => {
    if (data.action === 'handover') {
      // 处理转接状态变更
      const newStatus = data.text?.includes('人工') ? 'HUMAN' : 'AI';
      setHandoverStatus(newStatus);
      addSystemMessage(data.text || '状态已更新');
    } else {
      addSystemMessage(data.text || '系统消息');
    }
  }, []);

  // 添加系统消息
  const addSystemMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      id: uuidv4(),
      content,
      role: 'system',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    setMessages(prev => [...prev, message]);
  }, []);

  // 发送消息
  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !wsServiceRef.current) return;

    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    // 添加用户消息到界面
    const userMessage: ChatMessage = {
      id: messageId,
      content: content.trim(),
      role: 'user',
      timestamp,
      status: 'sending',
    };
    setMessages(prev => [...prev, userMessage]);

    // 发送到服务器
    const wsMessage: WebSocketMessage = {
      type: 'text',
      id: messageId,
      text: content.trim(),
      timestamp,
      userId,
      sessionId: sessionId || undefined,
    };

    const success = wsServiceRef.current.send(wsMessage);
    
    // 更新消息状态
    if (success) {
      // WebSocket 发送成功，等待服务器确认
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId && msg.status === 'sending'
              ? { ...msg, status: 'sent' }
              : msg
          )
        );
      }, 500); // 500ms 后自动标记为已发送
    } else {
      // WebSocket 发送失败
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'error' }
            : msg
        )
      );
    }
  }, [userId, sessionId]);

  // 转人工
  const requestHandover = useCallback(() => {
    if (!wsServiceRef.current) return;

    const message: WebSocketMessage = {
      type: 'system',
      action: 'request_handover',
      text: '用户请求转人工客服',
      userId,
      sessionId: sessionId || undefined,
      timestamp: new Date().toISOString(),
    };

    wsServiceRef.current.send(message);
    addSystemMessage('正在为您转接人工客服，请稍候...');
  }, [userId, sessionId, addSystemMessage]);

  // AI接管
  const requestAITakeover = useCallback(() => {
    if (!wsServiceRef.current) return;

    const message: WebSocketMessage = {
      type: 'system',
      action: 'ai_takeover',
      text: '请求AI接管对话',
      userId,
      sessionId: sessionId || undefined,
      timestamp: new Date().toISOString(),
    };

    wsServiceRef.current.send(message);
    addSystemMessage('正在切换到AI助手...');
  }, [userId, sessionId, addSystemMessage]);

  // 重连
  const reconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.reset();
      wsServiceRef.current.connect();
    }
  }, []);

  // 清空聊天记录
  const clearMessages = useCallback(() => {
    setMessages([]);
    processedMessageIds.current.clear();
    addSystemMessage('聊天记录已清空');
  }, [addSystemMessage]);

  // 返回聊天状态和操作函数
  const chatState: ChatState = {
    messages,
    connectionStatus,
    handoverStatus,
    isTyping,
    sessionId,
    userId,
  };

  return {
    // 状态
    ...chatState,
    
    // 操作函数
    sendMessage,
    requestHandover,
    requestAITakeover,
    reconnect,
    clearMessages,
    
    // 工具函数
    addSystemMessage,
  };
} 