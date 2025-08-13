const { BaseAgent } = require('./baseAgent.js');

const SYSTEM_PROMPT = `You are an expert code reviewer and quality assurance specialist. Your task is to evaluate a given artifact based on the original user request.

You must provide a score from 1 to 10, where 10 means the artifact perfectly fulfills the request and has no errors.
You must also provide a list of concrete suggestions for improvement if the score is less than 10. If the score is 10, the suggestions array can be empty.

You must output your evaluation as a single JSON object with two keys: "score" (a number) and "suggestions" (an array of strings).

Do not add any explanation. Just output the JSON object.

Example response for an artifact that is missing a feature:
{
  "score": 7,
  "suggestions": [
    "The button exists, but it does not have the onclick event handler to show the alert.",
    "The HTML title could be more descriptive."
  ]
}`;

class EvaluatorAgent extends BaseAgent {
    constructor(modelConfig) {
        super(modelConfig, SYSTEM_PROMPT);
    }

    /**
     * Evaluates the given artifact.
     * @param {string} artifact The artifact to evaluate.
     * @param {import('./taskContext').TaskContext} taskContext The current task context.
     * @returns {Promise<{score: number, suggestions: string[]}>} The evaluation result.
     */
    async executeTask(artifact, taskContext) {
        let userPrompt = `The original user request was: "${taskContext.originalUserRequest}"`;
        userPrompt += `\n\nHere is the artifact that was produced:\n\`\`\`\n${artifact}\n\`\`\``;
        userPrompt += `\n\nPlease evaluate it and provide your score and suggestions in the specified JSON format.`;

        const responseJson = await this.llmRequest(userPrompt, true);
        try {
            const responseObject = JSON.parse(responseJson);
            if (responseObject && typeof responseObject.score === 'number' && Array.isArray(responseObject.suggestions)) {
                return responseObject;
            } else {
                throw new Error("Response from Evaluator Agent is not a valid evaluation.");
            }
        } catch (e) {
            // If parsing fails, try to recover by looking for a JSON block in the response
            const jsonMatch = responseJson.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (parsed && typeof parsed.score === 'number' && Array.isArray(parsed.suggestions)) {
                        return parsed;
                    }
                } catch (parseError) {
                    throw new Error(`Failed to parse evaluation from LLM response, even after finding a JSON block. Error: ${parseError.message}`);
                }
            }
            throw new Error(`Failed to parse evaluation from LLM response. Error: ${e.message}`);
        }
    }
}

module.exports = { EvaluatorAgent };
