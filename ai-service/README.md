# AI Service 模块

封装阿里百炼 DashScope API，提供统一的 AI 对话接口。

## 📦 安装

```bash
npm install
```

### 依赖项

本模块使用阿里云百炼官方推荐的 OpenAI SDK：

```bash
npm install openai
```

## ⚙️ 配置

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 配置环境变量：

```bash
# .env
DASHSCOPE_API_KEY=sk-your_actual_api_key  # 阿里云百炼 API Key (sk- 开头)
KNOWLEDGE_BASE_CONFIGS=[{"id":"kb1","name":"FAQ知识库","priority":1}]
```

## 🚀 使用方法

### 基础用法

```javascript
const DashScopeClient = require("./src");

// 初始化客户端
const client = new DashScopeClient(
  process.env.DASHSCOPE_API_KEY,
  JSON.parse(process.env.KNOWLEDGE_BASE_CONFIGS || "[]"),
  { model: "qwen-plus" } // 可选：指定模型
);

// 发送消息
async function chat() {
  const response = await client.sendMessage("session123", "你好！");
  console.log(response);
}

// 多轮对话
async function multiTurnChat() {
  const sessionId = "session123";

  const response1 = await client.sendMessage(sessionId, "今天天气怎么样？");
  console.log("AI:", response1);

  const response2 = await client.sendMessage(sessionId, "那明天呢？");
  console.log("AI:", response2);
}
```

### 知识库查询

```javascript
// 单个知识库查询
async function queryKnowledge() {
  const response = await client.callKnowledge("产品价格是多少？", "kb1");

  if (response.success) {
    console.log("知识库回答:", response.data);
  } else {
    console.log("查询失败:", response.error);
  }
}

// 优先级策略查询
async function queryWithPriority() {
  // 返回第一个成功的结果
  const response = await client.queryKnowledgeWithPriority(
    "退货政策是什么？",
    ["kb1", "kb2"], // 指定查询的知识库
    "first_success"
  );

  // 返回所有结果
  const allResults = await client.queryKnowledgeWithPriority(
    "退货政策是什么？",
    null, // 使用所有配置的知识库
    "all_results"
  );
}
```

### 错误处理

```javascript
async function handleErrors() {
  try {
    const response = await client.sendMessage("session123", "测试消息");
    console.log(response);
  } catch (error) {
    if (error.message.includes("multiple retries")) {
      console.log("API 调用失败，已重试多次");
    }
  }
}
```

## 🧪 测试

```bash
npm test
```

## 🎯 快速开始

运行示例：

```bash
# 确保已配置 .env 文件
node example.js
```

示例将会：

- 测试单轮对话
- 测试多轮对话上下文保持
- 测试知识库查询（如果配置）

## 📚 API 文档

### DashScopeClient

#### 构造函数

```javascript
new DashScopeClient(apiKey, knowledgeBaseConfigs, options);
```

- `apiKey`: 阿里百炼 API Key (格式: sk-xxx)
- `knowledgeBaseConfigs`: 知识库配置数组 (可选)
- `options`: 配置选项 (可选)
  - `model`: 使用的模型名称 (默认: qwen-plus)

#### 方法

##### sendMessage(sessionId, text, retries = 1)

发送消息到 AI 模型

- `sessionId`: 会话 ID
- `text`: 消息内容
- `retries`: 重试次数
- 返回: Promise<string> - AI 响应

##### callKnowledge(query, knowledgeId)

查询知识库

- `query`: 查询内容
- `knowledgeId`: 知识库 ID
- 返回: Promise<Object> - 格式化的查询结果

##### queryKnowledgeWithPriority(query, knowledgeIds, strategy)

使用优先级策略查询多个知识库

- `query`: 查询内容
- `knowledgeIds`: 知识库 ID 数组 (可选)
- `strategy`: 策略 ('first_success' | 'all_results')
- 返回: Promise<Object> - 查询结果

## 🏗️ 架构设计

```
ai-service/
├── src/
│   ├── client/
│   │   ├── DashScopeClient.js    # 核心客户端
│   │   └── index.js              # 客户端导出
│   ├── utils/
│   │   ├── context.js            # 上下文管理
│   │   └── formatter.js          # 结果格式化
│   └── index.js                  # 主入口
├── tests/                        # 测试文件
└── .env.example                  # 配置模板
```

## 🔧 技术栈

- **Node.js**: 运行环境
- **openai**: 阿里云百炼官方推荐的 SDK
- **dotenv**: 环境变量管理
- **jest**: 测试框架

## 📝 更新日志

### v1.0.0

- ✅ 基础对话功能
- ✅ 会话上下文管理
- ✅ 知识库集成
- ✅ 优先级策略
- ✅ 错误处理和重试
- ✅ 完整测试覆盖
