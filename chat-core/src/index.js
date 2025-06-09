const app = require('./server/app');
const connectionManager = require('./services/ConnectionManager');
const messageRouter = require('./services/MessageRouter');

module.exports = {
  app,
  connectionManager,
  messageRouter,
};
