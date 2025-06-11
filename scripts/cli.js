#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const inquirer = require("inquirer");
const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// 版本信息
const packageJson = require("../package.json");

// 模块配置
const MODULES = {
  "chat-ui": {
    name: "前端聊天界面",
    description: "React + Ant Design X 聊天UI",
    port: 5173,
    devScript: "dev",
    startScript: "preview",
    color: "cyan",
  },
  "chat-core": {
    name: "消息网关服务",
    description: "WebSocket + REST API 消息路由",
    port: 3001,
    devScript: "dev",
    startScript: "start",
    color: "green",
  },
  "ai-service": {
    name: "AI服务模块",
    description: "阿里百炼 API 封装",
    port: 3002,
    devScript: "dev",
    startScript: "start",
    color: "yellow",
  },
  "chat-session": {
    name: "会话管理服务",
    description: "Redis 会话状态管理",
    port: 3003,
    devScript: "dev",
    startScript: "start",
    color: "magenta",
  },
};

// 检查模块状态
function checkModuleStatus(moduleName) {
  const modulePath = path.join(process.cwd(), moduleName);
  const hasPackageJson = fs.existsSync(path.join(modulePath, "package.json"));
  const hasNodeModules = fs.existsSync(path.join(modulePath, "node_modules"));

  return {
    exists: fs.existsSync(modulePath),
    hasPackageJson,
    hasNodeModules,
    ready: hasPackageJson && hasNodeModules,
  };
}

// 启动单个模块
function startModule(moduleName, mode = "dev") {
  return new Promise((resolve, reject) => {
    const module = MODULES[moduleName];
    if (!module) {
      reject(new Error(`未知模块: ${moduleName}`));
      return;
    }

    const script = mode === "dev" ? module.devScript : module.startScript;
    console.log(chalk[module.color](`🚀 启动 ${module.name}...`));

    const child = spawn("npm", ["run", script], {
      cwd: path.join(process.cwd(), moduleName),
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`模块 ${moduleName} 启动失败，退出码: ${code}`));
      }
    });
  });
}

// 检查端口是否被占用
function checkPort(port) {
  return new Promise((resolve) => {
    const command =
      process.platform === "win32"
        ? `netstat -ano | findstr :${port}`
        : `lsof -ti:${port}`;

    exec(command, (error) => {
      resolve(!error); // 如果没有错误，说明端口被占用
    });
  });
}

// 主菜单
async function showMainMenu() {
  console.clear();
  console.log(chalk.bold.blue("🤖 OpenChatAgent 开发管理工具"));
  console.log(chalk.gray(`版本: ${packageJson.version}\n`));

  // 显示模块状态
  console.log(chalk.bold("📋 模块状态:"));
  for (const [key, module] of Object.entries(MODULES)) {
    const status = checkModuleStatus(key);
    const statusIcon = status.ready ? "✅" : status.exists ? "⚠️" : "❌";
    const portStatus = await checkPort(module.port);
    const portIcon = portStatus ? "🔴" : "🟢";

    console.log(
      `  ${statusIcon} ${chalk[module.color](module.name)} ${chalk.gray(
        `(${key})`
      )} ${portIcon} :${module.port}`
    );
    console.log(`     ${chalk.gray(module.description)}`);
    if (!status.ready && status.exists) {
      console.log(`     ${chalk.yellow("⚠️  需要运行 npm install")}`);
    }
  }

  console.log("\n");

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "选择操作:",
      choices: [
        { name: "🚀 启动所有服务 (开发模式)", value: "dev-all" },
        { name: "🔧 启动单个服务", value: "dev-single" },
        { name: "🏭 生产模式启动", value: "prod-all" },
        { name: "📦 安装所有依赖", value: "install" },
        { name: "🧹 清理项目", value: "clean" },
        { name: "⚙️  环境配置", value: "env" },
        { name: "🧪 运行测试", value: "test" },
        { name: "📊 查看状态", value: "status" },
        { name: "❌ 退出", value: "exit" },
      ],
    },
  ]);

  switch (action) {
    case "dev-all":
      await startAllServices("dev");
      break;
    case "dev-single":
      await startSingleService();
      break;
    case "prod-all":
      await startAllServices("prod");
      break;
    case "install":
      await installDependencies();
      break;
    case "clean":
      await cleanProject();
      break;
    case "env":
      await manageEnvironment();
      break;
    case "test":
      await runTests();
      break;
    case "status":
      await showDetailedStatus();
      break;
    case "exit":
      console.log(chalk.green("👋 再见!"));
      process.exit(0);
      break;
    default:
      await showMainMenu();
  }
}

