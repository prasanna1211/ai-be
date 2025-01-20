// app.js

const { runWorkflow } = require("./workflow");
const State = require("./state");
const { resetAllUserCounts } = require("./utils/db");

// Initialize the app and reset all counts
async function initialize() {
  try {
    const resetCount = await resetAllUserCounts();
    console.log(`Initialized app: Reset ${resetCount} user counts to zero`);
  } catch (error) {
    console.error('Failed to reset user counts during initialization:', error);
    // Continue app execution even if reset fails
  }
}

// Call initialize when the module is loaded
initialize();

async function runAgent(input, renderCallback, userId) {
  const state = new State(input);

  try {
    // Pass userId to runWorkflow
    const response = await runWorkflow(state, renderCallback, userId);
    return response;
  } catch (error) {
    console.error("Error in runAgent:", error);
    throw error;
  }
}

module.exports = { runAgent };
