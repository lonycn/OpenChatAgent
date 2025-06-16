// WebSocket 消息类型
export interface WebSocketMessage {
  type: 'text' | 'stream' | 'response' | 'system' | 'ping' | 'pong';
  id?: string;
  text?: string;
  fullText?: string;
  isComplete?: boolean;
  from?: 'user' | 'ai' | 'human' | 'system';
  timestamp?: string;
  sessionId?: string;
  userId?: string;
  action?: string;
}

// 聊天消息类型
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  isStreaming?: boolean;
}

// WebSocket 连接状态
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// 接待状态
export type HandoverStatus = 'AI' | 'HUMAN';

// WebSocket 服务配置
export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  enableReconnect?: boolean;
  debug?: boolean;
}

// 聊天状态
export interface ChatState {
  messages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  handoverStatus: HandoverStatus;
  isTyping: boolean;
  sessionId: string | null;
  userId: string;
} 