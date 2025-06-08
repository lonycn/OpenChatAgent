const OpenAI = require("openai");
const { manageContext } = require("../utils/context");
const { formatKnowledgeResponse } = require("../utils/formatter");

const MAX_CONTEXT_MESSAGES = 10;
const RETRY_DELAY_MS = 1000;
const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

class DashScopeClient {
  constructor(apiKey, knowledgeBaseConfigs = [], options = {}) {
    if (!apiKey) {
      throw new Error("API key is required.");
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: DASHSCOPE_BASE_URL,
    });

    this.sessionContexts = {};
    this.knowledgeBaseConfigs = knowledgeBaseConfigs || [];
    this.defaultModel = options.model || "qwen-plus";
  }

  async sendMessage(sessionId, text, retries = 1) {
    if (!this.sessionContexts[sessionId]) {
      this.sessionContexts[sessionId] = [];
    }
    const context = [...this.sessionContexts[sessionId]];

    // Add user message to context
    context.push({ role: "user", content: text });

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: context,
      });

      const aiResponseContent = completion.choices[0].message.content;
      const aiMessageObject = { role: "assistant", content: aiResponseContent };

      // Update context using manageContext
      this.sessionContexts[sessionId] = manageContext(
        this.sessionContexts[sessionId],
        { role: "user", content: text },
        aiMessageObject,
        MAX_CONTEXT_MESSAGES
      );

      return aiResponseContent;
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.sendMessage(sessionId, text, retries - 1);
      } else {
        throw new Error(
          `Failed to get response from DashScope after multiple retries: ${error.message}`
        );
      }
    }
  }

  async callKnowledge(query, knowledgeId) {
    if (!knowledgeId) {
      // This initial check can remain, or be removed if we prefer the config check to be the sole guard.
      // For robustness, keeping it is fine.
      throw new Error("knowledgeId is required for callKnowledge.");
    }

    const kbConfig = this.getKnowledgeBaseById(knowledgeId);
    if (!kbConfig) {
      // console.error(`Error: Knowledge base with id "${knowledgeId}" not configured.`);
      return {
        success: false,
        error: `Invalid knowledgeId: "${knowledgeId}" not found in configuration.`,
      };
    }

    // Simulate API call to a knowledge base endpoint, using kbConfig.name or other properties if needed
    // console.log(`Simulating API call to Knowledge Base "${kbConfig.name}" (id: ${knowledgeId}) with query: "${query}"`);

    // For knowledge base, we might need different API endpoints
    // This is kept as simulation for now until we have specific knowledge base API details
    const requestPayload = {
      model: this.defaultModel,
      query: query,
      knowledge_id: knowledgeId,
    };

    try {
      const rawResponse = await this._executeKnowledgeCall(
        requestPayload,
        query
      );
      return formatKnowledgeResponse(rawResponse, query, knowledgeId);
    } catch (error) {
      // console.error('Error during simulated Knowledge Base API call:', error.message);
      // In a real scenario, add retry logic here if applicable, similar to sendMessage
      throw new Error(
        `Failed to get response from Knowledge Base: ${error.message}`
      );
    }
  }

  async _executeKnowledgeCall(requestPayload, query) {
    // In a real scenario, this method would make the actual HTTP POST request
    // For example:
    // const response = await axios.post('DUMMY_KNOWLEDGE_API_ENDPOINT', requestPayload, {
    //   headers: { 'Authorization': `Bearer ${this.apiKey}` }
    // });
    // return response.data;

    // Simulate receiving a response
    const simulatedResponse = {
      success: true,
      data: `Knowledge base response for query: ${query}`,
    };
    return Promise.resolve(simulatedResponse);
  }

  getKnowledgeBaseById(knowledgeId) {
    if (!knowledgeId || !this.knowledgeBaseConfigs) {
      return undefined;
    }
    return this.knowledgeBaseConfigs.find((kb) => kb.id === knowledgeId);
  }

  /**
   * Query multiple knowledge bases with priority strategy
   * @param {string} query - The query text
   * @param {Array<string>} knowledgeIds - Array of knowledge base IDs to query
   * @param {string} strategy - Priority strategy: 'first_success' or 'all_results'
   * @returns {Promise<Object>} Formatted response based on strategy
   */
  async queryKnowledgeWithPriority(
    query,
    knowledgeIds = null,
    strategy = "first_success"
  ) {
    if (!knowledgeIds || knowledgeIds.length === 0) {
      // Use all configured knowledge bases sorted by priority
      knowledgeIds = this.knowledgeBaseConfigs
        .sort((a, b) => (a.priority || 0) - (b.priority || 0))
        .map((kb) => kb.id);
    }

    const results = [];

    for (const knowledgeId of knowledgeIds) {
      try {
        const result = await this.callKnowledge(query, knowledgeId);

        if (strategy === "first_success" && result.success) {
          return result;
        }

        results.push({
          knowledgeId,
          result,
          priority: this.getKnowledgeBaseById(knowledgeId)?.priority || 999,
        });
      } catch (error) {
        results.push({
          knowledgeId,
          result: { success: false, error: error.message },
          priority: this.getKnowledgeBaseById(knowledgeId)?.priority || 999,
        });
      }
    }

    if (strategy === "all_results") {
      return {
        success: true,
        query,
        strategy,
        results: results.sort((a, b) => a.priority - b.priority),
        timestamp: new Date().toISOString(),
      };
    }

    // first_success strategy but no success found
    return {
      success: false,
      error: "No knowledge base returned successful results",
      query,
      strategy,
      attempts: results.length,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = DashScopeClient;
