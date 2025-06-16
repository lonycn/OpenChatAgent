/**
 * WebSocket服务 - 基于官方ChatUI的聊天WebSocket连接管理
 */

class WebSocketService {
  constructor(options = {}) {
    this.config = {
      url: import.meta.env.VITE_CHAT_CORE_WS_URL || "ws://localhost:8002",
      maxReconnectAttempts: 5, // 减少重连次数
      reconnectInterval: 2000, // 增加重连间隔
      maxReconnectInterval: 30000,
      reconnectDecay: 1.5,
      heartbeatInterval: 30000,
      pongTimeout: 10000,
      enableHeartbeat: true,
      enableMessageQueue: true,
      maxQueueSize: 100,
      enableReconnect: true, // 添加重连开关
      debug: true,
      ...options,
    };

    this.ws = null;
    this.connectionState = "DISCONNECTED";
    this.reconnectAttempts = 0;
    this.reconnectTimeoutId = null;
    this.heartbeatIntervalId = null;
    this.pongTimeoutId = null;
    this.lastPongReceived = null;
    this.messageQueue = [];
    this.isManuallyDisconnected = false; // 手动断线标记
    this.hasReachedMaxAttempts = false; // 是否已达到最大重连次数
    this.eventHandlers = {
      onOpen: [],
      onMessage: [],
      onClose: [],
      onError: [],
      onReconnecting: [],
      onReconnected: [],
      onMaxReconnectAttemptsReached: [],
    };

    this.log("WebSocketService initialized", this.config);
  }

  on(event, handler) {
    if (
      this.eventHandlers[event] &&
      !this.eventHandlers[event].includes(handler)
    ) {
      this.eventHandlers[event].push(handler);
    }
  }

  off(event, handler) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          this.log("Error in event handler:", error);
        }
      });
    }
  }

  connect() {
    // 检查是否手动断线或已达到最大重连次数
    if (this.isManuallyDisconnected || this.hasReachedMaxAttempts) {
      this.log(
        "Connection blocked: manually disconnected or max attempts reached"
      );
      return;
    }

    if (
      this.connectionState === "CONNECTING" ||
      this.connectionState === "CONNECTED"
    ) {
      this.log("Already connecting or connected");
      return;
    }

    this.connectionState = "CONNECTING";
    this.log(
      `Attempting to connect (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`
    );

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.log("Failed to create WebSocket:", error);
      this.reconnectAttempts++; // 增加重连计数
      this.handleConnectionError(error);
    }
  }

  setupEventHandlers() {
    this.ws.onopen = (event) => {
      this.log("✅ WebSocket connected successfully");

      // 检查是否是重连
      const wasReconnecting = this.reconnectAttempts > 0;

      this.connectionState = "CONNECTED";
      this.reconnectAttempts = 0;

      this.startHeartbeat();
      this.processMessageQueue();

      // 如果是重连，发送重连事件
      if (wasReconnecting) {
        this.emit("onReconnected", event);
      }

      this.emit("onOpen", event);
    };

    this.ws.onmessage = (event) => {
      try {
        this.resetPongTimeout();
        const message = JSON.parse(event.data);

        if (message.type === "pong") {
          this.lastPongReceived = Date.now();
          this.log("💓 Pong received");
          return;
        }

        this.emit("onMessage", message, event);
      } catch (error) {
        this.log("Error parsing message:", error, "Raw data:", event.data);
      }
    };

    this.ws.onclose = (event) => {
      this.log(
        `🔌 WebSocket closed. Code: ${event.code}, Reason: "${event.reason}"`
      );
      this.connectionState = "DISCONNECTED";
      this.stopHeartbeat();
      this.emit("onClose", event);

      if (event.code !== 1000 && event.code !== 1001) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.log("🚨 WebSocket error:", error);
      this.emit("onError", error);
      this.handleConnectionError(error);
    };
  }

  startHeartbeat() {
    if (!this.config.enableHeartbeat) return;

    this.heartbeatIntervalId = setInterval(() => {
      this.sendPing();
    }, this.config.heartbeatInterval);

    this.log("💓 Heartbeat started");
  }

  stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
    this.log("💓 Heartbeat stopped");
  }

  sendPing() {
    if (this.connectionState === "CONNECTED" && this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        this.log("💓 Ping sent");

        this.pongTimeoutId = setTimeout(() => {
          this.log("💔 Pong timeout - connection may be dead");
          this.ws.close(1000, "Pong timeout");
        }, this.config.pongTimeout);
      } catch (error) {
        this.log("Error sending ping:", error);
      }
    }
  }

  resetPongTimeout() {
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
  }

  send(message) {
    if (this.connectionState === "CONNECTED" && this.ws) {
      try {
        const messageStr =
          typeof message === "string" ? message : JSON.stringify(message);
        this.ws.send(messageStr);
        this.log("📤 Message sent:", message);
        return true;
      } catch (error) {
        this.log("Error sending message:", error);
        if (this.config.enableMessageQueue) {
          this.queueMessage(message);
        }
        return false;
      }
    } else {
      this.log("WebSocket not connected, queuing message");
      if (this.config.enableMessageQueue) {
        this.queueMessage(message);
      }
      return false;
    }
  }

  queueMessage(message) {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.messageQueue.shift();
    }
    this.messageQueue.push(message);
    this.log("📥 Message queued:", message);
  }

  processMessageQueue() {
    if (this.messageQueue.length > 0) {
      this.log(`📤 Processing ${this.messageQueue.length} queued messages`);
      const messages = [...this.messageQueue];
      this.messageQueue = [];

      messages.forEach((message) => {
        this.send(message);
      });
    }
  }

  handleConnectionError(error) {
    this.log("🚨 Connection error:", error);
    this.emit("onError", error);
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    // 检查是否手动断线
    if (this.isManuallyDisconnected) {
      this.log("手动断线，终止重连");
      return;
    }

    // 检查重连开关和最大重连次数
    if (
      !this.config.enableReconnect ||
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      this.log("❌ Max reconnect attempts reached or reconnect disabled");
      this.hasReachedMaxAttempts = true; // 标记已达到最大重连次数
      this.emit("onMaxReconnectAttemptsReached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval *
        Math.pow(this.config.reconnectDecay, this.reconnectAttempts - 1),
      this.config.maxReconnectInterval
    );

    this.log(
      `🔄 Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );
    this.emit(
      "onReconnecting",
      this.reconnectAttempts,
      this.config.maxReconnectAttempts
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    this.log("🔌 Disconnecting WebSocket");
    this.isManuallyDisconnected = true; // 标记为手动断线
    this.connectionState = "DISCONNECTING";

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.connectionState = "DISCONNECTED";
  }

  getState() {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastPongReceived: this.lastPongReceived,
    };
  }

  reset() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.isManuallyDisconnected = false; // 重置手动断线标记
    this.hasReachedMaxAttempts = false; // 重置最大重连次数标记
    setTimeout(() => this.connect(), 1000);
  }

  log(...args) {
    if (this.config.debug) {
      console.log("[WebSocketService]", ...args);
    }
  }
}

export function createWebSocketService(options = {}) {
  return new WebSocketService(options);
}

export default WebSocketService;
