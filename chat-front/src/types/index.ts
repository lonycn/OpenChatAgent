// WebSocket 消息类型
export interface WebSocketMessage {
  type: 'message' | 'text' | 'stream' | 'response' | 'system' | 'ping' | 'pong' | 'heartbeat' | 'ai_stream';
  id?: string;
  text?: string;
  content?: string;
  fullText?: string;
  full_content?: string;
  isComplete?: boolean;
  is_complete?: boolean;
  from?: 'user' | 'ai' | 'human' | 'system';
  sender_type?: string;
  timestamp?: string;
  sessionId?: string;
  session_id?: string;
  userId?: string;
  user_id?: string;
  action?: string;
  message_type?: string;
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