import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketService, createWebSocketService } from '../services/websocketService';
import { ChatMessage, WebSocketMessage, ConnectionStatus, HandoverStatus } from '../types';

interface StreamingChatState {
  messages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  handoverStatus: HandoverStatus;
  isTyping: boolean;
  sessionId: string | null;
  userId: string;
}

interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  timestamp: string;
}

/**
 * 流式聊天Hook - 专门处理WebSocket流式消息
 * 优化版本：避免重复系统消息，支持Markdown渲染
 */
export function useStreamingChat() {
  // 基础状态
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

  // WebSocket服务和流式消息管理
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const streamingMessagesRef = useRef<Map<string, StreamingMessage>>(new Map());
  const processedMessageIds = useRef<Set<string>>(new Set());
  const systemMessagesSent = useRef<Set<string>>(new Set()); // 避免重复系统消息

  // 初始化WebSocket连接
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
      console.log('🔗 连接状态变化:', state);
    });

    // 监听消息接收
    wsService.on('onMessage', handleWebSocketMessage);

    // 监听连接打开
    wsService.on('onOpen', () => {
      console.log('✅ WebSocket连接已建立');
      addSystemMessage('欢迎使用智能客服系统！我是您的AI助手，很高兴为您服务！');
    });

    // 监听连接关闭
    wsService.on('onClose', () => {
      console.log('🔌 WebSocket连接已关闭');
      setIsTyping(false);
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

    return () => {
      wsService.disconnect();
    };
  }, []);

  // 添加系统消息（避免重复）
  const addSystemMessage = useCallback((content: string) => {
    // 避免重复的系统消息
    const messageHash = `system_${content}`;
    if (systemMessagesSent.current.has(messageHash)) {
      console.log('⚠️ 跳过重复系统消息:', content);
      return;
    }
    systemMessagesSent.current.add(messageHash);

    const message: ChatMessage = {
      id: uuidv4(),
      content,
      role: 'system',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    setMessages(prev => [...prev, message]);
  }, []);

  // 处理WebSocket消息的核心逻辑
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    console.log('📨 收到WebSocket消息:', data);

    // 消息去重检查
    const messageKey = `${data.type}_${data.id}_${data.timestamp}`;
    if (processedMessageIds.current.has(messageKey)) {
      console.log('⚠️ 跳过重复消息:', messageKey);
      return;
    }
    processedMessageIds.current.add(messageKey);

    switch (data.type) {
      case 'stream':
        handleStreamMessage(data);
        break;
      case 'response':
        // response类型消息标记流式消息的真正结束
        handleResponseMessage(data);
        break;
      case 'text':
        handleTextMessage(data);
        break;
      case 'system':
        handleSystemMessage(data);
        break;
      default:
        console.log('❓ 未知消息类型:', data.type);
    }
  }, []);

  // 处理流式消息 - 核心功能
  const handleStreamMessage = useCallback((data: WebSocketMessage) => {
    if (!data.id) {
      console.error('❌ 流式消息缺少ID');
      return;
    }

    const messageId = data.id;
    const currentContent = data.fullText || data.text || '';
    const isComplete = data.isComplete || false;
    const from = data.from || 'ai';

    console.log('🌊 处理流式消息:', {
      id: messageId,
      contentLength: currentContent.length,
      isComplete,
      from
    });

    // 更新流式消息缓存
    streamingMessagesRef.current.set(messageId, {
      id: messageId,
      content: currentContent,
      isComplete,
      timestamp: data.timestamp || new Date().toISOString(),
    });

    // 更新消息列表
    setMessages(prev => {
      const existingIndex = prev.findIndex(msg => msg.id === messageId);
      
      const newMessage: ChatMessage = {
        id: messageId,
        content: currentContent,
        role: from === 'user' ? 'user' : 'assistant',
        timestamp: data.timestamp || new Date().toISOString(),
        isStreaming: !isComplete,
        status: 'sent',
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

    // 如果流式消息完成，清理缓存
    if (isComplete) {
      console.log('✅ 流式消息完成:', messageId);
      streamingMessagesRef.current.delete(messageId);
    }

    // 更新打字状态 - 基于是否还有活跃的流式消息
    setIsTyping(streamingMessagesRef.current.size > 0);

    // 更新会话ID
    if (data.sessionId && !sessionId) {
      setSessionId(data.sessionId);
    }
  }, [sessionId]);

  // 处理响应消息 - 标记流式消息的真正结束
  const handleResponseMessage = useCallback((data: WebSocketMessage) => {
    if (!data.id) {
      console.error('❌ 响应消息缺少ID');
      return;
    }

    const messageId = data.id;
    console.log('🏁 处理响应消息 - 流式结束:', {
      id: messageId,
      isComplete: data.isComplete
    });

    // 确保对应的流式消息被标记为完成
    if (streamingMessagesRef.current.has(messageId)) {
      streamingMessagesRef.current.delete(messageId);
      console.log('✅ 清理流式消息缓存:', messageId);
    }

    // 更新消息列表，确保消息不再处于流式状态
    setMessages(prev => {
      return prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            isStreaming: false,
            status: 'sent' as const,
          };
        }
        return msg;
      });
    });

    // 强制更新打字状态 - 确保清除"正在输入"状态
    setIsTyping(false);
    
    // 延时再次检查，确保状态正确
    setTimeout(() => {
      setIsTyping(streamingMessagesRef.current.size > 0);
      console.log('🔄 更新打字状态，活跃流式消息数:', streamingMessagesRef.current.size);
    }, 100);

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

    console.log('💬 处理文本消息:', message);

    setMessages(prev => [...prev, message]);

    // 更新会话ID
    if (data.sessionId && !sessionId) {
      setSessionId(data.sessionId);
    }
  }, [sessionId]);

  // 处理系统消息（优化版本 - 避免重复显示）
  const handleSystemMessage = useCallback((data: WebSocketMessage) => {
    console.log('🔧 处理系统消息:', data);

    // 过滤掉不需要显示的系统消息
    const shouldShowMessage = (text: string) => {
      // 过滤掉"系统消息"这种无意义的消息
      if (text === '系统消息' || text === 'System message') {
        return false;
      }
      // 过滤掉空消息
      if (!text || text.trim() === '') {
        return false;
      }
      return true;
    };

    if (data.action === 'handover') {
      const newStatus = data.text?.includes('人工') ? 'HUMAN' : 'AI';
      setHandoverStatus(newStatus);
      
      // 只有在状态真正改变时才显示消息
      if (data.text && shouldShowMessage(data.text)) {
        addSystemMessage(data.text);
      }
    } else if (data.text && shouldShowMessage(data.text)) {
      // 只显示有意义的系统消息
      addSystemMessage(data.text);
    }
  }, [addSystemMessage]);

  // 发送消息
  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !wsServiceRef.current) {
      console.warn('⚠️ 消息为空或WebSocket未连接');
      return;
    }

    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    console.log('📤 发送消息:', { id: messageId, content: content.trim() });

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
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: success ? 'sent' : 'error' }
            : msg
        )
      );
    }, 300);
  }, [userId, sessionId]);

  // 转人工
  const requestHandover = useCallback(() => {
    if (!wsServiceRef.current) return;

    console.log('👨‍💼 请求转人工');

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

    console.log('🤖 请求AI接管');

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
    console.log('🔄 手动重连');
    if (wsServiceRef.current) {
      wsServiceRef.current.reset();
      wsServiceRef.current.connect();
    }
  }, []);

  // 清空聊天记录
  const clearMessages = useCallback(() => {
    console.log('🗑️ 清空聊天记录');
    setMessages([]);
    streamingMessagesRef.current.clear();
    processedMessageIds.current.clear();
    systemMessagesSent.current.clear(); // 清空系统消息记录
    addSystemMessage('聊天记录已清空');
  }, [addSystemMessage]);

  // 获取当前流式消息状态
  const getStreamingStatus = useCallback(() => {
    return {
      activeStreams: streamingMessagesRef.current.size,
      isAnyStreaming: streamingMessagesRef.current.size > 0,
    };
  }, []);

  const chatState: StreamingChatState = {
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
    getStreamingStatus,
  };
} 