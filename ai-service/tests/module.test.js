const DashScopeClient = require("../src"); // Should resolve to ai-service/src/index.js

describe("AI Service Module", () => {
  it("should export DashScopeClient correctly", () => {
    expect(DashScopeClient).toBeDefined();
    expect(typeof DashScopeClient).toBe("function"); // Assuming it's a class constructor
  });

  it("should allow instantiation of DashScopeClient from module export", () => {
    // Provide dummy API key for instantiation test
    const client = new DashScopeClient("sk-dummy_key");
    expect(client).toBeInstanceOf(DashScopeClient);
    expect(typeof client.sendMessage).toBe("function");
    expect(typeof client.callKnowledge).toBe("function");
  });
});
