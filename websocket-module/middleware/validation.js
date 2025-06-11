/**
 * ✅ 消息验证中间件 - 确保消息格式正确性
 * 
 * 功能:
 * - 消息格式验证
 * - 数据类型检查
 * - 内容长度限制
 * - 安全过滤
 */

class ValidationMiddleware {
  constructor(options = {}) {
    this.options = {
      maxMessageLength: 10000,
      maxContentLength: 8000,
      allowedTypes: ['text', 'init', 'ping', 'pong', 'system', 'image', 'file'],
      requireId: true,
      requireTimestamp: false,
      enableSanitization: true,
      ...options
    };
    
    // 消息模式定义
    this.schemas = {
      base: {
        id: { type: 'string', required: this.options.requireId },
        type: { type: 'string', required: true, enum: this.options.allowedTypes },
        timestamp: { type: 'string', required: this.options.requireTimestamp },
        from: { type: 'string', required: false },
        to: { type: 'string', required: false }
      },
      text: {
        content: { type: 'object', required: true },
        'content.text': { type: 'string', required: true, maxLength: this.options.maxContentLength }
      },
      init: {
        content: { type: 'object', required: true },
        'content.userId': { type: 'string', required: false },
        'content.sessionId': { type: 'string', required: false }
      },
      image: {
        content: { type: 'object', required: true },
        'content.url': { type: 'string', required: true },
        'content.alt': { type: 'string', required: false }
      },
      file: {
        content: { type: 'object', required: true },
        'content.filename': { type: 'string', required: true },
        'content.size': { type: 'number', required: true },
        'content.type': { type: 'string', required: true }
      }
    };
    
    console.log('✅ ValidationMiddleware initialized');
  }
  
  /**
   * 验证消息
   */
  async validate(message, connectionInfo) {
    try {
      // 基础验证
      this.validateBasicStructure(message);
      
      // 长度验证
      this.validateLength(message);
      
      // 类型特定验证
      this.validateByType(message);
      
      // 安全验证
      if (this.options.enableSanitization) {
        this.sanitizeMessage(message);
      }
      
      // 权限验证
      await this.validatePermissions(message, connectionInfo);
      
      return { valid: true };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        code: error.code || 'VALIDATION_ERROR'
      };
    }
  }
  
  /**
   * 验证基础结构
   */
  validateBasicStructure(message) {
    if (!message || typeof message !== 'object') {
      throw this.createError('Message must be an object', 'INVALID_FORMAT');
    }
    
    // 验证基础字段
    const baseSchema = this.schemas.base;
    for (const [field, rules] of Object.entries(baseSchema)) {
      this.validateField(message, field, rules);
    }
  }
  
  /**
   * 验证字段
   */
  validateField(message, fieldPath, rules) {
    const value = this.getNestedValue(message, fieldPath);
    
    // 必填验证
    if (rules.required && (value === undefined || value === null)) {
      throw this.createError(`Field '${fieldPath}' is required`, 'MISSING_FIELD');
    }
    
    // 如果字段不存在且非必填，跳过后续验证
    if (value === undefined || value === null) {
      return;
    }
    
    // 类型验证
    if (rules.type && typeof value !== rules.type) {
      throw this.createError(
        `Field '${fieldPath}' must be of type ${rules.type}, got ${typeof value}`,
        'INVALID_TYPE'
      );
    }
    
    // 枚举验证
    if (rules.enum && !rules.enum.includes(value)) {
      throw this.createError(
        `Field '${fieldPath}' must be one of: ${rules.enum.join(', ')}`,
        'INVALID_ENUM'
      );
    }
    
    // 长度验证
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      throw this.createError(
        `Field '${fieldPath}' exceeds maximum length of ${rules.maxLength}`,
        'FIELD_TOO_LONG'
      );
    }
    
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      throw this.createError(
        `Field '${fieldPath}' is below minimum length of ${rules.minLength}`,
        'FIELD_TOO_SHORT'
      );
    }
  }
  
  /**
   * 获取嵌套值
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  
  /**
   * 验证消息长度
   */
  validateLength(message) {
    const messageString = JSON.stringify(message);
    
    if (messageString.length > this.options.maxMessageLength) {
      throw this.createError(
        `Message exceeds maximum length of ${this.options.maxMessageLength} characters`,
        'MESSAGE_TOO_LONG'
      );
    }
  }
  
  /**
   * 按类型验证
   */
  validateByType(message) {
    const typeSchema = this.schemas[message.type];
    
    if (!typeSchema) {
      return; // 没有特定模式，跳过
    }
    
    for (const [field, rules] of Object.entries(typeSchema)) {
      this.validateField(message, field, rules);
    }
  }
  
  /**
   * 消息净化
   */
  sanitizeMessage(message) {
    // 净化文本内容
    if (message.content && message.content.text) {
      message.content.text = this.sanitizeText(message.content.text);
    }
    
    // 净化其他字符串字段
    if (message.from) {
      message.from = this.sanitizeText(message.from);
    }
    
    if (message.to) {
      message.to = this.sanitizeText(message.to);
    }
  }
  
  /**
   * 净化文本
   */
  sanitizeText(text) {
    if (typeof text !== 'string') {
      return text;
    }
    
    // 移除潜在的XSS攻击代码
    return text
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // 移除script标签
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // 移除iframe标签
      .replace(/javascript:/gi, '') // 移除javascript协议
      .replace(/on\w+\s*=/gi, '') // 移除事件处理器
      .trim();
  }
  
  /**
   * 验证权限
   */
  async validatePermissions(message, connectionInfo) {
    // 检查用户是否有发送此类型消息的权限
    if (!connectionInfo.userId && message.type !== 'init') {
      throw this.createError('Authentication required for this message type', 'AUTH_REQUIRED');
    }
    
    // 系统消息只能由管理员发送
    if (message.type === 'system') {
      const userRoles = connectionInfo.roles || [];
      if (!userRoles.includes('admin') && !userRoles.includes('system')) {
        throw this.createError('Insufficient permissions for system messages', 'PERMISSION_DENIED');
      }
    }
  }
  
  /**
   * 创建错误对象
   */
  createError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }
  
  /**
   * 添加自定义验证规则
   */
  addValidationRule(messageType, field, rules) {
    if (!this.schemas[messageType]) {
      this.schemas[messageType] = {};
    }
    
    this.schemas[messageType][field] = rules;
  }
  
  /**
   * 获取验证统计
   */
  getValidationStats() {
    return {
      supportedTypes: this.options.allowedTypes,
      maxMessageLength: this.options.maxMessageLength,
      maxContentLength: this.options.maxContentLength,
      schemasCount: Object.keys(this.schemas).length
    };
  }
}

// 导出中间件函数
module.exports = (options = {}) => {
  const validator = new ValidationMiddleware(options);
  
  return {
    type: 'message',
    handler: async (message, connectionInfo) => {
      const result = await validator.validate(message, connectionInfo);
      
      if (!result.valid) {
        const error = new Error(result.error);
        error.code = result.code;
        throw error;
      }
      
      return true;
    },
    validator // 暴露验证器实例以便配置
  };
};