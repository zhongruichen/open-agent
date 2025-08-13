const { BaseAgent } = require('./baseAgent.js');

const SYSTEM_PROMPT = `You are an expert software development project manager. Your role is to decompose a user's request into a clear, step-by-step plan.

You will be given the user's original request and the history of previous iterations (if any).
Based on this information, create a concise plan of sub-tasks for the Worker Agent to execute.
Each sub-task should be a single, actionable command for the Worker Agent. Good sub-tasks are small and focused, like "Create a file named 'index.html'" or "Install the 'uuid' package using npm".

The user's request may be to create a new project from scratch or to modify an existing one.
If this is the first iteration, create a plan to fulfill the user's request.
If there are previous iterations, analyze the feedback from the Evaluator and create a new plan that addresses the suggestions for improvement.

You must output your plan as a JSON object containing a single key "plan", which is an array of strings. Each string is a step in the plan.

Example response for a request "create a hello world python script":
{
  "plan": [
    "Create a file named 'main.py' with the content 'print(\"Hello, World!\")'",
    "Execute the 'python main.py' command in the terminal to verify the output"
  ]
}`;

class OrchestratorAgent extends BaseAgent {
    constructor(modelConfig) {
        super(modelConfig, SYSTEM_PROMPT);
    }

    /**
     * Creates a plan to fulfill the user's request.
     * @param {import('./taskContext').TaskContext} taskContext The current task context.
     * @returns {Promise<string[]>} An array of strings representing the plan.
     */
    async executeTask(taskContext) {
        let userPrompt = `Original user request: "${taskContext.originalUserRequest}"`;

        const latestIteration = taskContext.getLatestIteration();
        if (latestIteration) {
            userPrompt += `\n\nThis is iteration number ${taskContext.currentIteration}.`;
            userPrompt += `\nHere is the artifact from the previous iteration:\n\`\`\`\n${latestIteration.artifact}\n\`\`\``;
            userPrompt += `\nThe evaluator scored it ${latestIteration.evaluation.score}/10 and provided the following feedback: ${latestIteration.evaluation.suggestions.join(', ')}`;
            userPrompt += `\nPlease create a new plan to address this feedback and improve the project.`;
        } else {
            userPrompt += `\nPlease create the initial plan to complete this request.`;
        }

        const responseJson = await this.llmRequest(userPrompt, true);
        try {
            const responseObject = JSON.parse(responseJson);
            if (responseObject && Array.isArray(responseObject.plan)) {
                return responseObject.plan;
            } else {
                throw new Error("Response from Orchestrator Agent is not a valid plan.");
            }
        } catch (e) {
            // If parsing fails, try to recover by looking for a JSON block in the response
            const jsonMatch = responseJson.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (parsed && Array.isArray(parsed.plan)) {
                        return parsed.plan;
                    }
                } catch (parseError) {
                    throw new Error(`Failed to parse plan from LLM response, even after finding a JSON block. Error: ${parseError.message}`);
                }
            }
            throw new Error(`Failed to parse plan from LLM response. Error: ${e.message}`);
        }
    }
}

module.exports = { OrchestratorAgent };
