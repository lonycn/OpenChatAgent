/**
 * 🔌 WebSocket 独立模块入口
 * 
 * 提供统一的WebSocket服务管理和消息处理能力
 * 解决对话无响应、模块耦合等问题
 */

const WebSocketManager = require('./core/WebSocketManager');
const ConnectionPool = require('./core/ConnectionPool');
const MessageProcessor = require('./core/MessageProcessor');
const EventBus = require('./core/EventBus');

// 导出核心组件
module.exports = {
  WebSocketManager,
  ConnectionPool,
  MessageProcessor,
  EventBus,
  
  // 便捷创建方法
  create: (options = {}) => {
    return new WebSocketManager(options);
  },
  
  // 版本信息
  version: '1.0.0'
};