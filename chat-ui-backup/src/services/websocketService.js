let socket = null;
let isReconnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
const reconnectDelay = 2000; // 2秒
const WS_URL = import.meta.env.VITE_CHAT_CORE_WS_URL || "ws://localhost:8002";

/**
 * Establishes a WebSocket connection.
 * @param {object} eventHandlers - An object containing event handlers.
 * @param {function} eventHandlers.onOpen - Called when the connection opens.
 * @param {function} eventHandlers.onMessage - Called when a message is received.
 * @param {function} eventHandlers.onClose - Called when the connection closes.
 * @param {function} eventHandlers.onError - Called when an error occurs.
 */
function connect(eventHandlers = {}) {
  // 🚨 防止频繁重连
  if (isReconnecting) {
    console.log("WebSocket reconnection already in progress, skipping...");
    return;
  }

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    console.log("WebSocket connection already open or opening.");
    return;
  }

  // 检查重连次数限制
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.warn(
      `WebSocket: 已达到最大重连次数 (${maxReconnectAttempts})，停止重连`
    );
    return;
  }

  isReconnecting = true;
  reconnectAttempts++;

  console.log(`WebSocket: 尝试连接 (第${reconnectAttempts}次) - ${WS_URL}`);
  socket = new WebSocket(WS_URL);

  socket.onopen = (event) => {
    console.log("✅ WebSocket connected successfully.");
    isReconnecting = false; // 重置重连状态
    reconnectAttempts = 0; // 重置重连计数

    if (eventHandlers.onOpen) {
      try {
        eventHandlers.onOpen(event);
      } catch (e) {
        console.error("Error in onOpen handler:", e);
      }
    }
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      // console.log('WebSocket message received:', message); // Can be noisy
      if (eventHandlers.onMessage) {
        eventHandlers.onMessage(message);
      }
    } catch (e) {
      console.error(
        "Error parsing WebSocket message from server:",
        e,
        "Raw data:",
        event.data
      );
      // Optionally, call an error handler for parsing failure if defined
      // if (eventHandlers.onDataParseError) eventHandlers.onDataParseError(e, event.data);
    }
  };

  socket.onclose = (event) => {
    // 🔇 减少正常关闭的日志输出
    if (event.code !== 1000 && event.code !== 1001) {
      console.warn(
        `⚠️ WebSocket异常断开. Code: ${event.code}, Reason: "${event.reason}"`
      );
    } else {
      console.log(`🔌 WebSocket正常关闭. Code: ${event.code}`);
    }

    const previousSocket = socket; // Keep a reference to the socket that closed
    socket = null; // Clear the global socket variable
    isReconnecting = false; // 重置重连状态

    if (eventHandlers.onClose) {
      try {
        eventHandlers.onClose(event, previousSocket); // Pass event and the socket that closed
      } catch (e) {
        console.error("Error in onClose handler:", e);
      }
    }
  };

  socket.onerror = (event) => {
    // WebSocket Error objects are usually generic 'Event' types.
    // Specific error details might be found by inspecting the event or related logs.
    console.error("WebSocket error:", event);
    if (eventHandlers.onError) {
      try {
        eventHandlers.onError(event);
      } catch (e) {
        console.error("Error in onError handler:", e);
      }
    }
    // Note: 'onclose' will usually be called after 'onerror' if the error leads to a disconnection.
  };
}

/**
 * Sends a message object over the WebSocket connection.
 * @param {object} messageObject - The message object to send.
 */
function sendMessage(messageObject) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      const messageString = JSON.stringify(messageObject);
      socket.send(messageString);
      // console.log('WebSocket message sent:', messageObject); // Can be noisy
    } catch (e) {
      console.error(
        "Error stringifying or sending WebSocket message:",
        e,
        messageObject
      );
    }
  } else {
    console.error("WebSocket not connected. Message not sent:", messageObject);
    // TODO: Implement message queueing for offline support if needed.
  }
}

/**
 * Closes the WebSocket connection.
 */
function disconnect() {
  if (socket) {
    console.log("WebSocket disconnecting...");
    socket.close();
  } else {
    console.log("WebSocket already disconnected or not initialized.");
  }
}

export { connect, sendMessage, disconnect };
