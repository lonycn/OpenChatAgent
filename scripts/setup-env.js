#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

// 模块配置映射
const MODULE_ENV_MAPPING = {
  "chat-ui": {
    envFile: ".env.local",
    variables: ["VITE_CHAT_CORE_WS_URL", "VITE_CHAT_CORE_API_URL"],
  },
  "chat-core": {
    envFile: ".env",
    variables: [
      "CHAT_CORE_PORT",
      "NODE_ENV",
      "JWT_SECRET",
      "ALLOWED_ORIGINS",
      "AI_SERVICE_URL",
      "SESSION_SERVICE_URL",
      "CHAT_SESSION_REDIS_URL",
      "LOG_LEVEL",
    ],
  },
  "ai-service": {
    envFile: ".env",
    variables: [
      "DASHSCOPE_API_KEY",
      "KNOWLEDGE_BASE_CONFIGS",
      "MAX_CONTEXT_MESSAGES",
      "RETRY_DELAY_MS",
      "DEFAULT_MODEL",
      "AI_SERVICE_PORT",
      "NODE_ENV",
    ],
  },
  "chat-session": {
    envFile: ".env",
    variables: [
      "REDIS_HOST",
      "REDIS_PORT",
      "REDIS_PASSWORD",
      "REDIS_DB",
      "DEFAULT_SESSION_TTL",
      "MAX_MESSAGE_HISTORY",
      "CLEANUP_INTERVAL",
      "REDIS_MAX_RETRIES",
      "REDIS_RETRY_DELAY",
      "CHAT_SESSION_PORT",
      "NODE_ENV",
    ],
  },
};

// 读取根目录环境变量
function readRootEnv() {
  const rootEnvPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(rootEnvPath)) {
    console.error(chalk.red("❌ 根目录 .env 文件不存在！"));
    console.log(chalk.yellow("💡 请先运行: cp .env.example .env"));
    process.exit(1);
  }

  const envContent = fs.readFileSync(rootEnvPath, "utf8");
  const envVars = {};

  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join("=").trim();
      }
    }
  });

  return envVars;
}

// 为单个模块生成环境变量文件
function generateModuleEnv(moduleName, moduleConfig, rootEnvVars) {
  const modulePath = path.join(process.cwd(), moduleName);

  if (!fs.existsSync(modulePath)) {
    console.log(chalk.yellow(`⚠️  模块 ${moduleName} 不存在，跳过...`));
    return;
  }

  const moduleEnvPath = path.join(modulePath, moduleConfig.envFile);
  const envLines = [];

  // 添加文件头注释
  envLines.push(`# ${moduleName.toUpperCase()} 环境配置`);
  envLines.push(`# 由 OpenChatAgent 统一环境管理工具自动生成`);
  envLines.push(`# 生成时间: ${new Date().toISOString()}`);
  envLines.push("");

  // 添加对应的环境变量
  moduleConfig.variables.forEach((varName) => {
    if (rootEnvVars[varName] !== undefined) {
      // 处理特殊的端口映射
      let value = rootEnvVars[varName];

      // 特殊处理：chat-core 的 PORT 映射
      if (moduleName === "chat-core" && varName === "CHAT_CORE_PORT") {
        envLines.push(`PORT=${value}`);
      } else if (moduleName === "ai-service" && varName === "AI_SERVICE_PORT") {
        envLines.push(`PORT=${value}`);
      } else if (
        moduleName === "chat-session" &&
        varName === "CHAT_SESSION_PORT"
      ) {
        envLines.push(`PORT=${value}`);
      } else {
        envLines.push(`${varName}=${value}`);
      }
    } else {
      console.log(
        chalk.yellow(
          `⚠️  模块 ${moduleName} 需要的变量 ${varName} 在根环境文件中未找到`
        )
      );
    }
  });

  // 写入文件
  const envContent = envLines.join("\n") + "\n";
  fs.writeFileSync(moduleEnvPath, envContent);

  console.log(chalk.green(`✅ ${moduleName}/${moduleConfig.envFile} 已生成`));
}

// 主函数
function setupEnvironments() {
  console.log(chalk.bold.blue("🔧 OpenChatAgent 环境配置设置工具\n"));

  try {
    // 读取根环境变量
    console.log(chalk.blue("📖 读取根目录环境配置..."));
    const rootEnvVars = readRootEnv();
    console.log(
      chalk.green(`✅ 找到 ${Object.keys(rootEnvVars).length} 个环境变量\n`)
    );

    // 为每个模块生成环境文件
    console.log(chalk.blue("🔧 为各模块生成环境配置文件..."));
    Object.entries(MODULE_ENV_MAPPING).forEach(([moduleName, moduleConfig]) => {
      generateModuleEnv(moduleName, moduleConfig, rootEnvVars);
    });

    console.log(chalk.bold.green("\n🎉 环境配置设置完成！"));
    console.log(chalk.gray("\n📋 生成的文件:"));
    Object.entries(MODULE_ENV_MAPPING).forEach(([moduleName, moduleConfig]) => {
      const moduleEnvPath = path.join(moduleName, moduleConfig.envFile);
      if (fs.existsSync(path.join(process.cwd(), moduleEnvPath))) {
        console.log(chalk.gray(`  ✓ ${moduleEnvPath}`));
      }
    });

    console.log(chalk.yellow("\n⚠️  重要提示:"));
    console.log(chalk.yellow("  1. 请检查并修改 DASHSCOPE_API_KEY 等敏感配置"));
    console.log(chalk.yellow("  2. 确保 Redis 服务已启动"));
    console.log(chalk.yellow("  3. 各服务端口无冲突 (3001-3003, 5173)"));
  } catch (error) {
    console.error(chalk.red("❌ 环境配置设置失败:"), error.message);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  setupEnvironments();
}

module.exports = { setupEnvironments };
