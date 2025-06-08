const {
  formatDashScopeRequest,
  formatDashScopeResponse,
  formatKnowledgeResponse,
} = require("../../src/utils/formatter");

describe("formatDashScopeRequest", () => {
  it("should include model, messages from context, and new prompt", () => {
    const sessionId = "s123";
    const contextMessages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];
    const prompt = "How are you?";

    const request = formatDashScopeRequest(sessionId, contextMessages, prompt);

    expect(request.model).toBe("qwen-turbo");
    expect(request.input.messages).toHaveLength(3);
    expect(request.input.messages[0]).toEqual(contextMessages[0]);
    expect(request.input.messages[1]).toEqual(contextMessages[1]);
    expect(request.input.messages[2]).toEqual({
      role: "user",
      content: prompt,
    });
    expect(request.parameters).toBeDefined();
  });

  it("should handle empty contextMessages", () => {
    const sessionId = "s456";
    const contextMessages = [];
    const prompt = "First message";

    const request = formatDashScopeRequest(sessionId, contextMessages, prompt);

    expect(request.model).toBe("qwen-turbo");
    expect(request.input.messages).toHaveLength(1);
    expect(request.input.messages[0]).toEqual({
      role: "user",
      content: prompt,
    });
  });

  it("should handle null contextMessages", () => {
    const sessionId = "s789";
    const prompt = "Another message";

    const request = formatDashScopeRequest(sessionId, null, prompt);
    expect(request.model).toBe("qwen-turbo");
    expect(request.input.messages).toHaveLength(1);
    expect(request.input.messages[0]).toEqual({
      role: "user",
      content: prompt,
    });
  });
});

describe("formatDashScopeResponse", () => {
  it("should return string response directly if input is string", () => {
    const apiResponse = "Simple AI response string";
    expect(formatDashScopeResponse(apiResponse)).toBe(apiResponse);
  });

  it("should extract content from complex object response", () => {
    const apiResponse = {
      output: {
        choices: [{ message: { content: "Content from complex object" } }],
      },
    };
    expect(formatDashScopeResponse(apiResponse)).toBe(
      "Content from complex object"
    );
  });

  it("should return the input itself if structure is not recognized", () => {
    const unusualResponse = { data: "Some unusual structure" };
    expect(formatDashScopeResponse(unusualResponse)).toBe(unusualResponse);

    const nullResponse = null;
    expect(formatDashScopeResponse(nullResponse)).toBeNull();
  });
});

describe("formatKnowledgeResponse", () => {
  it("should format successful knowledge response", () => {
    const knowledgeResponse = { success: true, data: "Answer from KB" };
    const query = "What is the price?";
    const knowledgeId = "kb1";

    const result = formatKnowledgeResponse(
      knowledgeResponse,
      query,
      knowledgeId
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe("Answer from KB");
    expect(result.query).toBe(query);
    expect(result.knowledgeId).toBe(knowledgeId);
    expect(result.timestamp).toBeDefined();
  });

  it("should handle empty response", () => {
    const result = formatKnowledgeResponse(null, "query", "kb1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Empty response from knowledge base");
    expect(result.query).toBe("query");
    expect(result.knowledgeId).toBe("kb1");
  });

  it("should pass through error responses", () => {
    const errorResponse = { success: false, error: "KB not found" };
    const result = formatKnowledgeResponse(errorResponse, "query", "kb1");

    expect(result).toBe(errorResponse);
  });

  it("should handle response without explicit success field", () => {
    const response = "Direct string response";
    const result = formatKnowledgeResponse(response, "query", "kb1");

    expect(result.success).toBe(true);
    expect(result.data).toBe("Direct string response");
    expect(result.query).toBe("query");
    expect(result.knowledgeId).toBe("kb1");
  });
});
