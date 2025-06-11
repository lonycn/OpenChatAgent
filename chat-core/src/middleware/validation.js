const Joi = require("joi");

/**
 * 消息格式验证模式
 */
const messageSchema = Joi.object({
  id: Joi.string().optional(),
  type: Joi.string()
    .valid("text", "image", "file", "system", "init")
    .required(),
  text: Joi.string().max(2000).when("type", {
    is: "text",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  payload: Joi.object().when("type", {
    is: "init",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  metadata: Joi.object().optional(),
  sessionId: Joi.string().optional(),
  userId: Joi.string().optional(),
  timestamp: Joi.string().isoDate().optional(),
});

/**
 * 会话创建验证模式
 */
const sessionCreateSchema = Joi.object({
  userId: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

/**
 * 切换代理验证模式
 */
const switchAgentSchema = Joi.object({
  agent: Joi.string().valid("ai", "human").required(),
});

/**
 * 反馈提交验证模式
 */
const feedbackSchema = Joi.object({
  sessionId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500).optional(),
  messageId: Joi.string().optional(),
});

/**
 * 通用验证中间件工厂
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // 将验证后的数据替换原始数据
    req.body = value;
    next();
  };
}

/**
 * WebSocket 消息验证
 */
function validateWebSocketMessage(message) {
  const { error, value } = messageSchema.validate(message);

  if (error) {
    throw new Error(`Invalid message format: ${error.details[0].message}`);
  }

  return value;
}

/**
 * 参数验证中间件
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);

    if (error) {
      return res.status(400).json({
        error: "Invalid parameters",
        details: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    req.params = value;
    next();
  };
}

/**
 * 查询参数验证中间件
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);

    if (error) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    req.query = value;
    next();
  };
}

// 常用的参数验证模式
const sessionIdSchema = Joi.object({
  sessionId: Joi.string().required(),
});

const historyQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = {
  // 验证模式
  messageSchema,
  sessionCreateSchema,
  switchAgentSchema,
  feedbackSchema,
  sessionIdSchema,
  historyQuerySchema,

  // 验证中间件
  validateBody,
  validateParams,
  validateQuery,
  validateWebSocketMessage,
};
