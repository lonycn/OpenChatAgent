/**
 * WebSocket Configuration
 * Centralized configuration for WebSocket server and client settings
 */

module.exports = {
  // Server configuration
  server: {
    port: process.env.WS_PORT || 8002,
    path: "/ws",

    // Connection limits
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS) || 1000,

    // Timeouts (in milliseconds)
    connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT) || 30000, // 30 seconds
    idleTimeout: parseInt(process.env.WS_IDLE_TIMEOUT) || 300000, // 5 minutes

    // Message limits
    maxMessageSize: parseInt(process.env.WS_MAX_MESSAGE_SIZE) || 1024 * 1024, // 1MB
    messageRateLimit: parseInt(process.env.WS_MESSAGE_RATE_LIMIT) || 100, // messages per minute
  },

  // Heartbeat configuration
  heartbeat: {
    enabled: process.env.WS_HEARTBEAT_ENABLED !== "false",
    interval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000, // 30 seconds
    timeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT) || 10000, // 10 seconds
    maxMissed: parseInt(process.env.WS_HEARTBEAT_MAX_MISSED) || 3, // max missed pings
  },

  // Reconnection configuration (for client reference)
  reconnection: {
    enabled: true,
    maxAttempts: parseInt(process.env.WS_RECONNECT_MAX_ATTEMPTS) || 10,
    initialDelay: parseInt(process.env.WS_RECONNECT_INITIAL_DELAY) || 1000, // 1 second
    maxDelay: parseInt(process.env.WS_RECONNECT_MAX_DELAY) || 30000, // 30 seconds
    backoffFactor: parseFloat(process.env.WS_RECONNECT_BACKOFF_FACTOR) || 1.5,
    jitter: parseFloat(process.env.WS_RECONNECT_JITTER) || 0.1, // 10% jitter
  },

  // Logging configuration
  logging: {
    level: process.env.WS_LOG_LEVEL || "info", // debug, info, warn, error
    logConnections: process.env.WS_LOG_CONNECTIONS !== "false",
    logMessages: process.env.WS_LOG_MESSAGES === "true",
    logHeartbeat: process.env.WS_LOG_HEARTBEAT === "true",
  },

  // Security configuration
  security: {
    requireAuth: process.env.WS_REQUIRE_AUTH !== "false",
    allowGuests: process.env.WS_ALLOW_GUESTS === "true",
    corsOrigins: process.env.WS_CORS_ORIGINS
      ? process.env.WS_CORS_ORIGINS.split(",")
      : ["*"],
  },

  // Performance configuration
  performance: {
    enableCompression: process.env.WS_ENABLE_COMPRESSION !== "false",
    compressionThreshold:
      parseInt(process.env.WS_COMPRESSION_THRESHOLD) || 1024, // 1KB
    enableBinaryMessages: process.env.WS_ENABLE_BINARY === "true",
  },

  // Development configuration
  development: {
    enableDebugMode: process.env.NODE_ENV === "development",
    mockLatency: parseInt(process.env.WS_MOCK_LATENCY) || 0, // milliseconds
    simulateErrors: process.env.WS_SIMULATE_ERRORS === "true",
  },
};
