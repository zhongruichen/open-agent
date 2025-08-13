const { BaseAgent } = require('./baseAgent.js');

const SYSTEM_PROMPT = `You are a Synthesizer Agent. Your responsibility is to take the user's original request and a summary of all the completed sub-tasks, and then generate the final, complete artifact.

Often, this means creating the full content of a code file based on the actions taken by the worker agent (e.g., file creations, modifications).
You should only output the final artifact itself, with no explanation, code fences, or other text.

For example, if the worker created a file and then executed it, the final artifact is likely the content of the file that was created.
Analyze the completed tasks and produce a single, final output that represents the fulfillment of the user's request.`;

class SynthesizerAgent extends BaseAgent {
    constructor(modelConfig) {
        super(modelConfig, SYSTEM_PROMPT);
    }

    /**
     * Generates the final artifact based on the completed tasks.
     * @param {import('./taskContext').TaskContext} taskContext The current task context.
     * @returns {Promise<string>} The final artifact.
     */
    async executeTask(taskContext) {
        let userPrompt = `The original user request was: "${taskContext.originalUserRequest}"`;
        userPrompt += `\n\nHere is a summary of the completed sub-tasks and their results:\n${taskContext.getCompletedTasksSummary()}`;
        userPrompt += `\n\nPlease generate the final, complete artifact that fulfills the original request based on the work done.`;

        const artifact = await this.llmRequest(userPrompt);
        return artifact;
    }
}

module.exports = { SynthesizerAgent };
