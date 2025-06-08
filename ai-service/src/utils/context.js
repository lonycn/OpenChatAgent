/**
 * Manages the conversation context by appending new messages and ensuring the context
 * does not exceed the maximum number of messages.
 *
 * @param {Array<Object>} currentContext - The current array of message objects.
 *                                         Each object should have a 'role' and 'content'.
 * @param {Object} newUserMessage - The new user message object (e.g., { role: 'user', content: '...' }).
 * @param {Object} aiResponse - The new AI response object (e.g., { role: 'assistant', content: '...' }).
 * @param {number} [maxMessages=10] - The maximum number of messages to keep in the context.
 * @returns {Array<Object>} The updated context array.
 */
function manageContext(currentContext, newUserMessage, aiResponse, maxMessages = 10) {
  if (maxMessages <= 0) {
    return []; // Or throw an error, depending on desired behavior for invalid maxMessages
  }

  const updatedContext = [...(currentContext || [])];

  if (newUserMessage) {
    updatedContext.push(newUserMessage);
  }
  if (aiResponse) {
    updatedContext.push(aiResponse);
  }

  if (updatedContext.length > maxMessages) {
    return updatedContext.slice(updatedContext.length - maxMessages);
  }

  return updatedContext;
}

module.exports = {
  manageContext,
};
