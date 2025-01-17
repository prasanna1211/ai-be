// app.js

const { runWorkflow } = require("./workflow");
const State = require("./state");

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