// 启动所有服务
async function startAllServices(mode = "dev") {
  console.log(chalk.bold.blue(`🚀 启动所有服务 (${mode}模式)...\n`));

  try {
    const script = mode === "dev" ? "dev" : "start";
    const child = spawn("npm", ["run", script], {
      stdio: "inherit",
    });

    process.on("SIGINT", () => {
      child.kill("SIGINT");
      console.log(chalk.yellow("\n🛑 停止所有服务..."));
      process.exit(0);
    });
  } catch (error) {
    console.error(chalk.red("❌ 启动失败:", error.message));
    await pressAnyKey();
    await showMainMenu();
  }
}

// 启动单个服务
async function startSingleService() {
  const { module } = await inquirer.prompt([
    {
      type: "list",
      name: "module",
      message: "选择要启动的服务:",
      choices: Object.entries(MODULES).map(([key, module]) => ({
        name: `${chalk[module.color](module.name)} - ${module.description}`,
        value: key,
      })),
    },
  ]);

  const { mode } = await inquirer.prompt([
    {
      type: "list",
      name: "mode",
      message: "选择启动模式:",
      choices: [
        { name: "🔧 开发模式", value: "dev" },
        { name: "🏭 生产模式", value: "prod" },
      ],
    },
  ]);

  try {
    await startModule(module, mode);
  } catch (error) {
    console.error(chalk.red("❌ 启动失败:", error.message));
    await pressAnyKey();
    await showMainMenu();
  }
}

// 安装依赖
async function installDependencies() {
  console.log(chalk.blue("📦 安装所有依赖...\n"));

  try {
    const child = spawn("npm", ["run", "install:all"], {
      stdio: "inherit",
    });

    child.on("exit", async (code) => {
      if (code === 0) {
        console.log(chalk.green("\n✅ 依赖安装完成!"));
      } else {
        console.log(chalk.red("\n❌ 依赖安装失败!"));
      }
      await pressAnyKey();
      await showMainMenu();
    });
  } catch (error) {
    console.error(chalk.red("❌ 安装失败:", error.message));
    await pressAnyKey();
    await showMainMenu();
  }
}

// 清理项目
async function cleanProject() {
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "确定要清理项目吗？这将删除所有 node_modules 和构建文件。",
      default: false,
    },
  ]);

  if (confirm) {
    console.log(chalk.yellow("🧹 清理项目中..."));
    try {
      const child = spawn("npm", ["run", "clean"], {
        stdio: "inherit",
      });

      child.on("exit", async (code) => {
        if (code === 0) {
          console.log(chalk.green("\n✅ 项目清理完成!"));
        } else {
          console.log(chalk.red("\n❌ 项目清理失败!"));
        }
        await pressAnyKey();
        await showMainMenu();
      });
    } catch (error) {
      console.error(chalk.red("❌ 清理失败:", error.message));
      await pressAnyKey();
      await showMainMenu();
    }
  } else {
    await showMainMenu();
  }
}

// 环境配置管理
async function manageEnvironment() {
  const envPath = path.join(process.cwd(), ".env");
  const envExamplePath = path.join(process.cwd(), ".env.example");

  console.log(chalk.bold("⚙️  环境配置管理\n"));

  const hasEnv = fs.existsSync(envPath);
  const hasEnvExample = fs.existsSync(envExamplePath);

  console.log(`📄 .env 文件: ${hasEnv ? "✅ 存在" : "❌ 不存在"}`);
  console.log(
    `📄 .env.example 文件: ${hasEnvExample ? "✅ 存在" : "❌ 不存在"}\n`
  );

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "选择操作:",
      choices: [
        { name: "📋 从 .env.example 复制创建 .env", value: "copy" },
        { name: "👀 查看当前环境变量", value: "view" },
        { name: "✏️  编辑 .env 文件", value: "edit" },
        { name: "🔙 返回主菜单", value: "back" },
      ],
    },
  ]);

  switch (action) {
    case "copy":
      if (hasEnvExample) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log(chalk.green("✅ .env 文件创建成功!"));
        console.log(
          chalk.yellow("⚠️  请修改其中的配置项，特别是 API Key 等敏感信息。")
        );
      } else {
        console.log(chalk.red("❌ .env.example 文件不存在!"));
      }
      break;
    case "view":
      if (hasEnv) {
        console.log("\n📄 当前 .env 文件内容:\n");
        const envContent = fs.readFileSync(envPath, "utf8");
        console.log(chalk.gray(envContent));
      } else {
        console.log(chalk.red("❌ .env 文件不存在!"));
      }
      break;
    case "edit":
      console.log(chalk.blue("💡 请使用你喜欢的编辑器打开 .env 文件进行编辑"));
      break;
    case "back":
      await showMainMenu();
      return;
  }

  await pressAnyKey();
  await showMainMenu();
}

