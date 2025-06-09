const SessionManager = require("../src/managers/SessionManager");
const SessionCleanup = require("../src/utils/cleanup");
const { closeRedisClient } = require("../src/utils/redis");

describe("SessionCleanup", () => {
  let sessionManager;
  let cleanup;

  beforeEach(() => {
    sessionManager = new SessionManager();
    cleanup = new SessionCleanup(sessionManager);
  });

  afterEach(async () => {
    if (cleanup.isRunning) {
      cleanup.stop();
    }
    await closeRedisClient();
  });

  describe("构造函数", () => {
    test("应该正确初始化", () => {
      expect(cleanup.sessionManager).toBe(sessionManager);
      expect(cleanup.intervalId).toBeNull();
      expect(cleanup.isRunning).toBe(false);
    });
  });

  describe("start()", () => {
    test("应该启动清理服务", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      cleanup.start();

      expect(cleanup.isRunning).toBe(true);
      expect(cleanup.intervalId).not.toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Starting cleanup with interval")
      );

      consoleSpy.mockRestore();
    });

    test("重复启动应该被忽略", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      cleanup.start();
      cleanup.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        "SessionCleanup: Already running"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("stop()", () => {
    test("应该停止清理服务", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      cleanup.start();
      cleanup.stop();

      expect(cleanup.isRunning).toBe(false);
      expect(cleanup.intervalId).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "SessionCleanup: Stopping cleanup"
      );

      consoleSpy.mockRestore();
    });

    test("未启动时停止应该被忽略", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      cleanup.stop();

      expect(consoleSpy).toHaveBeenCalledWith("SessionCleanup: Not running");

      consoleSpy.mockRestore();
    });
  });

  describe("cleanup()", () => {
    test("应该调用 sessionManager.cleanupExpiredSessions", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const cleanupSpy = jest
        .spyOn(sessionManager, "cleanupExpiredSessions")
        .mockResolvedValue(5);

      await cleanup.cleanup();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "SessionCleanup: Starting cleanup process"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "SessionCleanup: Cleaned up 5 expired sessions"
      );

      cleanupSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    test("应该处理清理错误", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const cleanupSpy = jest
        .spyOn(sessionManager, "cleanupExpiredSessions")
        .mockRejectedValue(new Error("Redis error"));

      await cleanup.cleanup();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "SessionCleanup: Error during cleanup:",
        expect.any(Error)
      );

      cleanupSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("getStatus()", () => {
    test("未启动时应该返回正确状态", () => {
      const status = cleanup.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.interval).toBe(3600); // 默认值
      expect(status.nextCleanup).toBeNull();
    });

    test("启动后应该返回正确状态", () => {
      cleanup.start();
      const status = cleanup.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.interval).toBe(3600);
      expect(status.nextCleanup).toBeInstanceOf(Date);
    });
  });

  describe("定期清理", () => {
    test("应该定期执行清理", (done) => {
      // 使用较短的间隔进行测试
      const originalInterval = process.env.CLEANUP_INTERVAL;
      process.env.CLEANUP_INTERVAL = "1"; // 1秒

      // 重新创建 cleanup 实例以使用新的环境变量
      const testCleanup = new SessionCleanup(sessionManager);

      const cleanupSpy = jest
        .spyOn(sessionManager, "cleanupExpiredSessions")
        .mockResolvedValue(0);

      testCleanup.start();

      // 等待至少执行一次清理
      setTimeout(() => {
        expect(cleanupSpy).toHaveBeenCalled();
        testCleanup.stop();
        cleanupSpy.mockRestore();

        // 恢复环境变量
        if (originalInterval) {
          process.env.CLEANUP_INTERVAL = originalInterval;
        } else {
          delete process.env.CLEANUP_INTERVAL;
        }

        done();
      }, 1500);
    });
  });
});
