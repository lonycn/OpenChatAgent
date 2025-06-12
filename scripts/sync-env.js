#!/usr/bin/env node

/**
 * 环境配置同步脚本
 * 将根目录的.env配置同步到各子项目
 */

const fs = require("fs");
const path = require("path");

// 颜色输出
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 读取根目录.env文件
function readRootEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    log("⚠️  根目录.env文件不存在", "yellow");
    return {};
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const envVars = {};

  envContent.split("\n").forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith("#") && line.includes("=")) {
      const [key, ...valueParts] = line.split("=");
      envVars[key.trim()] = valueParts.join("=").trim();
    }
  });

  return envVars;
}

// 子项目环境配置映射
const projectEnvMappings = {
  "chat-ui": {
    envFile: "chat-ui/.env.local",
    mappings: {
      VITE_CHAT_CORE_WS_URL: "VITE_CHAT_CORE_WS_URL",
      VITE_CHAT_CORE_API_URL: "VITE_CHAT_CORE_API_URL",
    },
  },
  "chat-core": {
    envFile: "chat-core/.env",
    mappings: {
      CHAT_CORE_PORT: "PORT",
      JWT_SECRET: "JWT_SECRET",
      ALLOWED_ORIGINS: "ALLOWED_ORIGINS",
      AI_SERVICE_URL: "AI_SERVICE_URL",
      SESSION_SERVICE_URL: "SESSION_SERVICE_URL",
      LOG_LEVEL: "LOG_LEVEL",
    },
  },
  "ai-service": {
    envFile: "ai-service/.env",
    mappings: {
      AI_SERVICE_PORT: "PORT",
      DASHSCOPE_API_KEY: "DASHSCOPE_API_KEY",
      DEFAULT_MODEL: "DEFAULT_MODEL",
      MAX_CONTEXT_MESSAGES: "MAX_CONTEXT_MESSAGES",
      RETRY_DELAY_MS: "RETRY_DELAY_MS",
      KNOWLEDGE_BASE_CONFIGS: "KNOWLEDGE_BASE_CONFIGS",
      LOG_LEVEL: "LOG_LEVEL",
    },
  },
  "chat-session": {
    envFile: "chat-session/.env",
    mappings: {
      CHAT_SESSION_PORT: "PORT",
      REDIS_HOST: "REDIS_HOST",
      REDIS_PORT: "REDIS_PORT",
      REDIS_PASSWORD: "REDIS_PASSWORD",
      REDIS_DB: "REDIS_DB",
      DEFAULT_SESSION_TTL: "DEFAULT_SESSION_TTL",
      MAX_MESSAGE_HISTORY: "MAX_MESSAGE_HISTORY",
      CLEANUP_INTERVAL: "CLEANUP_INTERVAL",
      REDIS_MAX_RETRIES: "REDIS_MAX_RETRIES",
      REDIS_RETRY_DELAY: "REDIS_RETRY_DELAY",
      LOG_LEVEL: "LOG_LEVEL",
    },
  },
  "chat-admin": {
    envFile: "chat-admin/.env",
    mappings: {
      CHAT_ADMIN_PORT: "PORT",
      DB_HOST: "DB_HOST",
      DB_PORT: "DB_PORT",
      DB_NAME: "DB_NAME",
      DB_USER: "DB_USER",
      DB_PASSWORD: "DB_PASSWORD",
      DB_CHARSET: "DB_CHARSET",
      DB_TIMEZONE: "DB_TIMEZONE",
      JWT_SECRET: "JWT_SECRET",
      JWT_EXPIRES_IN: "JWT_EXPIRES_IN",
      JWT_REFRESH_EXPIRES_IN: "JWT_REFRESH_EXPIRES_IN",
      BCRYPT_ROUNDS: "BCRYPT_ROUNDS",
      CORS_ORIGIN: "CORS_ORIGIN",
      LOG_LEVEL: "LOG_LEVEL",
    },
  },
};

// 更新子项目环境配置
function updateProjectEnv(projectName, config, rootEnv) {
  const envFilePath = path.join(__dirname, "..", config.envFile);

  let existingEnv = {};
  if (fs.existsSync(envFilePath)) {
    const content = fs.readFileSync(envFilePath, "utf8");
    content.split("\n").forEach((line) => {
      line = line.trim();
      if (line && !line.startsWith("#") && line.includes("=")) {
        const [key, ...valueParts] = line.split("=");
        existingEnv[key.trim()] = valueParts.join("=").trim();
      }
    });
  }

  // 应用映射配置
  let updated = false;
  Object.entries(config.mappings).forEach(([rootKey, projectKey]) => {
    if (rootEnv[rootKey] && rootEnv[rootKey] !== existingEnv[projectKey]) {
      existingEnv[projectKey] = rootEnv[rootKey];
      updated = true;
    }
  });

  if (updated) {
    // 重写.env文件，保持格式
    const lines = [
      `# ${
        projectName.charAt(0).toUpperCase() + projectName.slice(1)
      } Environment Configuration`,
      "# 这些配置会被根目录.env覆盖",
      "",
    ];

    Object.entries(existingEnv).forEach(([key, value]) => {
      lines.push(`${key}=${value}`);
    });

    fs.writeFileSync(envFilePath, lines.join("\n") + "\n");
    log(`✅ 已更新 ${config.envFile}`, "green");
  } else {
    log(`ℹ️  ${config.envFile} 无需更新`, "blue");
  }
}

// 主函数
function main() {
  log("🔄 开始同步环境配置...", "blue");

  const rootEnv = readRootEnv();

  if (Object.keys(rootEnv).length === 0) {
    log("❌ 根目录.env文件为空或不存在", "red");
    process.exit(1);
  }

  log(`📖 读取到 ${Object.keys(rootEnv).length} 个环境变量`, "blue");

  // 同步到各子项目
  Object.entries(projectEnvMappings).forEach(([projectName, config]) => {
    try {
      updateProjectEnv(projectName, config, rootEnv);
    } catch (error) {
      log(`❌ 更新 ${projectName} 失败: ${error.message}`, "red");
    }
  });

  log("🎉 环境配置同步完成!", "green");
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main, readRootEnv, updateProjectEnv };
