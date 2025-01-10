// run.js
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const WebSocketHandler = require('./websocket_handler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const port = process.env.PORT || 3001;
const { runAgent } = require("./app");

// Search handler function
async function handleSearch(searchText, clientId, wsHandler) {
  console.log(`Processing search request: "${searchText}" from client: ${clientId}`);

  // Create the renderCallback object
  const renderCallback = {
    renderPlanSteps: (title, steps) => {
      wsHandler.renderPlanSteps(clientId, title, steps);
    },
    renderCurrentStepTitle: (header, value) => {
      wsHandler.renderCurrentStepTitle(clientId, header, value);
    },
    renderStepResult: (step, result) => {
      wsHandler.renderStepResult(clientId, step, result);
    },
    renderLog: (log) => {
      wsHandler.renderLog(clientId, log);
    }
  };

  try {
    const response = await runAgent(searchText, renderCallback);
    wsHandler.renderLog(clientId, `Final Answer: ${response}`);
  } catch (error) {
    console.error("Error:", error);
    wsHandler.renderLog(clientId, `Error: ${error.message}`);
  }
}

// Create WebSocket handler instance with search callback
const wsHandler = new WebSocketHandler((searchText, clientId) => {
  handleSearch(searchText, clientId, wsHandler);
});

// Middleware for parsing JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Express API!' });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws);
});

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`WebSocket server is ready`);
});



