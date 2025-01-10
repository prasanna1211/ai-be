// planner.js

const { callOpenAIChat } = require("./openai");
const { availableFunctions } = require("./executor");
const logger = require("./logger");

// Helper function to generate tools description for system message
function generateToolsDescription() {
  let toolsDesc =
    "When creating the plan, keep in mind that the execution agent has access to the following tools:\n\n";

  // Use the actual function definitions from executor.js
  Object.entries(availableFunctions).forEach(([key, tool], index) => {
    toolsDesc += `${index + 1}. ${tool.name}: ${tool.description}\n`;
    if (tool.parameters?.properties) {
      toolsDesc += `   Parameters:\n`;
      Object.entries(tool.parameters.properties).forEach(
        ([paramName, paramDetails]) => {
          toolsDesc += `   - ${paramName}: ${paramDetails.description}\n`;
        }
      );
    }
  });

  toolsDesc +=
    "\nMake sure your plan effectively utilizes these available tools when needed. Break down steps in a way that can leverage these capabilities.";
  return toolsDesc;
}

async function planStep(objective, context) {
  const systemMessage = {
    role: "system",
    content: `You are a planner. Given an objective, return a step by step plan as a JSON object { "steps": [ "step 1", "step 2" ] } with no extra commentary.

${generateToolsDescription()}`,
  };
  const userMessage = { role: "user", content: objective };
  const resp = await callOpenAIChat([systemMessage, userMessage], context);
  const msg = resp.choices[0].message.content;

  // Attempt to parse JSON
  let plan;
  try {
    plan = JSON.parse(msg);
  } catch {
    // fallback if not well-formed
    plan = { steps: [] };
  }

  if (plan.steps && plan.steps.length > 0) {
    logger.info("\n📋 Initial Plan:");
    plan.steps.forEach((step, index) => {
      logger.info(`${index + 1}. ${step}`);
    });
  }

  return plan.steps || [];
}

async function replanStep(state, context) {
  const systemMessage = {
    role: "system",
    content: `You are a planner. Given the original objective, the current plan, and the last executed step, determine if the plan needs to be modified.
If the objective is complete, return an object with key as 'response' and value is the answer to users first question like this {"response":""}.
Otherwise return {"steps":["put in all the steps that are needed to achieve the objective after you have made the necessary changes to the plan"]}.

Consider:
1. Was the last step successful? If not, adjust the plan accordingly
2. Did the last step reveal new information that requires changing the remaining steps?
3. Are the remaining steps still appropriate to achieve the objective?

Everything is automatically recorded. no need to add steps to record

${generateToolsDescription()}`,
  };

  // Get the last executed step and remaining steps
  const lastStep = state.pastSteps[state.pastSteps.length - 1];
  // Since currentStep points to the next step to be executed,
  // we want all steps starting from currentStep
  const remainingSteps = state.plan.slice(state.currentStep);

  const userMessage = {
    role: "user",
    content: `Objective: ${state.input}

Last Executed Step: ${lastStep ? `${lastStep[0]}: ${lastStep[1]}` : "None"}

Remaining Steps:
${remainingSteps.length > 0 ? remainingSteps.join("\n") : "(No remaining steps)"
      }

Current Progress:
${state.pastSteps.length > 0
        ? state.pastSteps.map((p) => p[0] + ": " + p[1]).join("\n")
        : "(No steps executed yet)"
      }`,
  };

  const resp = await callOpenAIChat([systemMessage, userMessage], context);
  const msg = resp.choices[0].message.content;

  let output;
  try {
    output = JSON.parse(msg);
  } catch {
    output = { steps: remainingSteps }; // Fallback to keeping remaining steps unchanged
  }

  if (output.response) {
    // final answer
    return { response: output.response };
  }
  if (output.steps) {
    logger.info("\n📝 Updated Plan:");
    output.steps.forEach((step, index) => {
      logger.info(`${index + 1}. ${step}`);
    });
    return { plan: output.steps };
  }
  return { plan: remainingSteps }; // Fallback to keeping remaining steps unchanged
}

module.exports = { planStep, replanStep };
