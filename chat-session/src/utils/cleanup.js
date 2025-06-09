const SessionManager = require("../managers/SessionManager");
require("dotenv").config();

const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL) || 3600; // 1小时

class SessionCleanup {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * 启动定期清理
   */
  start() {
    if (this.isRunning) {
      console.log("SessionCleanup: Already running");
      return;
    }

    console.log(
      `SessionCleanup: Starting cleanup with interval ${CLEANUP_INTERVAL}s`
    );
    this.isRunning = true;

    // 立即执行一次清理
    this.cleanup();

    // 设置定期清理
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL * 1000);
  }

  /**
   * 停止定期清理
   */
  stop() {
    if (!this.isRunning) {
      console.log("SessionCleanup: Not running");
      return;
    }

    console.log("SessionCleanup: Stopping cleanup");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 执行清理操作
   */
  async cleanup() {
    try {
      console.log("SessionCleanup: Starting cleanup process");
      const cleanedCount = await this.sessionManager.cleanupExpiredSessions();
      console.log(
        `SessionCleanup: Cleaned up ${cleanedCount} expired sessions`
      );
    } catch (error) {
      console.error("SessionCleanup: Error during cleanup:", error);
    }
  }

  /**
   * 获取清理状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: CLEANUP_INTERVAL,
      nextCleanup: this.intervalId
        ? new Date(Date.now() + CLEANUP_INTERVAL * 1000)
        : null,
    };
  }
}

module.exports = SessionCleanup;