// 运行测试
async function runTests() {
  console.log(chalk.blue("🧪 运行所有测试...\n"));

  try {
    const child = spawn("npm", ["test"], {
      stdio: "inherit",
    });

    child.on("exit", async (code) => {
      if (code === 0) {
        console.log(chalk.green("\n✅ 所有测试通过!"));
      } else {
        console.log(chalk.red("\n❌ 测试失败!"));
      }
      await pressAnyKey();
      await showMainMenu();
    });
  } catch (error) {
    console.error(chalk.red("❌ 测试运行失败:", error.message));
    await pressAnyKey();
    await showMainMenu();
  }
}

// 显示详细状态
async function showDetailedStatus() {
  console.clear();
  console.log(chalk.bold.blue("📊 系统详细状态\n"));

  // 检查 Node.js 版本
  console.log(chalk.bold("🔧 运行环境:"));
  console.log(`  Node.js: ${chalk.green(process.version)}`);
  console.log(
    `  npm: ${chalk.green(
      require("child_process").execSync("npm -v").toString().trim()
    )}`
  );
  console.log(`  操作系统: ${chalk.green(process.platform)}\n`);

  // 检查各模块详细状态
  console.log(chalk.bold("📋 模块详细状态:"));
  for (const [key, module] of Object.entries(MODULES)) {
    console.log(chalk[module.color].bold(`\n📦 ${module.name} (${key})`));
    console.log(`    描述: ${module.description}`);
    console.log(`    端口: ${module.port}`);

    const status = checkModuleStatus(key);
    console.log(`    目录: ${status.exists ? "✅" : "❌"} 存在`);
    console.log(
      `    package.json: ${status.hasPackageJson ? "✅" : "❌"} 存在`
    );
    console.log(`    依赖: ${status.hasNodeModules ? "✅" : "❌"} 已安装`);

    const portOccupied = await checkPort(module.port);
    console.log(`    端口状态: ${portOccupied ? "🔴 占用" : "🟢 空闲"}`);
  }

  // 检查环境配置
  console.log(chalk.bold("\n⚙️  环境配置:"));
  const envExists = fs.existsSync(path.join(process.cwd(), ".env"));
  const envExampleExists = fs.existsSync(
    path.join(process.cwd(), ".env.example")
  );
  console.log(`    .env: ${envExists ? "✅" : "❌"} 存在`);
  console.log(`    .env.example: ${envExampleExists ? "✅" : "❌"} 存在`);

  await pressAnyKey();
  await showMainMenu();
}

// 按任意键继续
function pressAnyKey() {
  return inquirer.prompt([
    {
      type: "input",
      name: "continue",
      message: "按 Enter 键继续...",
    },
  ]);
}

// 命令行参数处理
program
  .name("openchat-cli")
  .description("OpenChatAgent 开发管理工具")
  .version(packageJson.version);

program
  .command("dev")
  .description("启动开发模式")
  .option("-s, --single <module>", "启动单个模块")
  .action(async (options) => {
    if (options.single) {
      await startModule(options.single, "dev");
    } else {
      await startAllServices("dev");
    }
  });

program
  .command("start")
  .description("启动生产模式")
  .action(async () => {
    await startAllServices("prod");
  });

program
  .command("install")
  .description("安装所有依赖")
  .action(async () => {
    await installDependencies();
  });

program
  .command("clean")
  .description("清理项目")
  .action(async () => {
    await cleanProject();
  });

program
  .command("status")
  .description("查看系统状态")
  .action(async () => {
    await showDetailedStatus();
  });

program
  .command("menu")
  .alias("m")
  .description("显示交互式菜单")
  .action(async () => {
    await showMainMenu();
  });

// 如果没有参数，显示菜单
if (process.argv.length === 2) {
  showMainMenu();
} else {
  program.parse();
}
