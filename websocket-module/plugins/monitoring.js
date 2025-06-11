/**
 * 📊 监控插件 - 实时监控WebSocket服务状态
 * 
 * 功能:
 * - 连接状态监控
 * - 消息流量统计
 * - 性能指标收集
 * - 异常检测和告警
 */

class MonitoringPlugin {
  constructor(wsManager, eventBus, options = {}) {
    this.wsManager = wsManager;
    this.eventBus = eventBus;
    
    this.options = {
      metricsInterval: 60000, // 1分钟
      alertThresholds: {
        connectionCount: 800,
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5秒
        memoryUsage: 0.8 // 80%
      },
      enableAlerts: true,
      enableMetricsCollection: true,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24小时
      ...options
    };
    
    // 监控数据
    this.metrics = {
      connections: {
        current: 0,
        peak: 0,
        total: 0,
        history: []
      },
      messages: {
        received: 0,
        sent: 0,
        failed: 0,
        avgResponseTime: 0,
        history: []
      },
      errors: {
        count: 0,
        rate: 0,
        types: new Map(),
        history: []
      },
      performance: {
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
        history: []
      }
    };
    
    // 告警状态
    this.alerts = {
      active: new Map(),
      history: []
    };
    
    this.initialize();
    
    console.log('📊 Monitoring plugin initialized');
  }
  
  /**
   * 初始化监控
   */
  initialize() {
    this.setupEventListeners();
    this.startMetricsCollection();
    
    if (this.options.enableAlerts) {
      this.startAlertMonitoring();
    }
  }
  
  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 连接事件
    this.eventBus.register('connection:added', (connectionInfo) => {
      this.metrics.connections.current++;
      this.metrics.connections.total++;
      
      if (this.metrics.connections.current > this.metrics.connections.peak) {
        this.metrics.connections.peak = this.metrics.connections.current;
      }
    });
    
    this.eventBus.register('connection:removed', (connectionInfo) => {
      this.metrics.connections.current = Math.max(0, this.metrics.connections.current - 1);
    });
    
    // 消息事件
    this.eventBus.register('message:processed', (data) => {
      this.metrics.messages.received++;
      this.updateResponseTime(data.processingTime);
    });
    
    this.eventBus.register('message:sent', (data) => {
      this.metrics.messages.sent++;
    });
    
    this.eventBus.register('message:error', (data) => {
      this.metrics.messages.failed++;
      this.recordError(data.error);
    });
    
    // 连接错误
    this.eventBus.register('connection:error', (data) => {
      this.recordError(data.error, 'connection');
    });
    
