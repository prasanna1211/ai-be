// app.js

const { runWorkflow } = require("./workflow");
const State = require("./state");

async function runAgent(input, renderCallback) {
  const state = new State(input);

  try {
    // Pass the renderCallback through the workflow pipeline
    const response = await runWorkflow(state, renderCallback);
    return response;
  } catch (error) {
    console.error("Error in runAgent:", error);
    throw error;
  }
}

module.exports = { runAgent };
