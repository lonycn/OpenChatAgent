/**
 * Formats a request for DashScope (Placeholder).
 * In a real scenario, this would construct the complex payload DashScope expects.
 *
 * @param {string} sessionId - The session ID.
 * @param {Array<Object>} contextMessages - The array of context messages.
 * @param {string} prompt - The current user prompt/text. (Note: DashScope usually takes this within messages)
 * @returns {Object} The formatted request payload.
 */
function formatDashScopeRequest(sessionId, contextMessages, prompt) {
  // This is a simplified placeholder.
  // DashScope's actual API for chat often involves sending the entire message history.
  // The DashScopeClient's sendMessage method already constructs a more representative payload.
  return {
    model: "qwen-turbo", // Example model
    input: {
      messages: [
        ...(contextMessages || []),
        { role: "user", content: prompt }, // Assuming prompt is the latest user message
      ],
    },
    parameters: {
      // result_format: 'message' // or 'text'
    },
    // knowledge_id: if applicable
  };
}

/**
 * Formats/standardizes the AI response from DashScope (Placeholder).
 *
 * @param {Object} apiResponse - The raw response object from the DashScope API (simulated).
 * @returns {Object|string} Standardized AI response. For now, returns the content directly.
 */
function formatDashScopeResponse(apiResponse) {
  // Assuming apiResponse is the simulated structure like:
  // `AI response to: "${text}" (session: ${sessionId})` (string)
  // or in a more complex case:
  // { output: { choices: [{ message: { content: "..." } }] } }
  if (typeof apiResponse === "string") {
    return apiResponse; // Our current simulation in DashScopeClient returns a string
  }
  if (
    apiResponse &&
    apiResponse.output &&
    apiResponse.output.choices &&
    apiResponse.output.choices[0]
  ) {
    return apiResponse.output.choices[0].message.content;
  }
  // Fallback for unexpected structures or if the simulation changes
  return apiResponse;
}

/**
 * Formats knowledge base query results into a standardized format.
 *
 * @param {Object} knowledgeResponse - The raw response from knowledge base API.
 * @param {string} query - The original query.
 * @param {string} knowledgeId - The knowledge base ID.
 * @returns {Object} Formatted knowledge base response.
 */
function formatKnowledgeResponse(knowledgeResponse, query, knowledgeId) {
  if (!knowledgeResponse) {
    return {
      success: false,
      error: "Empty response from knowledge base",
      query,
      knowledgeId,
    };
  }

  if (knowledgeResponse.success === false) {
    return knowledgeResponse; // Already formatted error response
  }

  return {
    success: true,
    data: knowledgeResponse.data || knowledgeResponse,
    query,
    knowledgeId,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  formatDashScopeRequest,
  formatDashScopeResponse,
  formatKnowledgeResponse,
};
