// run.js
const WebSocket = require('ws');
const { ensureDbExists } = require('./utils/db');
const WebSocketHandler = require('./websocket_handler');
const { runAgent } = require('./app');

async function main() {
  try {
    // Initialize database first
    console.log('Initializing database...');
    await ensureDbExists();
    console.log('Database initialized successfully');

    // Start WebSocket server
    const wss = new WebSocket.Server({ port: 3001 });
    console.log('WebSocket server is running on port 3001');

    const wsHandler = new WebSocketHandler((searchText, clientId, userId) => {
      const renderCallback = {
        renderPlanSteps: (title, steps) => {
          wsHandler.renderPlanSteps(clientId, title, steps);
        },
        renderCurrentStepTitle: (header, value) => {
          wsHandler.renderCurrentStepTitle(clientId, header, value);
        },
        renderStepResult: (step, resultTitle) => {
          wsHandler.renderStepResult(clientId, step, resultTitle);
        },
        renderLog: (log) => {
          wsHandler.renderLog(clientId, log);
        },
      };

      runAgent(searchText, renderCallback, userId).catch(error => {
        console.error('Error in runAgent:', error);
        wsHandler.renderLog(clientId, "❌ An error occurred while processing your request.");
      });
    });

    wss.on('connection', (ws) => {
      wsHandler.handleConnection(ws);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle errors and cleanup
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();



