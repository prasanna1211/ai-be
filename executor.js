// executor.js

const { callOpenAIChat } = require("./openai");
const { tavilySearchResults } = require("./tools");

// Define the available functions for the model
const availableFunctions = {
  search: {
    name: "search",
    description: "Search the web for information about a given query",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to look up",
        },
      },
      required: ["query"],
    },
  },
};

async function executeStep(step, context, renderCallback, userId) {
  const systemMessage = {
    role: "system",
    content: `You are an execution agent that can use tools to help complete tasks. You have access to the following tools:

1. Web Search: You can search the web for current information using the 'search' function. This returns relevant search results including titles and content.

When you need to search for information, use the search function rather than making assumptions.`,
  };
  const userMessage = { role: "user", content: step };

  // Call LLM with function calling enabled
  const initialResp = await callOpenAIChat(
    [systemMessage, userMessage],
    {
      functions: [availableFunctions.search],
      function_call: "auto",
    },
    userId
  );

  let content = initialResp.choices[0].message.content;
  const functionCall = initialResp.choices[0].message.function_call;

  // Handle function calling
  if (functionCall && functionCall.name === "search") {
    const searchQuery = JSON.parse(functionCall.arguments).query;
    const results = await tavilySearchResults(searchQuery);

    // Give results back to the model for final response
    const toolMessage = {
      role: "assistant",
      content: "Searching for information...",
      function_call: functionCall,
    };

    const toolResultMessage = {
      role: "function",
      name: "search",
      content: JSON.stringify(results),
    };

    const finalResp = await callOpenAIChat(
      [systemMessage, userMessage, toolMessage, toolResultMessage],
      context,
      userId
    );

    content = finalResp.choices[0].message.content || "";
  }

  renderCallback?.renderLog(`🤖 Step result: ${content.trim()}`);
  return content.trim();
}

module.exports = { executeStep, availableFunctions };
