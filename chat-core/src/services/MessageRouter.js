const { v4: uuidv4 } = require("uuid");
const connectionManager = require("./EnhancedConnectionManager");
const axios = require("axios");

// 通过HTTP API调用其他服务，而不是直接导入模块
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:3002";
const SESSION_SERVICE_URL =
  process.env.SESSION_SERVICE_URL || "http://localhost:3003";

class MessageRouter {
  constructor() {
    // 通过HTTP API调用AI服务
    this.aiService = {
      sendMessage: async (sessionId, text) => {
        try {
          const response = await axios.post(`${AI_SERVICE_URL}/api/chat`, {
            sessionId,
            message: text,
          });
          return response.data.response;
        } catch (error) {
          console.error("Error calling AI service:", error.message);
          return "Sorry, I encountered an error trying to reach the AI service.";
        }
      },
      sendMessageStream: async (sessionId, text, onChunk) => {
        try {
          const response = await axios.post(
            `${AI_SERVICE_URL}/api/chat/stream`,
            {
              sessionId,
              message: text,
            },
            {
              responseType: "stream",
            }
          );

          let buffer = "";

          response.data.on("data", (chunk) => {
            buffer += chunk.toString();

            // 处理SSE数据
            const lines = buffer.split("\n");
            buffer = lines.pop(); // 保留不完整的行

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (onChunk) {
                    onChunk(data);
                  }
                } catch (parseError) {
                  console.error("Error parsing SSE data:", parseError);
                }
              }
            }
          });

          return new Promise((resolve, reject) => {
            response.data.on("end", () => {
              resolve("Stream completed");
            });

            response.data.on("error", (error) => {
              console.error("Stream error:", error);
              reject(error);
            });
          });
        } catch (error) {
          console.error("Error calling streaming AI service:", error.message);
          throw error;
        }
      },
    };

    // 通过HTTP API调用会话服务
    this.sessionManager = {
      createSession: async (userId, metadata = {}) => {
        try {
          const response = await axios.post(
            `${SESSION_SERVICE_URL}/api/sessions`,
            {
              userId,
              metadata,
            }
          );
          return response.data.sessionId;
        } catch (error) {
          console.error("Error creating session:", error.message);
          throw error;
        }
      },
      addMessage: async (sessionId, message) => {
        try {
          await axios.post(
            `${SESSION_SERVICE_URL}/api/sessions/${sessionId}/messages`,
            message
          );
        } catch (error) {
          console.error("Error adding message to session:", error.message);
        }
      },
      getSessionAgent: async (sessionId) => {
        try {
          const response = await axios.get(
            `${SESSION_SERVICE_URL}/api/sessions/${sessionId}/agent`
          );
          return response.data.agent;
        } catch (error) {
          console.error("Error getting session agent:", error.message);
          return "ai"; // 默认返回ai
        }
      },
    };

    console.log("MessageRouter initialized with HTTP API calls.");
  }

  async handleIncomingMessage(
    connectionId,
    userId,
    sessionId,
    incomingMessage
  ) {
    // Updated signature
    const clientWs = connectionManager.getConnection(connectionId);
    if (!clientWs) {
      console.error(
        `MessageRouter: No active WebSocket connection found for ID ${connectionId}. Cannot proceed.`
      );
      return; // Cannot send error message if ws is gone
    }

    // userId and sessionId are now expected to be reliably provided by websocket.js after init
    if (!userId || !sessionId || !incomingMessage || !incomingMessage.text) {
      console.error(
        "MessageRouter: connectionId, userId, sessionId, and incomingMessage with text are required."
      );
      const errorResponse = {
        id: uuidv4(),
        from: "system",
        text: "Error: Invalid message or missing user/session/connection information.",
        timestamp: new Date().toISOString(),
        type: "error",
      };
      connectionManager.sendMessageToConnection(connectionId, errorResponse);
      return;
    }

    console.log(
      `MessageRouter: Handling incoming message from userId: ${userId} on conn: ${connectionId} for session: ${sessionId}`
    );

    try {
      // SessionId is now passed in and assumed to be valid and associated with userId by websocket.js
      const actualSessionId = sessionId;

      // 1. Create user message object and add to session history
      const userMessage = {
        id: uuidv4(),
        from: "user",
        text: incomingMessage.text,
        timestamp: new Date().toISOString(),
        type: incomingMessage.type || "text",
        sessionId: actualSessionId, // Use provided sessionId
        userId,
      };
      console.log(
        `MessageRouter: Adding user message to session ${actualSessionId}:`,
        userMessage.id
      );
      await this.sessionManager.addMessage(actualSessionId, userMessage);

      // 2. Get current agent
      let currentAgent;
      try {
        currentAgent = await this.sessionManager.getSessionAgent(
          actualSessionId
        );
        console.log(
          `MessageRouter: Current agent for session ${actualSessionId} is ${currentAgent}`
        );
      } catch (agentError) {
        console.error(
          `MessageRouter: Error getting agent for session ${actualSessionId}:`,
          agentError
        );
        connectionManager.sendMessageToConnection(connectionId, {
          id: uuidv4(),
          from: "system",
          text: "Error determining current agent for your session.",
          timestamp: new Date().toISOString(),
          type: "error",
          sessionId: actualSessionId,
        });
        return; // Stop processing if we can't determine the agent
      }

      // Default to 'ai' if currentAgent is null or undefined (e.g., new session where agent key wasn't explicitly set yet)
      if (
        currentAgent === "ai" ||
        currentAgent === null ||
        currentAgent === undefined
      ) {
        console.log(
          `MessageRouter: Routing to AI for session: ${actualSessionId}, Text: "${userMessage.text}"`
        );
        console.log(`MessageRouter: AI Service available: ${!!this.aiService}`);
        console.log(
          `MessageRouter: AI Service sendMessage method: ${typeof this.aiService
            ?.sendMessage}`
        );

        // Check if AI service supports streaming
        if (
          this.aiService.sendMessageStream &&
          typeof this.aiService.sendMessageStream === "function"
        ) {
          console.log(
            `MessageRouter: Using streaming AI service for session ${actualSessionId}...`
          );

          const aiMessageId = uuidv4();
          let fullAiResponse = "";

          try {
            await this.aiService.sendMessageStream(
              actualSessionId,
              userMessage.text,
              (data) => {
                // Handle different data formats from SSE
                if (data.error) {
                  console.error(`MessageRouter: Stream error:`, data.error);
                  return;
                }

                const chunk = {
                  content: data.content || "",
                  fullContent: data.fullContent || "",
                  isComplete: data.isComplete || false,
                };

                fullAiResponse = chunk.fullContent;

                // Send streaming chunk to client
                const streamMessage = {
                  id: aiMessageId,
                  from: "ai",
                  text: chunk.content,
                  fullText: chunk.fullContent,
                  timestamp: new Date().toISOString(),
                  type: chunk.isComplete ? "response" : "stream",
                  sessionId: actualSessionId,
                  isComplete: chunk.isComplete,
                };

                console.log(
                  `MessageRouter: Sending stream chunk to connection ${connectionId}, isComplete: ${chunk.isComplete}`
                );
                connectionManager.sendMessageToConnection(
                  connectionId,
                  streamMessage
                );

                // If streaming is complete, save the full message to session
                if (chunk.isComplete && chunk.fullContent) {
                  const finalAiMessage = {
                    id: aiMessageId,
                    from: "ai",
                    text: chunk.fullContent,
                    timestamp: new Date().toISOString(),
                    type: "text",
                    sessionId: actualSessionId,
                  };

                  this.sessionManager
                    .addMessage(actualSessionId, finalAiMessage)
                    .then(() => {
                      console.log(
                        `MessageRouter: Final AI message saved to session ${actualSessionId}: ${aiMessageId}`
                      );
                    })
                    .catch((error) => {
                      console.error(
                        `MessageRouter: Error saving final AI message to session ${actualSessionId}:`,
                        error
                      );
                    });
                }
              }
            );

            console.log(
              `MessageRouter: Streaming AI response completed for session ${actualSessionId}`
            );
          } catch (aiError) {
            console.error(
              `MessageRouter: Error calling streaming AI service for session ${actualSessionId}:`,
              aiError
            );

            const errorMessage = {
              id: aiMessageId,
              from: "ai",
              text: "Sorry, I encountered an error trying to reach the AI service.",
              timestamp: new Date().toISOString(),
              type: "response",
              sessionId: actualSessionId,
              isComplete: true,
            };

            await this.sessionManager.addMessage(actualSessionId, errorMessage);
            connectionManager.sendMessageToConnection(
              connectionId,
              errorMessage
            );
          }
        } else {
          // Fallback to non-streaming mode
          let aiServiceResponseText;
          try {
            console.log(
              `MessageRouter: Calling non-streaming AI service for session ${actualSessionId}...`
            );
            aiServiceResponseText = await this.aiService.sendMessage(
              actualSessionId,
              userMessage.text
            );
            console.log(
              `MessageRouter: AI service response received for session ${actualSessionId}: "${aiServiceResponseText}"`
            );
          } catch (aiError) {
            console.error(
              `MessageRouter: Error calling AI service for session ${actualSessionId}:`,
              aiError
            );
            aiServiceResponseText =
              "Sorry, I encountered an error trying to reach the AI service.";
            // Send error to client, but still log this "AI attempt" as an AI message.
            // The client will see the AI's error message.
          }

          const aiMessage = {
            id: uuidv4(),
            from: "ai",
            text: aiServiceResponseText,
            timestamp: new Date().toISOString(),
            type: "response",
            sessionId: actualSessionId,
          };
          console.log(
            `MessageRouter: AI response processed for session ${actualSessionId}: ${aiMessage.id}`
          );

          await this.sessionManager.addMessage(actualSessionId, aiMessage);
          console.log(
            `MessageRouter: AI message added to session ${actualSessionId}: ${aiMessage.id}`
          );

          console.log(
            `MessageRouter: Sending AI message to connection ${connectionId}:`,
            JSON.stringify(aiMessage)
          );
          connectionManager.sendMessageToConnection(connectionId, aiMessage);
        }
        console.log(
          `MessageRouter: AI message sent to connection ${connectionId}`
        );
      } else if (currentAgent === "human") {
        console.log(
          `MessageRouter: Message for session ${actualSessionId} to be handled by human agent: ${userMessage.text}`
        );
        // Placeholder for notifying human agents (e.g., publish to a queue)

        const humanAckMessage = {
          id: uuidv4(),
          from: "system",
          text: "Your message has been received and a human agent will respond shortly.",
          timestamp: new Date().toISOString(),
          type: "system_ack", // Using a more specific type
          sessionId: actualSessionId,
        };
        connectionManager.sendMessageToConnection(
          connectionId,
          humanAckMessage
        );

        // Optionally, store this system acknowledgement message to history
        // await this.sessionManager.addMessage(actualSessionId, humanAckMessage);
        // console.log(`MessageRouter: Human ACK message added to session ${actualSessionId}: ${humanAckMessage.id}`);
      } else {
        // Should not happen if agent values are strictly 'ai' or 'human'
        console.error(
          `MessageRouter: Unknown agent type '${currentAgent}' for session ${actualSessionId}.`
        );
        connectionManager.sendMessageToConnection(connectionId, {
          id: uuidv4(),
          from: "system",
          text: "Error: Unknown agent type assigned to your session.",
          timestamp: new Date().toISOString(),
          type: "error",
          sessionId: actualSessionId,
        });
      }
    } catch (error) {
      console.error(
        `MessageRouter: General error handling message for userId ${userId}, connectionId ${connectionId}, sessionId ${sessionId}: ${error.message}`,
        error.stack
      );
      const errorResponse = {
        id: uuidv4(),
        from: "system",
        text: `Error processing your message: ${error.message}`,
        timestamp: new Date().toISOString(),
        type: "error",
      };
      connectionManager.sendMessageToConnection(connectionId, errorResponse);
    }
  }
}

// Export a singleton instance
const messageRouter = new MessageRouter();
module.exports = messageRouter;
