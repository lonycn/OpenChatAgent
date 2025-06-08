const DashScopeClient = require("../src/client/DashScopeClient");

// Mock axios for all tests in this file
// const axios = require('axios'); // We might need this if we were to mock axios calls, but client doesn't make them yet.
// jest.mock('axios'); // Temporarily removing to see if it affects promise resolution

describe("DashScopeClient", () => {
  const mockApiKey = "sk-test_api_key";

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    // axios.post.mockClear(); // No axios mock for now
    // Reset any previous mock implementation
    // axios.post.mockReset(); // No axios mock for now
  });

  // This is the consolidated constructor test block
  describe("constructor", () => {
    it("should initialize correctly with API key and default knowledgeBaseConfigs", () => {
      const client = new DashScopeClient(mockApiKey);
      expect(client.openai).toBeDefined();
      expect(client.sessionContexts).toEqual({});
      expect(client.knowledgeBaseConfigs).toEqual([]);
      expect(client.defaultModel).toBe("qwen-plus");
    });

    it("should throw an error if API key is missing", () => {
      expect(() => new DashScopeClient(null)).toThrow("API key is required.");
    });

    it("should initialize with knowledgeBaseConfigs if provided", () => {
      const kbConfigs = [{ id: "kb1", name: "FAQ", priority: 1 }];
      const client = new DashScopeClient(mockApiKey, kbConfigs);
      expect(client.knowledgeBaseConfigs).toBe(kbConfigs);
    });

    it("should initialize with custom model if provided", () => {
      const client = new DashScopeClient(mockApiKey, [], {
        model: "qwen-turbo",
      });
      expect(client.defaultModel).toBe("qwen-turbo");
    });
  });

  describe("sendMessage", () => {
    let client;

    beforeEach(() => {
      client = new DashScopeClient(mockApiKey);
      // Default mock successful response for sendMessage tests
      // The actual client currently doesn't use axios.post, but we set it up for future / more realistic tests
      // axios.post.mockResolvedValue({ // No axios mock for now
      //   data: {
      //     output: {
      //       choices: [{ message: { content: 'Mocked AI Response' } }],
      //     },
      //   },
      // });
    });

    it("should handle a single-turn conversation", async () => {
      const sessionId = "session1";
      const userMessage = "Hello, AI!";
      const expectedResponse = "Hello! How can I help you today?";

      // Mock the OpenAI API call
      const mockCreate = jest.spyOn(client.openai.chat.completions, "create");
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: expectedResponse } }],
      });

      const response = await client.sendMessage(sessionId, userMessage);
      expect(response).toBe(expectedResponse);
      expect(client.sessionContexts[sessionId]).toHaveLength(2); // User message + AI response
      expect(client.sessionContexts[sessionId][0]).toEqual({
        role: "user",
        content: userMessage,
      });
      expect(client.sessionContexts[sessionId][1]).toEqual({
        role: "assistant",
        content: expectedResponse,
      });

      mockCreate.mockRestore();
    });

    it("should maintain context in a multi-turn conversation", async () => {
      const sessionId = "session2";
      const userMessage1 = "What is the weather like?";
      const expectedResponse1 = "It's sunny today!";
      const userMessage2 = "What about tomorrow?";
      const expectedResponse2 = "Tomorrow will be cloudy.";

      // Mock the OpenAI API calls
      const mockCreate = jest.spyOn(client.openai.chat.completions, "create");
      mockCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: expectedResponse1 } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: expectedResponse2 } }],
        });

      // First message
      await client.sendMessage(sessionId, userMessage1);

      // Second message
      const response2 = await client.sendMessage(sessionId, userMessage2);
      expect(response2).toBe(expectedResponse2);

      expect(client.sessionContexts[sessionId]).toHaveLength(4); // user1, ai1, user2, ai2
      expect(client.sessionContexts[sessionId][0]).toEqual({
        role: "user",
        content: userMessage1,
      });
      expect(client.sessionContexts[sessionId][1]).toEqual({
        role: "assistant",
        content: expectedResponse1,
      });
      expect(client.sessionContexts[sessionId][2]).toEqual({
        role: "user",
        content: userMessage2,
      });
      expect(client.sessionContexts[sessionId][3]).toEqual({
        role: "assistant",
        content: expectedResponse2,
      });

      mockCreate.mockRestore();
    });

    it("should limit context to the last 10 messages", async () => {
      const sessionId = "session3";
      const maxMessages = 10; // MAX_CONTEXT_MESSAGES in DashScopeClient

      // Mock the OpenAI API calls
      const mockCreate = jest.spyOn(client.openai.chat.completions, "create");
      mockCreate.mockImplementation(() =>
        Promise.resolve({
          choices: [{ message: { content: "Response" } }],
        })
      );

      for (let i = 0; i < maxMessages + 5; i++) {
        const userMessage = `Message ${i + 1}`;
        await client.sendMessage(sessionId, userMessage);
      }
      expect(client.sessionContexts[sessionId]).toHaveLength(maxMessages);
      expect(client.sessionContexts[sessionId][0].content).toBe("Message 11");
      expect(
        client.sessionContexts[sessionId][
          client.sessionContexts[sessionId].length - 2
        ].content
      ).toBe("Message 15");

      mockCreate.mockRestore();
    });

    it("should attempt a retry on simulated API failure and succeed", async () => {
      const sessionId = "session4_retry_success";
      const userMessage = "Test retry success";
      const expectedResponseAfterRetry = "Retry success response";

      const mockCreate = jest.spyOn(client.openai.chat.completions, "create");
      mockCreate
        .mockRejectedValueOnce(
          new Error("Simulated API Error on first attempt")
        )
        .mockResolvedValueOnce({
          choices: [{ message: { content: expectedResponseAfterRetry } }],
        });

      const response = await client.sendMessage(sessionId, userMessage);
      expect(response).toBe(expectedResponseAfterRetry);
      expect(mockCreate).toHaveBeenCalledTimes(2);
      mockCreate.mockRestore();
    });

    it("should throw error after retries if API continues to fail", async () => {
      const sessionId = "session5_retry_fail";
      const userMessage = "Test persistent failure";
      const clientInstance = new DashScopeClient(mockApiKey);

      const mockCreate = jest.spyOn(
        clientInstance.openai.chat.completions,
        "create"
      );
      mockCreate.mockRejectedValue(new Error("Simulated persistent API error"));

      await expect(
        clientInstance.sendMessage(sessionId, userMessage)
      ).rejects.toThrow(
        "Failed to get response from DashScope after multiple retries:"
      );
      expect(mockCreate).toHaveBeenCalledTimes(2);
      mockCreate.mockRestore();
    });
  });

  describe("getKnowledgeBaseById", () => {
    const kbConfigs = [
      { id: "kb1", name: "General FAQ", priority: 1 },
      { id: "kb2", name: "Product Specs", priority: 2 },
    ];
    const clientWithConfigs = new DashScopeClient(mockApiKey, kbConfigs);

    it("should return the correct config for an existing ID", () => {
      expect(clientWithConfigs.getKnowledgeBaseById("kb1")).toBe(kbConfigs[0]);
      expect(clientWithConfigs.getKnowledgeBaseById("kb2")).toBe(kbConfigs[1]);
    });

    it("should return undefined for a non-existing ID", () => {
      expect(clientWithConfigs.getKnowledgeBaseById("kb3")).toBeUndefined();
    });

    it("should return undefined if knowledgeId is null or undefined", () => {
      expect(clientWithConfigs.getKnowledgeBaseById(null)).toBeUndefined();
      expect(clientWithConfigs.getKnowledgeBaseById(undefined)).toBeUndefined();
    });

    it("should return undefined if knowledgeBaseConfigs is empty", () => {
      const emptyClient = new DashScopeClient(mockApiKey);
      expect(emptyClient.getKnowledgeBaseById("kb1")).toBeUndefined();
    });
  });

  describe("callKnowledge", () => {
    let client; // Will be initialized in tests that need specific configs
    const kbConfigs = [
      { id: "kb1", name: "General FAQ", priority: 1 },
      { id: "kb2", name: "Product Specs", priority: 2 },
    ];

    it("should successfully call the knowledge base if knowledgeId is in config", async () => {
      client = new DashScopeClient(mockApiKey, kbConfigs);
      const query = "What are the specs for product X?";
      const knowledgeId = "kb2"; // Exists in kbConfigs

      const response = await client.callKnowledge(query, knowledgeId);

      expect(response.success).toBe(true);
      expect(response.data).toBe(`Knowledge base response for query: ${query}`);
      expect(response.query).toBe(query);
      expect(response.knowledgeId).toBe(knowledgeId);
      expect(response.timestamp).toBeDefined();
    });

    it("should return error if knowledgeId is not in config", async () => {
      client = new DashScopeClient(mockApiKey, kbConfigs);
      const query = "Some query";
      const knowledgeId = "kb_non_existent";
      const expectedResponse = {
        success: false,
        error: `Invalid knowledgeId: "${knowledgeId}" not found in configuration.`,
      };
      const response = await client.callKnowledge(query, knowledgeId);
      expect(response).toEqual(expectedResponse);
    });

    it("should still throw error if knowledgeId is null/undefined (initial check)", async () => {
      client = new DashScopeClient(mockApiKey, kbConfigs);
      const query = "Test query";
      await expect(client.callKnowledge(query, null)).rejects.toThrow(
        "knowledgeId is required for callKnowledge."
      );
      await expect(client.callKnowledge(query, undefined)).rejects.toThrow(
        "knowledgeId is required for callKnowledge."
      );
      await expect(client.callKnowledge(query, "")).rejects.toThrow(
        "knowledgeId is required for callKnowledge."
      ); // Corrected expectation
    });

    it("should handle simulated API errors gracefully if knowledgeId is valid", async () => {
      client = new DashScopeClient(mockApiKey, kbConfigs);
      const query = "Query that causes error";
      const knowledgeId = "kb1"; // Valid ID
      const errorMessage = "Simulated KB API Error from _executeKnowledgeCall";
      const executeKbCallSpy = jest
        .spyOn(client, "_executeKnowledgeCall")
        .mockRejectedValue(new Error(errorMessage));
      await expect(client.callKnowledge(query, knowledgeId)).rejects.toThrow(
        `Failed to get response from Knowledge Base: ${errorMessage}`
      );
      expect(executeKbCallSpy).toHaveBeenCalled();
      executeKbCallSpy.mockRestore();
    });
  });

  describe("queryKnowledgeWithPriority", () => {
    const kbConfigs = [
      { id: "kb1", name: "General FAQ", priority: 2 },
      { id: "kb2", name: "Product Specs", priority: 1 },
      { id: "kb3", name: "Support", priority: 3 },
    ];
    let client;

    beforeEach(() => {
      client = new DashScopeClient(mockApiKey, kbConfigs);
    });

    it("should return first successful result with first_success strategy", async () => {
      const query = "Test query";
      const mockCallKnowledge = jest.spyOn(client, "callKnowledge");

      // kb2 (priority 1) fails, kb1 (priority 2) succeeds
      mockCallKnowledge
        .mockResolvedValueOnce({ success: false, error: "No data found" })
        .mockResolvedValueOnce({ success: true, data: "Answer from kb1" });

      const result = await client.queryKnowledgeWithPriority(
        query,
        ["kb2", "kb1"],
        "first_success"
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe("Answer from kb1");
      expect(mockCallKnowledge).toHaveBeenCalledTimes(2);
      mockCallKnowledge.mockRestore();
    });

    it("should return all results with all_results strategy", async () => {
      const query = "Test query";
      const mockCallKnowledge = jest.spyOn(client, "callKnowledge");

      mockCallKnowledge
        .mockResolvedValueOnce({ success: true, data: "Answer from kb1" })
        .mockResolvedValueOnce({ success: false, error: "No data found" });

      const result = await client.queryKnowledgeWithPriority(
        query,
        ["kb1", "kb2"],
        "all_results"
      );

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);

      // Results are sorted by priority in the response
      const sortedResults = result.results.sort(
        (a, b) => a.priority - b.priority
      );
      expect(sortedResults[0].priority).toBe(1); // kb2 (priority 1)
      expect(sortedResults[1].priority).toBe(2); // kb1 (priority 2)
      mockCallKnowledge.mockRestore();
    });

    it("should use all knowledge bases sorted by priority when no IDs specified", async () => {
      const query = "Test query";
      const mockCallKnowledge = jest.spyOn(client, "callKnowledge");

      mockCallKnowledge.mockResolvedValue({ success: true, data: "Answer" });

      await client.queryKnowledgeWithPriority(query);

      // Should call in priority order: kb2(1), kb1(2), kb3(3)
      expect(mockCallKnowledge).toHaveBeenNthCalledWith(1, query, "kb2");
      expect(mockCallKnowledge).toHaveBeenCalledTimes(1); // Stops at first success
      mockCallKnowledge.mockRestore();
    });

    it("should return error when no knowledge bases succeed with first_success", async () => {
      const query = "Test query";
      const mockCallKnowledge = jest.spyOn(client, "callKnowledge");

      mockCallKnowledge.mockResolvedValue({
        success: false,
        error: "No data found",
      });

      const result = await client.queryKnowledgeWithPriority(
        query,
        ["kb1", "kb2"],
        "first_success"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No knowledge base returned successful results"
      );
      expect(result.attempts).toBe(2);
      mockCallKnowledge.mockRestore();
    });
  });
});
