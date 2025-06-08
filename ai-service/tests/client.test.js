const DashScopeClient = require('../src/client/DashScopeClient');

// Mock axios for all tests in this file
// const axios = require('axios'); // We might need this if we were to mock axios calls, but client doesn't make them yet.
// jest.mock('axios'); // Temporarily removing to see if it affects promise resolution

describe('DashScopeClient', () => {
  const mockApiKey = 'test_api_key';
  const mockApiSecret = 'test_api_secret';

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    // axios.post.mockClear(); // No axios mock for now
    // Reset any previous mock implementation
    // axios.post.mockReset(); // No axios mock for now
  });

  // This is the consolidated constructor test block
  describe('constructor', () => {
    it('should initialize correctly with API key and secret, and default knowledgeBaseConfigs', () => {
      const client = new DashScopeClient(mockApiKey, mockApiSecret);
      expect(client.apiKey).toBe(mockApiKey);
      expect(client.apiSecret).toBe(mockApiSecret);
      expect(client.sessionContexts).toEqual({});
      expect(client.knowledgeBaseConfigs).toEqual([]); // Default empty array
    });

    it('should throw an error if API key is missing', () => {
      expect(() => new DashScopeClient(null, mockApiSecret)).toThrow('API key and secret are required.');
    });

    it('should throw an error if API secret is missing', () => {
      expect(() => new DashScopeClient(mockApiKey, null)).toThrow('API key and secret are required.');
    });

    it('should initialize with knowledgeBaseConfigs if provided', () => {
      const kbConfigs = [{ id: "kb1", name: "FAQ", priority: 1 }];
      const client = new DashScopeClient(mockApiKey, mockApiSecret, kbConfigs);
      expect(client.knowledgeBaseConfigs).toBe(kbConfigs);
    });
  });

  describe('sendMessage', () => {
    let client;

    beforeEach(() => {
      client = new DashScopeClient(mockApiKey, mockApiSecret);
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

    it('should handle a single-turn conversation', async () => {
      const sessionId = 'session1';
      const userMessage = 'Hello, AI!';
      const expectedResponse = `AI response to: "${userMessage}" (session: ${sessionId})`;

      const response = await client.sendMessage(sessionId, userMessage);
      expect(response).toBe(expectedResponse);
      expect(client.sessionContexts[sessionId]).toHaveLength(2); // User message + AI response
      expect(client.sessionContexts[sessionId][0]).toEqual({ role: 'user', content: userMessage });
      expect(client.sessionContexts[sessionId][1]).toEqual({ role: 'assistant', content: expectedResponse });
    });

    it('should maintain context in a multi-turn conversation', async () => {
      const sessionId = 'session2';
      const userMessage1 = 'What is the weather like?';
      const expectedResponse1 = `AI response to: "${userMessage1}" (session: ${sessionId})`;
      const userMessage2 = 'What about tomorrow?';
      const expectedResponse2 = `AI response to: "${userMessage2}" (session: ${sessionId})`;

      // First message
      await client.sendMessage(sessionId, userMessage1);

      // Second message
      const response2 = await client.sendMessage(sessionId, userMessage2);
      expect(response2).toBe(expectedResponse2);

      expect(client.sessionContexts[sessionId]).toHaveLength(4); // user1, ai1, user2, ai2
      expect(client.sessionContexts[sessionId][0]).toEqual({ role: 'user', content: userMessage1 });
      expect(client.sessionContexts[sessionId][1]).toEqual({ role: 'assistant', content: expectedResponse1 });
      expect(client.sessionContexts[sessionId][2]).toEqual({ role: 'user', content: userMessage2 });
      expect(client.sessionContexts[sessionId][3]).toEqual({ role: 'assistant', content: expectedResponse2 });
    });

    it('should limit context to the last 10 messages', async () => {
      const sessionId = 'session3';
      const maxMessages = 10; // MAX_CONTEXT_MESSAGES in DashScopeClient

      for (let i = 0; i < maxMessages + 5; i++) {
        const userMessage = `Message ${i + 1}`;
        await client.sendMessage(sessionId, userMessage);
      }
      expect(client.sessionContexts[sessionId]).toHaveLength(maxMessages);
      expect(client.sessionContexts[sessionId][0].content).toBe('Message 11');
      expect(client.sessionContexts[sessionId][client.sessionContexts[sessionId].length - 2].content).toBe('Message 15');
    });

    it('should attempt a retry on simulated API failure and succeed', async () => {
      const sessionId = 'session4_retry_success';
      const userMessage = 'Test retry success';
      const expectedResponseAfterRetry = `AI response to: "${userMessage}" (session: ${sessionId})`;
      const simulateApiCallSpy = jest.spyOn(client, '_simulateApiCall');
      simulateApiCallSpy
        .mockRejectedValueOnce(new Error('Simulated API Error on first attempt'))
        .mockResolvedValueOnce(expectedResponseAfterRetry);
      const response = await client.sendMessage(sessionId, userMessage);
      expect(response).toBe(expectedResponseAfterRetry);
      expect(simulateApiCallSpy).toHaveBeenCalledTimes(2);
      simulateApiCallSpy.mockRestore();
    });

    it('should throw error after retries if API continues to fail', async () => {
      const sessionId = 'session5_retry_fail';
      const userMessage = 'Test persistent failure';
      const clientInstance = new DashScopeClient(mockApiKey, mockApiSecret);
      const simulateApiCallSpy = jest.spyOn(clientInstance, '_simulateApiCall');
      simulateApiCallSpy.mockRejectedValue(new Error('Simulated persistent API error'));
      await expect(clientInstance.sendMessage(sessionId, userMessage))
        .rejects.toThrow('Failed to get response from DashScope after multiple retries.');
      expect(simulateApiCallSpy).toHaveBeenCalledTimes(2);
      simulateApiCallSpy.mockRestore();
    });
  });

  describe('getKnowledgeBaseById', () => {
    const kbConfigs = [
      { id: "kb1", name: "General FAQ", priority: 1 },
      { id: "kb2", name: "Product Specs", priority: 2 }
    ];
    const clientWithConfigs = new DashScopeClient(mockApiKey, mockApiSecret, kbConfigs);

    it('should return the correct config for an existing ID', () => {
      expect(clientWithConfigs.getKnowledgeBaseById("kb1")).toBe(kbConfigs[0]);
      expect(clientWithConfigs.getKnowledgeBaseById("kb2")).toBe(kbConfigs[1]);
    });

    it('should return undefined for a non-existing ID', () => {
      expect(clientWithConfigs.getKnowledgeBaseById("kb3")).toBeUndefined();
    });

    it('should return undefined if knowledgeId is null or undefined', () => {
      expect(clientWithConfigs.getKnowledgeBaseById(null)).toBeUndefined();
      expect(clientWithConfigs.getKnowledgeBaseById(undefined)).toBeUndefined();
    });

    it('should return undefined if knowledgeBaseConfigs is empty', () => {
      const emptyClient = new DashScopeClient(mockApiKey, mockApiSecret);
      expect(emptyClient.getKnowledgeBaseById("kb1")).toBeUndefined();
    });
  });

  describe('callKnowledge', () => {
    let client; // Will be initialized in tests that need specific configs
    const kbConfigs = [
      { id: "kb1", name: "General FAQ", priority: 1 },
      { id: "kb2", name: "Product Specs", priority: 2 }
    ];

    it('should successfully call the knowledge base if knowledgeId is in config', async () => {
      client = new DashScopeClient(mockApiKey, mockApiSecret, kbConfigs);
      const query = "What are the specs for product X?";
      const knowledgeId = "kb2"; // Exists in kbConfigs
      const expectedData = { success: true, data: `Knowledge base response for query: ${query}` };
      const response = await client.callKnowledge(query, knowledgeId);
      expect(response).toEqual(expectedData);
    });

    it('should return error if knowledgeId is not in config', async () => {
      client = new DashScopeClient(mockApiKey, mockApiSecret, kbConfigs);
      const query = "Some query";
      const knowledgeId = "kb_non_existent";
      const expectedResponse = {
        success: false,
        error: `Invalid knowledgeId: "${knowledgeId}" not found in configuration.`
      };
      const response = await client.callKnowledge(query, knowledgeId);
      expect(response).toEqual(expectedResponse);
    });

    it('should still throw error if knowledgeId is null/undefined (initial check)', async () => {
      client = new DashScopeClient(mockApiKey, mockApiSecret, kbConfigs);
      const query = "Test query";
      await expect(client.callKnowledge(query, null))
        .rejects.toThrow('knowledgeId is required for callKnowledge.');
      await expect(client.callKnowledge(query, undefined))
        .rejects.toThrow('knowledgeId is required for callKnowledge.');
      await expect(client.callKnowledge(query, ''))
        .rejects.toThrow('knowledgeId is required for callKnowledge.'); // Corrected expectation
    });

    it('should handle simulated API errors gracefully if knowledgeId is valid', async () => {
      client = new DashScopeClient(mockApiKey, mockApiSecret, kbConfigs);
      const query = "Query that causes error";
      const knowledgeId = "kb1"; // Valid ID
      const errorMessage = "Simulated KB API Error from _executeKnowledgeCall";
      const executeKbCallSpy = jest.spyOn(client, '_executeKnowledgeCall')
                                   .mockRejectedValue(new Error(errorMessage));
      await expect(client.callKnowledge(query, knowledgeId))
        .rejects.toThrow(`Failed to get response from Knowledge Base: ${errorMessage}`);
      expect(executeKbCallSpy).toHaveBeenCalled();
      executeKbCallSpy.mockRestore();
    });
  });
});
