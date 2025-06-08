const axios = require('axios');
const { manageContext } = require('../utils/context'); // Import manageContext

const MAX_CONTEXT_MESSAGES = 10; // This can be used as default for manageContext if not overridden
const RETRY_DELAY_MS = 1000;

class DashScopeClient {
  constructor(apiKey, apiSecret, knowledgeBaseConfigs) { // Added knowledgeBaseConfigs parameter
    if (!apiKey || !apiSecret) {
      throw new Error('API key and secret are required.');
    }
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.sessionContexts = {};
    this.knowledgeBaseConfigs = knowledgeBaseConfigs || [];
  }

  async sendMessage(sessionId, text, retries = 1) {
    if (!this.sessionContexts[sessionId]) {
      this.sessionContexts[sessionId] = [];
    }
    const context = this.sessionContexts[sessionId];

    context.push({ role: 'user', content: text });

    // Simulate API request payload (actual API would require more specific formatting)
    const requestPayload = {
      model: 'qwen-turbo', // Example model
      input: {
        messages: context,
      },
      parameters: {
        // Parameters if any, e.g. result_format: 'message'
      },
    };

    try {
      const aiResponseContent = await this._simulateApiCall(requestPayload, sessionId, text);

      // Update context using manageContext
      // The user message was already pushed to 'context' before the API call simulation.
      // So, current 'context' has the user message. We add the AI response.
      // Or, more cleanly, let manageContext handle adding user and AI message from a base context.

      // Let's get the base context (before current user message)
      // This is a bit tricky because 'context' variable is a reference that's already mutated.
      // For simplicity, we'll assume the 'context' before this call was sessionContexts[sessionId]
      // and it didn't yet have the *current* user message.
      // The current 'context' variable includes the new user message.
      // The current _simulateApiCall returns a string, not an object.
      const aiMessageObject = { role: 'assistant', content: aiResponseContent };

      // The 'context' variable already had the user message pushed.
      // So we pass the existing context (which includes the latest user message)
      // and only the new AI response. manageContext will append AI response and then trim.
      // This means manageContext needs to be flexible or called differently.
      // Let's adjust how we use manageContext:
      // We have `this.sessionContexts[sessionId]` which is the context *before* the current user message.
      // No, `context` is `this.sessionContexts[sessionId]` which is mutated by `context.push({ role: 'user', content: text });`
      // So `context` already has the user message.

      // The `manageContext` function expects currentContext, newUserMessage, aiResponse.
      // newUserMessage was already added to `context`.
      // So, we could do:
      // this.sessionContexts[sessionId] = manageContext(this.sessionContexts[sessionId], null, aiMessageObject, MAX_CONTEXT_MESSAGES);
      // This is correct. `this.sessionContexts[sessionId]` at this point has the new user message.

      this.sessionContexts[sessionId] = manageContext(
        this.sessionContexts[sessionId], // This context already has the user message
        null, // User message already added
        aiMessageObject,
        MAX_CONTEXT_MESSAGES
      );

      return aiResponseContent;

    } catch (error) {
      // console.error('Error during simulated API call:', error.message); // Keep this for debugging if necessary
      if (retries > 0) {
        // console.log(`Retrying in ${RETRY_DELAY_MS}ms... (${retries} retries left)`); // Keep for debugging
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return this.sendMessage(sessionId, text, retries - 1); // Pass original text, not the potentially modified context
      } else {
        // Re-throw the original error or a custom one after retries are exhausted.
        // For testing, it's often better to know the original error.
        // However, the requirement was to throw a specific error message.
        throw new Error('Failed to get response from DashScope after multiple retries.');
      }
    }
  }

  async _simulateApiCall(requestPayload, sessionId, text) {
    // In a real scenario, this method would make the actual HTTP POST request using axios
    // For example:
    // const response = await axios.post('DUMMY_DASHSCOPE_API_ENDPOINT', requestPayload, {
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`, // Or appropriate auth header
    //     'Content-Type': 'application/json',
    //   },
    // });
    // return response.data.output.choices[0].message.content;

    // Simulate receiving a response
    return Promise.resolve(`AI response to: "${text}" (session: ${sessionId})`);
  }

  async callKnowledge(query, knowledgeId) {
    if (!knowledgeId) {
      // This initial check can remain, or be removed if we prefer the config check to be the sole guard.
      // For robustness, keeping it is fine.
      throw new Error('knowledgeId is required for callKnowledge.');
    }

    const kbConfig = this.getKnowledgeBaseById(knowledgeId);
    if (!kbConfig) {
      // console.error(`Error: Knowledge base with id "${knowledgeId}" not configured.`);
      return { success: false, error: `Invalid knowledgeId: "${knowledgeId}" not found in configuration.` };
    }

    // Simulate API call to a knowledge base endpoint, using kbConfig.name or other properties if needed
    // console.log(`Simulating API call to Knowledge Base "${kbConfig.name}" (id: ${knowledgeId}) with query: "${query}"`);

    // Simulate API request payload
    const requestPayload = {
      model: 'qwen-turbo', // Or a specific knowledge model
      query: query,
      knowledge_id: knowledgeId,
      // Other parameters like version, etc.
    };
    // console.log('Simulated Knowledge Base request payload:', JSON.stringify(requestPayload, null, 2));

    try {
      return await this._executeKnowledgeCall(requestPayload, query);
    } catch (error) {
      // console.error('Error during simulated Knowledge Base API call:', error.message);
      // In a real scenario, add retry logic here if applicable, similar to sendMessage
      throw new Error(`Failed to get response from Knowledge Base: ${error.message}`);
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
    const simulatedResponse = { success: true, data: `Knowledge base response for query: ${query}` };
    return Promise.resolve(simulatedResponse);
  }

  getKnowledgeBaseById(knowledgeId) {
    if (!knowledgeId || !this.knowledgeBaseConfigs) {
      return undefined;
    }
    return this.knowledgeBaseConfigs.find(kb => kb.id === knowledgeId);
  }
}

module.exports = DashScopeClient;
