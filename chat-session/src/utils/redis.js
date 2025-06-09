const Redis = require("ioredis");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
}); // Load .env from chat-session root

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined; // ioredis handles undefined password correctly
const redisDb = process.env.REDIS_DB || 0;

let client = null;

function getRedisClient() {
  if (client) {
    return client;
  }

  console.log(
    `Attempting to connect to Redis: ${redisHost}:${redisPort}, DB: ${redisDb}`
  );

  const connectionOptions = {
    host: redisHost,
    port: parseInt(redisPort, 10), // Ensure port is an integer
    db: parseInt(redisDb, 10), // Ensure DB is an integer
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000); // Exponential backoff up to 2 seconds
      console.warn(
        `Redis: Retrying connection in ${delay}ms (attempt ${times})`
      );
      return delay;
    },
    maxRetriesPerRequest: 3, // Optional:
  };

  if (redisPassword) {
    connectionOptions.password = redisPassword;
  }

  // Validate port and db are numbers, as parseInt can return NaN
  if (isNaN(connectionOptions.port)) {
    console.error(
      "Redis: Invalid REDIS_PORT. Please check your .env file. Using default 6379 instead if possible."
    );
    // Fallback or throw error - ioredis might also throw. For now, ioredis will likely fail to connect.
    // For safety, one might throw here: throw new Error('Invalid REDIS_PORT');
  }
  if (isNaN(connectionOptions.db)) {
    console.error(
      "Redis: Invalid REDIS_DB. Please check your .env file. Using default 0 instead if possible."
    );
    // Fallback or throw error
  }

  client = new Redis(connectionOptions);

  client.on("connect", () => {
    console.log(
      `Redis: Successfully connected to ${redisHost}:${redisPort}, DB: ${redisDb}`
    );
  });

  client.on("error", (err) => {
    console.error("Redis: Connection Error - ", err.message);
    // Depending on the error, ioredis might attempt to reconnect based on retryStrategy.
    // If it's a fatal error (e.g. auth error), it might not.
  });

  client.on("reconnecting", () => {
    console.log("Redis: Reconnecting...");
  });

  client.on("close", () => {
    console.log("Redis: Connection closed.");
    // client = null; // Optional: allow re-creation on next getRedisClient call after close.
    // However, for a shared singleton, this might be undesirable if close was intentional.
  });

  // Note: A 'ready' event is often used to signify the client is fully ready for commands,
  // especially after a connection or reconnection. For a shared client, this setup is generally okay.

  return client;
}

// Initialize and export a shared client instance immediately.
const sharedClient = getRedisClient();

// 添加优雅关闭函数
function closeRedisClient() {
  if (client) {
    client.disconnect();
    client = null;
    console.log("Redis: Client disconnected");
  }
}

// 处理进程退出信号
process.on("SIGINT", closeRedisClient);
process.on("SIGTERM", closeRedisClient);
process.on("exit", closeRedisClient);

module.exports = sharedClient;
module.exports.closeRedisClient = closeRedisClient;
