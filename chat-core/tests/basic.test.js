const request = require("supertest");
const app = require("../src/server/app");

describe("Chat-Core Basic Tests", () => {
  describe("GET /", () => {
    it("应该返回服务状态信息", async () => {
      const response = await request(app).get("/").expect(200);

      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("version");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("GET /api/health", () => {
    it("应该返回健康检查信息", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("service", "chat-core");
      expect(response.body).toHaveProperty("version");
    });
  });

  describe("GET /api/info", () => {
    it("应该返回 API 信息", async () => {
      const response = await request(app).get("/api/info").expect(200);

      expect(response.body).toHaveProperty("service", "chat-core");
      expect(response.body).toHaveProperty("endpoints");
      expect(response.body).toHaveProperty("features");
    });
  });

  describe("POST /api/sessions", () => {
    it("应该创建新会话", async () => {
      const response = await request(app)
        .post("/api/sessions")
        .send({ userId: "test-user" })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("sessionId");
      // 由于认证中间件的存在，实际的 userId 可能是 guest_ 开头的
      expect(response.body.data).toHaveProperty("userId");
      expect(response.body.data.userId).toMatch(/^(test-user|guest_)/);
    });

    it("应该处理无 userId 的请求", async () => {
      const response = await request(app)
        .post("/api/sessions")
        .send({})
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("sessionId");
      expect(response.body.data.userId).toMatch(/^(user_|guest_)/);
    });
  });

  describe("POST /api/messages", () => {
    it("应该发送消息并返回 AI 回复", async () => {
      const messageData = {
        sessionId: "test-session",
        userId: "test-user",
        text: "Hello AI",
        type: "text",
      };

      const response = await request(app)
        .post("/api/messages")
        .send(messageData)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("userMessage");
      expect(response.body.data).toHaveProperty("aiResponse");
      expect(response.body.data.aiResponse.text).toContain("Hello AI");
    });

    it("应该验证必需字段", async () => {
      const response = await request(app)
        .post("/api/messages")
        .send({ text: "Hello" })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /api/feedback", () => {
    it("应该接收用户反馈", async () => {
      const feedbackData = {
        sessionId: "test-session",
        rating: 5,
        comment: "Great service!",
      };

      const response = await request(app)
        .post("/api/feedback")
        .send(feedbackData)
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message");
      expect(response.body.data).toHaveProperty("feedbackId");
    });

    it("应该验证评分范围", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          sessionId: "test-session",
          rating: 10, // 超出范围
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("404 处理", () => {
    it("应该为不存在的路由返回 404", async () => {
      const response = await request(app)
        .get("/non-existent-route")
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });
  });
});
