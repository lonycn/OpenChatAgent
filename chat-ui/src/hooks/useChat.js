import { useState, useEffect, useRef, useCallback } from "react";
import { useMessages } from "../chatui";
import { createWebSocketService } from "../services/websocketService";
import { v4 as uuidv4 } from "uuid";
import { AIAvatar, HumanAvatar } from "../components/AIAvatar";
import StreamingText from "../components/StreamingText";

// 从环境变量获取WebSocket URL
const WS_URL = import.meta.env.VITE_CHAT_CORE_WS_URL || "ws://localhost:8002";

/**
 * 聊天Hook - 管理WebSocket连接、消息状态和业务逻辑
 * 基于官方ChatUI的useMessages Hook
 */
export const useChat = (options = {}) => {
  // ChatUI的useMessages只返回messages和appendMsg
  const { messages, appendMsg, appendMsgStream } = useMessages([]);

  // 移除未使用的流式消息状态管理

  // 手动管理typing状态，因为ChatUI可能没有setTyping
  const [isTyping, setIsTyping] = useState(false);

  // 连接状态
  const [connectionHealth, setConnectionHealth] = useState("disconnected");
  const [reconnectInfo, setReconnectInfo] = useState(null);

  // 业务状态
  const [handoverStatus, setHandoverStatus] = useState("AI"); // AI or HUMAN
  const [sessionId, setSessionId] = useState(null);
  const [userId] = useState(() => `user_${Date.now()}`);

  // 引用
  const wsServiceRef = useRef(null);
  const sessionInitialized = useRef(false);
  const hasWelcomedRef = useRef(false); // 防止重复欢迎消息
  const processedMessageIds = useRef(new Set()); // 已处理的消息ID

  // 保存最新状态的引用
  const stateRef = useRef({
    messages,
    connectionHealth,
    handoverStatus,
    sessionId,
    userId,
    hasWelcomed: false,
  });

  // 更新状态引用
  useEffect(() => {
    stateRef.current = {
      messages,
      connectionHealth,
      handoverStatus,
      sessionId,
      userId,
      hasWelcomed: hasWelcomedRef.current,
    };
  }, [messages, connectionHealth, handoverStatus, sessionId, userId]);

  // WebSocket事件处理器 - 使用稳定的回调函数
  const handleWebSocketOpen = useCallback(() => {
    console.log("🔌 WebSocket connected");
    setConnectionHealth("connected");
    setReconnectInfo(null);

    // 初始化会话
    if (!sessionInitialized.current) {
      // 使用setTimeout确保状态更新完成
      setTimeout(() => {
        if (
          wsServiceRef.current &&
          wsServiceRef.current.getState().connectionState === "CONNECTED"
        ) {
          const initMessage = {
            type: "init",
            payload: {
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              userId: stateRef.current.userId,
            },
          };

          wsServiceRef.current.send(initMessage);
          console.log("🚀 Session initialization sent");

          // 添加欢迎消息（防止重复）
          if (!hasWelcomedRef.current) {
            appendMsg({
              type: "text",
              content: {
                text: "👋 您好！我是智能客服助手，很高兴为您服务！\n\n我可以帮助您：\n• 解答常见问题\n• 提供产品咨询\n• 处理服务请求\n\n如需人工客服，请点击下方「转人工」按钮。",
              },
              position: "left",
              user: {
                avatar: AIAvatar(),
                name: "AI助手",
              },
            });
            hasWelcomedRef.current = true;
          }
        }
      }, 100);
      sessionInitialized.current = true;
    }
  }, [appendMsg]);

  const handleWebSocketMessage = useCallback(
    (data) => {
      console.log("📨 Received WebSocket message:", data);
      console.log(
        "📨 Message type:",
        data.type,
        "ID:",
        data.id,
        "isComplete:",
        data.isComplete
      );

      if (data.type === "ping" || data.type === "pong") {
        return; // 忽略心跳消息
      }

      // 优化重复消息过滤 - 确保流式消息流畅更新
      let messageKey;
      if (data.type === "stream" || data.type === "streaming") {
        // 流式消息：使用ID+文本长度，但限制缓存大小避免内存泄漏
        const textLength = (data.fullText || data.text || "").length;
        messageKey = `${data.type}_${data.id}_${textLength}`;

        // 清理旧的流式消息缓存，只保留最近的
        const streamPrefix = `${data.type}_${data.id}_`;
        const keysToDelete = Array.from(processedMessageIds.current).filter(
          (key) => key.startsWith(streamPrefix) && key !== messageKey
        );
        keysToDelete.forEach((key) => processedMessageIds.current.delete(key));
      } else {
        // 其他消息使用完整key
        messageKey = `${data.type}_${data.id || Date.now()}_${data.timestamp || ""}`;
      }

      if (processedMessageIds.current.has(messageKey)) {
        console.log("🔄 Skipping duplicate message:", messageKey);
        return;
      }
      processedMessageIds.current.add(messageKey);

      // 定期清理缓存，避免内存泄漏
      if (processedMessageIds.current.size > 1000) {
        const keysArray = Array.from(processedMessageIds.current);
        const keysToKeep = keysArray.slice(-500); // 只保留最近500条
        processedMessageIds.current.clear();
        keysToKeep.forEach((key) => processedMessageIds.current.add(key));
      }

      const currentState = stateRef.current;

      switch (data.type) {
        case "message":
        case "text":
          appendMsg({
            type: "text",
            content: { text: data.content || data.text || data.message },
            position: "left",
            user: {
              avatar:
                currentState.handoverStatus === "AI"
                  ? AIAvatar()
                  : HumanAvatar(),
              name:
                currentState.handoverStatus === "AI" ? "AI助手" : "人工客服",
            },
          });
          setIsTyping(false); // 收到消息后停止typing
          break;

        case "stream": {
          // 处理后端发送的stream类型消息，转换为统一的流式处理
          console.log("🔄 处理stream消息:", data);

          const messageId = data.id;
          const fullText = data.fullText || "";
          const isComplete = data.isComplete || false;

          // 使用appendMsgStream方法处理流式消息
          appendMsgStream(
            {
              id: messageId,
              fullText: fullText,
              isComplete: isComplete,
            },
            {
              type: "text",
              content: {
                // 直接使用文本内容，让ChatUI处理显示
                text: fullText,
              },
              user: {
                avatar:
                  currentState.handoverStatus === "AI"
                    ? AIAvatar()
                    : HumanAvatar(),
                name:
                  currentState.handoverStatus === "AI" ? "AI助手" : "人工客服",
              },
              position: "left",
              // 添加流式标记，用于后续处理
              _isStreaming: !isComplete,
            }
          );

          // 流式消息完成时，隐藏打字指示器
          if (isComplete) {
            setIsTyping(false);
          } else {
            setIsTyping(true);
          }

          return;
        }

        case "handover": {
          const newStatus =
            data.to || (currentState.handoverStatus === "AI" ? "HUMAN" : "AI");
          setHandoverStatus(newStatus);
          appendMsg({
            type: "text",
            content: {
              text:
                data.message ||
                `🔄 对话已转接给${newStatus === "AI" ? "AI助手" : "人工客服"}，请稍候...`,
            },
            position: "center",
          });
          break;
        }

        case "system":
        case "system_ack": {
          // 过滤掉不友好的英文初始化消息
          const messageText = data.text || data.message;
          if (
            messageText &&
            messageText.includes("Session initialized successfully")
          ) {
            // 不显示此消息，或替换为友好的中文消息
            console.log("🔧 已过滤系统初始化消息");
            return;
          }

          appendMsg({
            type: "text",
            content: { text: messageText },
            position: "center",
          });
          break;
        }

        case "session_init":
          setSessionId(data.sessionId);
          break;

        case "error":
          // 处理错误消息
          console.error("WebSocket error:", data.error || data);
          appendMsg({
            type: "text",
            content: {
              text: `❌ 错误: ${data.error?.message || data.text || "未知错误"}`,
            },
            position: "center",
          });
          break;

        case "streaming": {
          console.log("🔄 处理流式消息:", data);

          const messageId = data.id;
          const fullText = data.fullText || "";
          const isComplete = data.isComplete || false;

          // 使用新的appendMsgStream方法，确保同一个消息ID只对应一条消息
          appendMsgStream(
            {
              id: messageId,
              fullText: fullText,
              isComplete: isComplete,
            },
            {
              type: "text",
              content: {
                // 直接使用文本内容，让ChatUI处理显示
                text: fullText,
              },
              user: {
                avatar:
                  currentState.handoverStatus === "AI"
                    ? AIAvatar()
                    : HumanAvatar(),
                name:
                  currentState.handoverStatus === "AI" ? "AI助手" : "人工客服",
              },
              position: "left",
              // 添加流式标记，用于后续处理
              _isStreaming: !isComplete,
            }
          );

          // 流式消息完成时，隐藏打字指示器
          if (isComplete) {
            setIsTyping(false);
          }

          return;
        }

        case "response": {
          // 处理response类型消息
          console.log("🔄 处理response消息:", data);

          const messageId = data.id;
          const fullText = data.fullText || data.text || "";
          const isComplete = data.isComplete !== false; // response消息默认为完成状态

          // 使用appendMsgStream方法处理
          appendMsgStream(
            {
              id: messageId,
              fullText: fullText,
              isComplete: isComplete,
            },
            {
              type: "text",
              content: {
                text: fullText,
              },
              user: {
                avatar:
                  currentState.handoverStatus === "AI"
                    ? AIAvatar()
                    : HumanAvatar(),
                name:
                  currentState.handoverStatus === "AI" ? "AI助手" : "人工客服",
              },
              position: "left",
              _isStreaming: !isComplete,
            }
          );

          setIsTyping(false);
          return;
        }

        default:
          console.warn("Unknown message type:", data.type, data);
      }
    },
    [appendMsg, appendMsgStream]
  );

  const handleWebSocketClose = useCallback(() => {
    console.log("🔌 WebSocket disconnected");
    setConnectionHealth("disconnected");
    setIsTyping(false);
  }, []);

  const handleWebSocketError = useCallback((error) => {
    console.error("🚨 WebSocket error:", error);
    setConnectionHealth("error");
    setIsTyping(false);
  }, []);

  const handleReconnecting = useCallback((attempt, maxAttempts) => {
    console.log(`🔄 Reconnecting... (${attempt}/${maxAttempts})`);
    setConnectionHealth("reconnecting");
    setReconnectInfo({ attempt, maxAttempts });
  }, []);

  const handleReconnected = useCallback(() => {
    console.log("✅ Reconnected successfully");
    setConnectionHealth("connected");
    setReconnectInfo(null);
  }, []);

  const handleMaxReconnectAttemptsReached = useCallback(() => {
    console.log("❌ Max reconnect attempts reached");
    setConnectionHealth("failed");

    // 添加用户友好的提示消息
    appendMsg({
      type: "text",
      content: {
        text: '🔌 连接失败，请检查网络或稍后重试。您可以点击"重试连接"按钮手动重连。',
      },
      position: "center",
    });
  }, [appendMsg]);

  // 发送消息
  const handleSend = useCallback(
    (type, val) => {
      if (type === "text" && val.trim()) {
        // 添加用户消息
        const userMessage = {
          type: "text",
          content: { text: val },
          position: "right",
        };
        appendMsg(userMessage);

        // 发送到服务器
        if (
          wsServiceRef.current &&
          wsServiceRef.current.getState().connectionState === "CONNECTED"
        ) {
          const currentState = stateRef.current;

          // 构建消息，只在有值时才包含可选字段
          const messageToSend = {
            type: "text",
            text: val,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            userId: currentState.userId,
          };

          // 只在sessionId存在且为字符串时才添加
          if (
            currentState.sessionId &&
            typeof currentState.sessionId === "string"
          ) {
            messageToSend.sessionId = currentState.sessionId;
          }

          const sent = wsServiceRef.current.send(messageToSend);

          if (sent) {
            // 显示打字指示器
            setIsTyping(true);
            // 3秒后自动隐藏（如果没有收到回复）
            setTimeout(() => setIsTyping(false), 3000);
          } else {
            // 连接断开时的提示
            appendMsg({
              type: "text",
              content: { text: "🔌 连接已断开，消息将在重连后发送" },
              position: "center",
            });
          }
        } else {
          // 连接断开时的提示
          appendMsg({
            type: "text",
            content: { text: "🔌 连接已断开，消息将在重连后发送" },
            position: "center",
          });
        }
      }

      // 返回Promise以支持ChatUI的异步处理和输入框清空
      return Promise.resolve();
    },
    [appendMsg]
  );

  // 处理转接请求
  const handleHandoverRequest = useCallback(() => {
    const currentState = stateRef.current;
    const newStatus = currentState.handoverStatus === "AI" ? "HUMAN" : "AI";

    if (
      wsServiceRef.current &&
      wsServiceRef.current.getState().connectionState === "CONNECTED"
    ) {
      // 构建转接请求消息 - 修复消息类型
      const handoverMessage = {
        type: "system", // 改为system类型，因为handover_request不在允许的类型列表中
        message: `请求转接到${newStatus === "AI" ? "AI助手" : "人工客服"}`,
        action: "handover_request", // 添加action字段表示具体操作
        to: newStatus,
        timestamp: new Date().toISOString(),
        userId: currentState.userId,
      };

      // 只在sessionId存在且为字符串时才添加
      if (
        currentState.sessionId &&
        typeof currentState.sessionId === "string"
      ) {
        handoverMessage.sessionId = currentState.sessionId;
      }

      wsServiceRef.current.send(handoverMessage);

      // 立即更新本地状态和显示
      setHandoverStatus(newStatus);
      appendMsg({
        type: "text",
        content: {
          text: `🔄 正在为您转接到${newStatus === "AI" ? "AI助手" : "人工客服"}，请稍候...`,
        },
        position: "center",
      });
    } else {
      // 连接断开时的提示
      appendMsg({
        type: "text",
        content: { text: "🔌 连接已断开，无法转接，请稍后重试" },
        position: "center",
      });
    }
  }, [appendMsg]);

  // 重试连接
  const handleRetryConnection = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.reset();
    }
  }, []);

  // 初始化WebSocket连接
  useEffect(() => {
    console.log("🔄 Initializing WebSocket connection to:", WS_URL);

    // 创建WebSocket服务
    wsServiceRef.current = createWebSocketService({
      url: WS_URL, // 使用环境变量
      debug: true,
      maxReconnectAttempts: 5, // 减少重连次数
      reconnectInterval: 3000, // 增加重连间隔
      heartbeatInterval: 30000,
      pongTimeout: 10000,
      enableMessageQueue: true,
      enableReconnect: true,
      ...options,
    });

    const wsService = wsServiceRef.current;

    // 设置事件处理器
    wsService.on("onOpen", handleWebSocketOpen);
    wsService.on("onMessage", handleWebSocketMessage);
    wsService.on("onClose", handleWebSocketClose);
    wsService.on("onError", handleWebSocketError);
    wsService.on("onReconnecting", handleReconnecting);
    wsService.on("onReconnected", handleReconnected);
    wsService.on(
      "onMaxReconnectAttemptsReached",
      handleMaxReconnectAttemptsReached
    );

    // 连接
    wsService.connect();

    // 清理函数
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
    };
  }, []);

  return {
    // 消息相关
    messages,
    appendMsg,
    isTyping, // 使用我们自己的typing状态

    // 连接状态
    connectionHealth,
    reconnectInfo,

    // 业务状态
    handoverStatus,
    sessionId,
    userId,

    // 操作方法
    handleSend,
    handleHandoverRequest,
    handleRetryConnection,

    // WebSocket服务引用
    wsService: wsServiceRef.current,
  };
};