    // 服务器事件
    this.eventBus.register('server:error', (error) => {
      this.recordError(error, 'server');
    });
  }
  
  /**
   * 开始指标收集
   */
  startMetricsCollection() {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.options.metricsInterval);
  }
  
  /**
   * 收集指标
   */
  collectMetrics() {
    const timestamp = new Date();
    
    // 收集性能指标
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.performance.memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
    this.metrics.performance.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // 转换为秒
    this.metrics.performance.uptime = process.uptime();
    
    // 计算错误率
    const totalMessages = this.metrics.messages.received + this.metrics.messages.sent;
    this.metrics.errors.rate = totalMessages > 0 ? this.metrics.errors.count / totalMessages : 0;
    
    // 记录历史数据
    const snapshot = {
      timestamp: timestamp.toISOString(),
      connections: { ...this.metrics.connections },
      messages: { ...this.metrics.messages },
      errors: { ...this.metrics.errors, types: Object.fromEntries(this.metrics.errors.types) },
      performance: { ...this.metrics.performance }
    };
    
    this.addToHistory('connections', snapshot.connections);
    this.addToHistory('messages', snapshot.messages);
    this.addToHistory('errors', snapshot.errors);
    this.addToHistory('performance', snapshot.performance);
    
    // 发布指标事件
    this.eventBus.publish('metrics:collected', snapshot);
  }
  
  /**
   * 添加到历史记录
   */
  addToHistory(type, data) {
    const history = this.metrics[type].history;
    const timestamp = new Date().toISOString();
    
    history.push({ timestamp, ...data });
    
    // 清理过期数据
    const cutoff = Date.now() - this.options.retentionPeriod;
    this.metrics[type].history = history.filter(item => 
      new Date(item.timestamp).getTime() > cutoff
    );
  }
  
  /**
   * 更新响应时间
   */
  updateResponseTime(processingTime) {
    const currentAvg = this.metrics.messages.avgResponseTime;
    const count = this.metrics.messages.received;
    
    this.metrics.messages.avgResponseTime = 
      (currentAvg * (count - 1) + processingTime) / count;
  }
  
  /**
   * 记录错误
   */
  recordError(error, category = 'general') {
    this.metrics.errors.count++;
    
    const errorType = `${category}:${error.code || error.name || 'Unknown'}`;
    const currentCount = this.metrics.errors.types.get(errorType) || 0;
    this.metrics.errors.types.set(errorType, currentCount + 1);
    
    // 记录错误历史
    this.metrics.errors.history.push({
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message,
      category
    });
  }
  
  /**
   * 开始告警监控
   */
  startAlertMonitoring() {
    this.alertTimer = setInterval(() => {
      this.checkAlerts();
    }, this.options.metricsInterval);
  }
  
  /**
   * 检查告警条件
   */
  checkAlerts() {
    const thresholds = this.options.alertThresholds;
    
    // 检查连接数告警
    this.checkAlert(
      'high_connection_count',
      this.metrics.connections.current >= thresholds.connectionCount,
      `High connection count: ${this.metrics.connections.current}/${thresholds.connectionCount}`
    );
    
    // 检查错误率告警
    this.checkAlert(
      'high_error_rate',
      this.metrics.errors.rate >= thresholds.errorRate,
      `High error rate: ${(this.metrics.errors.rate * 100).toFixed(2)}%`
    );
    
    // 检查响应时间告警
    this.checkAlert(
      'slow_response_time',
      this.metrics.messages.avgResponseTime >= thresholds.responseTime,
      `Slow response time: ${this.metrics.messages.avgResponseTime.toFixed(2)}ms`
    );
    
    // 检查内存使用告警
    this.checkAlert(
      'high_memory_usage',
      this.metrics.performance.memoryUsage >= thresholds.memoryUsage,
      `High memory usage: ${(this.metrics.performance.memoryUsage * 100).toFixed(2)}%`
    );
  }
  
  /**
   * 检查单个告警
   */
  checkAlert(alertId, condition, message) {
    const isActive = this.alerts.active.has(alertId);
    
    if (condition && !isActive) {
      // 触发新告警
      const alert = {
        id: alertId,
        message,
        level: 'warning',
        triggeredAt: new Date().toISOString(),
        count: 1
      };
      
      this.alerts.active.set(alertId, alert);
      this.alerts.history.push({ ...alert, action: 'triggered' });
      
      this.eventBus.publish('alert:triggered', alert);
      console.warn(`🚨 Alert triggered: ${message}`);
      
    } else if (!condition && isActive) {
      // 解除告警
      const alert = this.alerts.active.get(alertId);
      alert.resolvedAt = new Date().toISOString();
      
      this.alerts.active.delete(alertId);
      this.alerts.history.push({ ...alert, action: 'resolved' });
      
      this.eventBus.publish('alert:resolved', alert);
      console.info(`✅ Alert resolved: ${alertId}`);
      
    } else if (condition && isActive) {
      // 更新现有告警计数
      const alert = this.alerts.active.get(alertId);
      alert.count++;
      alert.lastTriggered = new Date().toISOString();
    }
  }
  
  /**
   * 获取实时指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      alerts: {
        active: Array.from(this.alerts.active.values()),
        total: this.alerts.history.length
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 获取健康状态
   */
  getHealthStatus() {
    const activeAlerts = this.alerts.active.size;
    const errorRate = this.metrics.errors.rate;
    
    let status = 'healthy';
    if (activeAlerts > 0) {
      status = 'warning';
    }
    if (errorRate > 0.1) { // 10%错误率
      status = 'critical';
    }
    
    return {
      status,
      activeAlerts,
      errorRate: (errorRate * 100).toFixed(2) + '%',
      connections: this.metrics.connections.current,
      uptime: this.metrics.performance.uptime,
      memoryUsage: (this.metrics.performance.memoryUsage * 100).toFixed(2) + '%'
    };
  }
  
  /**
   * 获取历史数据
   */
  getHistoryData(type, timeRange = 3600000) { // 默认1小时
    const cutoff = Date.now() - timeRange;
    const history = this.metrics[type]?.history || [];
    
    return history.filter(item => 
      new Date(item.timestamp).getTime() > cutoff
    );
  }
  
  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics.messages.received = 0;
    this.metrics.messages.sent = 0;
    this.metrics.messages.failed = 0;
    this.metrics.errors.count = 0;
    this.metrics.errors.types.clear();
    
    console.log('📊 Metrics reset');
  }
  
  /**
   * 停止监控
   */
  stop() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
    }
    
    console.log('📊 Monitoring plugin stopped');
  }
}

module.exports = MonitoringPlugin;