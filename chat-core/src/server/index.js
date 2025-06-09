const app = require('./app');
const path = require('path');
const { initializeWebSocket } = require('./websocket'); // Import WebSocket initializer

// Load environment variables from .env in the root of chat-core
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Chat-core HTTP server running on port ${PORT}`);
});

// Initialize WebSocket server and attach it to the HTTP server
const wss = initializeWebSocket(server);

// Handle graceful shutdown (optional, but good practice)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    if (wss) {
      wss.close(() => { // Close WebSocket server
        console.log('WebSocket server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    if (wss) {
      wss.close(() => { // Close WebSocket server
        console.log('WebSocket server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = server; // Export server for potential programmatic use or testing
