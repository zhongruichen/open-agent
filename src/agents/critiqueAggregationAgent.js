const { BaseAgent } = require('./baseAgent.js');

const SYSTEM_PROMPT = `You are a Lead Reviewer. You have been given a collection of reviews for a software artifact, each from a different AI assistant. Your job is to synthesize all of this feedback into a single, clear, and actionable critique.

You will receive the original user request and a list of evaluations, each containing a score and suggestions.

Your tasks are:
1.  **Synthesize Suggestions:** Combine all the suggestions into a single, de-duplicated, and cohesive list of improvements. Remove redundant points and merge similar ideas.
2.  **Determine a Final Score:** Based on the provided scores and your own assessment of the feedback, determine a final, single score for the artifact. This could be an average, a weighted average, or the lowest score if the feedback indicates critical issues.
3.  **Provide a Summary:** Write a brief, high-level summary of the overall assessment.

You must output your final critique as a single JSON object with three keys: "score" (a number), "suggestions" (an array of strings), and "summary" (a string).

Do not add any explanation. Just output the JSON object.`;

class CritiqueAggregationAgent extends BaseAgent {
    constructor(modelConfig) {
        super(modelConfig, SYSTEM_PROMPT);
    }

    /**
     * Aggregates multiple evaluations into a single critique.
     * @param {Array<{score: number, suggestions: string[]}>} evaluations An array of evaluation objects.
     * @param {import('./taskContext').TaskContext} taskContext The current task context.
     * @returns {Promise<{score: number, suggestions: string[], summary: string}>} The aggregated critique.
     */
    async executeTask(evaluations, taskContext) {
        let userPrompt = `The original user request was: "${taskContext.originalUserRequest}"`;
        userPrompt += `\n\nHere are the evaluations from the team:\n${JSON.stringify(evaluations, null, 2)}`;
        userPrompt += `\n\nPlease synthesize these evaluations into a single, final critique in the specified JSON format.`;

        const responseJson = await this.llmRequest(userPrompt, true);
        try {
            const responseObject = JSON.parse(responseJson);
            if (responseObject && typeof responseObject.score === 'number' && Array.isArray(responseObject.suggestions) && typeof responseObject.summary === 'string') {
                return responseObject;
            } else {
                throw new Error("Response from Critique Aggregation Agent is not a valid critique.");
            }
        } catch (e) {
            const jsonMatch = responseJson.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (parsed && typeof parsed.score === 'number' && Array.isArray(parsed.suggestions) && typeof parsed.summary === 'string') {
                        return parsed;
                    }
                } catch (parseError) {
                    throw new Error(`Failed to parse critique from LLM response, even after finding a JSON block. Error: ${parseError.message}`);
                }
            }
            throw new Error(`Failed to parse critique from LLM response. Error: ${e.message}`);
        }
    }
}

module.exports = { CritiqueAggregationAgent };
