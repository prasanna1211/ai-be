// workflow.js

const { planStep, replanStep } = require("./planner");
const { executeStep } = require("./executor");
const { Langfuse } = require("langfuse");

let langfuse;

function createContext() {
  langfuse = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL,
  });

  return {
    trace: langfuse.trace({
      name: "inba-search-assistant-" + new Date().toISOString(),
    }),
  };
}

async function runWorkflow(state, renderCallback) {
  const context = createContext();

  // Plan
  renderCallback?.renderLog("📋 Planning initial steps...");
  state.plan = await planStep(state.input, context, renderCallback);
  state.currentStep = 0;

  renderCallback?.renderPlanSteps("Initial Plan:", state.plan);

  while (!state.response) {
    // Check if we've completed all steps
    if (state.currentStep >= state.plan.length) {
      const replanOut = await replanStep(state, context, renderCallback);
      if (replanOut.response) {
        state.response = replanOut.response;
        break;
      }
      if (replanOut.plan) {
        renderCallback?.renderLog("📝 Replanning with new steps...");
        state.plan = replanOut.plan;
        renderCallback?.renderPlanSteps("Updated Plan:", replanOut.plan);
      }
      continue;
    }

    // Execute current step
    const currentStep = state.plan[state.currentStep];
    renderCallback?.renderCurrentStepTitle(
      `[Executing Step ${state.currentStep + 1}/${state.plan.length}]: `,
      currentStep
    );

    const result = await executeStep(currentStep, context, renderCallback);

    state.pastSteps.push([currentStep, result]);
    state.currentStep++;

    // Replan after each step
    renderCallback?.renderLog("🤔 Evaluating next steps...");
    const replanOut = await replanStep(state, context, renderCallback);
    if (replanOut.response) {
      renderCallback?.renderLog("✅ Workflow complete! Generating final response...");
      state.response = replanOut.response;
      break;
    }

    if (replanOut.plan) {
      renderCallback?.renderLog("📝 Updating plan with new steps...");
      state.plan = [
        ...state.plan.slice(0, state.currentStep),
        ...replanOut.plan,
      ];
      renderCallback?.renderPlanSteps("Updated Plan:", state.plan.slice(state.currentStep));
    }
  }

  renderCallback?.renderLog("👋 Shutting down workflow...");
  await langfuse.shutdownAsync();
  return state.response;
}

module.exports = { runWorkflow };
