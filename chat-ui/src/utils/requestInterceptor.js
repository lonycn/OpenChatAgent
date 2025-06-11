// 🚨 专业级HTTP请求拦截器 - 使用成熟库
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { v4 as uuidv4 } from "uuid";

class RequestInterceptor {
  constructor() {
    this.blockedRequests = [];
    this.interceptCount = 0;
    this.isInitialized = false;
    this.logger = this.createLogger();

    // 初始化所有拦截器
    this.initialize();
  }

  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[RequestInterceptor] ${message}`, data);
        this.logToFile("INFO", message, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[RequestInterceptor] ${message}`, data);
        this.logToFile("WARN", message, data);
      },
      error: (message, data = {}) => {
        console.error(`[RequestInterceptor] ${message}`, data);
        this.logToFile("ERROR", message, data);
      },
      debug: (message, data = {}) => {
        console.debug(`[RequestInterceptor] ${message}`, data);
        this.logToFile("DEBUG", message, data);
      },
    };
  }

  logToFile(level, message, data = {}) {
    // 记录到全局变量供调试和后端采集
    if (!window.interceptorLogs) {
      window.interceptorLogs = [];
    }

    const logEntry = {
      id: uuidv4(),
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    window.interceptorLogs.push(logEntry);

    // 保持最新1000条记录
    if (window.interceptorLogs.length > 1000) {
      window.interceptorLogs = window.interceptorLogs.slice(-1000);
    }

    // 发送到后端日志服务（如果可用）
    this.sendLogToBackend(logEntry);
  }

  async sendLogToBackend(logEntry) {
    try {
      // 异步发送日志到后端，不阻塞主流程
      setTimeout(async () => {
        try {
          await fetch("/api/logs/frontend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(logEntry),
          });
        } catch (error) {
          // 静默处理日志发送失败，避免循环
        }
      }, 0);
    } catch (error) {
      // 静默处理
    }
  }

  initialize() {
    if (this.isInitialized) {
      this.logger.warn("RequestInterceptor already initialized");
      return;
    }

    this.logger.info("Initializing professional HTTP request interceptor");

    // 1. Axios Mock Adapter - 最可靠的axios拦截
    this.setupAxiosMockAdapter();

    // 2. 原生fetch拦截 - 处理fetch API
    this.setupFetchInterceptor();

    // 3. XMLHttpRequest拦截 - 处理原生XHR
    this.setupXHRInterceptor();

    // 4. DOM监控 - 检测动态插入的请求元素
    this.setupDOMObserver();

    // 5. 全局错误监控
    this.setupGlobalErrorHandler();

    this.isInitialized = true;
    this.logger.info("All request interceptors initialized successfully");
  }

  setupAxiosMockAdapter() {
    try {
      // 为默认axios实例创建mock adapter
      const mock = new AxiosMockAdapter(axios, {
        delayResponse: 0,
        onNoMatch: "throwException", // 对未匹配的请求抛出异常
      });

      // 拦截所有可能的ProChat相关请求
      const suspiciousPatterns = [
        /\/api\/openai\/chat/,
        /openai/,
        /chat\/completions/,
        /v1\/chat/,
        /anthropic/,
        /claude/,
      ];

      suspiciousPatterns.forEach((pattern) => {
        // 拦截所有HTTP方法
        ["get", "post", "put", "patch", "delete", "head", "options"].forEach(
          (method) => {
            mock[`on${method.charAt(0).toUpperCase() + method.slice(1)}`](
              pattern
            ).reply((config) => {
              this.handleBlockedRequest(
                "axios",
                config.method,
                config.url,
                config
              );
              return [
                423,
                {
                  error: "HTTP requests blocked by interceptor",
                  message:
                    "This application uses WebSocket for real-time communication",
                  timestamp: new Date().toISOString(),
                },
              ];
            });
          }
        );
      });

      // 通配符拦截器 - 捕获所有其他可疑请求
      mock.onAny().reply((config) => {
        const url = config.url || "";
        const isSuspicious = this.isSuspiciousRequest(url, config);

        if (isSuspicious) {
          this.handleBlockedRequest(
            "axios-wildcard",
            config.method,
            config.url,
            config
          );
          return [
            423,
            {
              error: "HTTP requests blocked by interceptor",
              message:
                "This application uses WebSocket for real-time communication",
            },
          ];
        }

        // 放行正常请求
        return [200, { passthrough: true }];
      });

      this.axiosMock = mock;
      this.logger.info("Axios mock adapter configured successfully");
    } catch (error) {
      this.logger.error("Failed to setup axios mock adapter", {
        error: error.message,
      });
    }
  }

  setupFetchInterceptor() {
    try {
      const originalFetch = window.fetch;

      window.fetch = async (...args) => {
        const url =
          typeof args[0] === "string" ? args[0] : args[0]?.url || "unknown";
        const options = args[1] || {};

        if (this.isSuspiciousRequest(url, options)) {
          this.handleBlockedRequest("fetch", options.method || "GET", url, {
            options,
          });

          // 返回一个被拒绝的Promise，而不是抛出错误
          return Promise.reject(
            new Response(
              JSON.stringify({
                error: "HTTP request blocked by interceptor",
                url,
                timestamp: new Date().toISOString(),
              }),
              {
                status: 423,
                statusText: "Locked",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            )
          );
        }

        // 放行正常请求
        this.logger.debug("Allowing fetch request", {
          url,
          method: options.method,
        });
        return originalFetch.apply(this, args);
      };

      this.logger.info("Fetch interceptor setup complete");
    } catch (error) {
      this.logger.error("Failed to setup fetch interceptor", {
        error: error.message,
      });
    }
  }

  setupXHRInterceptor() {
    try {
      const originalOpen = XMLHttpRequest.prototype.open;
      const self = this;

      XMLHttpRequest.prototype.open = function (method, url, ...args) {
        if (self.isSuspiciousRequest(url, { method })) {
          self.handleBlockedRequest("xhr", method, url, { args });

          // 模拟一个失败的请求
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event("error"));
            }
          }, 0);
          return;
        }

        self.logger.debug("Allowing XHR request", { method, url });
        return originalOpen.apply(this, [method, url, ...args]);
      };

      this.logger.info("XMLHttpRequest interceptor setup complete");
    } catch (error) {
      this.logger.error("Failed to setup XHR interceptor", {
        error: error.message,
      });
    }
  }

  setupDOMObserver() {
    try {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Element node
              this.inspectElement(node);
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "href", "action"],
      });

      this.domObserver = observer;
      this.logger.info("DOM observer setup complete");
    } catch (error) {
      this.logger.error("Failed to setup DOM observer", {
        error: error.message,
      });
    }
  }

  inspectElement(element) {
    const tagName = element.tagName?.toLowerCase();

    if (["script", "iframe", "form", "link"].includes(tagName)) {
      const url = element.src || element.href || element.action;

      if (url && this.isSuspiciousRequest(url)) {
        this.logger.warn("Suspicious element detected", {
          tagName,
          url,
          innerHTML: element.innerHTML?.substring(0, 100),
        });

        // 阻止可疑元素加载
        if (element.src) element.src = "";
        if (element.href) element.href = "javascript:void(0)";
        if (element.action) element.action = "javascript:void(0)";
      }
    }
  }

  setupGlobalErrorHandler() {
    try {
      // 监听全局错误
      window.addEventListener("error", (event) => {
        if (event.message?.includes("HTTP request blocked")) {
          this.logger.debug("Caught blocked request error", {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
          });
          event.preventDefault(); // 阻止错误冒泡到控制台
        }
      });

      // 监听未处理的Promise拒绝
      window.addEventListener("unhandledrejection", (event) => {
        if (event.reason?.message?.includes("HTTP request blocked")) {
          this.logger.debug("Caught blocked request promise rejection", {
            reason: event.reason.message,
          });
          event.preventDefault(); // 阻止错误冒泡到控制台
        }
      });

      this.logger.info("Global error handlers setup complete");
    } catch (error) {
      this.logger.error("Failed to setup global error handlers", {
        error: error.message,
      });
    }
  }

  isSuspiciousRequest(url, options = {}) {
    if (!url || typeof url !== "string") return false;

    const suspiciousPatterns = [
      "/api/openai/chat",
      "openai",
      "chat/completions",
      "v1/chat",
      "anthropic",
      "claude",
      "gpt-",
      "chatgpt",
    ];

    const isSuspicious = suspiciousPatterns.some((pattern) =>
      url.toLowerCase().includes(pattern.toLowerCase())
    );

    // 检查headers中的可疑内容
    if (options.headers) {
      const headersString = JSON.stringify(options.headers).toLowerCase();
      const isSuspiciousHeader = suspiciousPatterns.some((pattern) =>
        headersString.includes(pattern.toLowerCase())
      );

      if (isSuspiciousHeader) return true;
    }

    return isSuspicious;
  }

  handleBlockedRequest(source, method, url, details = {}) {
    this.interceptCount++;

    const requestInfo = {
      id: uuidv4(),
      source,
      method: method?.toUpperCase() || "UNKNOWN",
      url,
      timestamp: new Date().toISOString(),
      count: this.interceptCount,
      details,
      userAgent: navigator.userAgent,
      referer: document.referrer,
      stackTrace: new Error().stack,
    };

    this.blockedRequests.push(requestInfo);

    // 保持最新500条记录
    if (this.blockedRequests.length > 500) {
      this.blockedRequests = this.blockedRequests.slice(-500);
    }

    // 更新全局状态
    window.blockedRequests = this.blockedRequests;
    window.interceptorStats = {
      totalBlocked: this.interceptCount,
      lastBlocked: requestInfo.timestamp,
      sources: this.getSourceStats(),
    };

    this.logger.warn("🚫 HTTP Request Blocked", requestInfo);

    // 触发自定义事件，供其他组件监听
    window.dispatchEvent(
      new CustomEvent("httpRequestBlocked", {
        detail: requestInfo,
      })
    );
  }

  getSourceStats() {
    const stats = {};
    this.blockedRequests.forEach((req) => {
      stats[req.source] = (stats[req.source] || 0) + 1;
    });
    return stats;
  }

  // 公共API
  getStats() {
    return {
      totalBlocked: this.interceptCount,
      recentRequests: this.blockedRequests.slice(-10),
      sourceBreakdown: this.getSourceStats(),
      isInitialized: this.isInitialized,
    };
  }

  getLogs() {
    return window.interceptorLogs || [];
  }

  clearStats() {
    this.blockedRequests = [];
    this.interceptCount = 0;
    window.blockedRequests = [];
    window.interceptorStats = null;
    window.interceptorLogs = [];
    this.logger.info("All interceptor stats cleared");
  }

  destroy() {
    try {
      // 清理axios mock
      if (this.axiosMock) {
        this.axiosMock.restore();
      }

      // 清理DOM observer
      if (this.domObserver) {
        this.domObserver.disconnect();
      }

      // 注意：fetch和XHR的原始函数无法完全恢复，
      // 但这通常不是问题，因为页面刷新会重置所有状态

      this.isInitialized = false;
      this.logger.info("RequestInterceptor destroyed");
    } catch (error) {
      this.logger.error("Error during interceptor cleanup", {
        error: error.message,
      });
    }
  }
}

// 创建全局单例
console.log("🚀 RequestInterceptor: 创建全局实例...");
const requestInterceptor = new RequestInterceptor();

// 暴露到window对象
window.requestInterceptor = requestInterceptor;
console.log("✅ RequestInterceptor: 已暴露到window.requestInterceptor");

// 导出单例实例
export default requestInterceptor;

// 同时提供类导出，供测试使用
export { RequestInterceptor };
