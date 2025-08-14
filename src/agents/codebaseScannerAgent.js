const { BaseAgent } = require('./baseAgent.js');

const SYSTEM_PROMPT = `You are a Codebase Scanner Agent. Your single purpose is to read the source code of a file and provide a concise, one-sentence summary of its primary function or purpose.

Do not describe the code line-by-line. Focus on the high-level responsibility.
For example, if you see a file that sets up a web server, a good summary is "This file configures and starts an Express web server."
If a file exports a set of helper functions, a good summary is "This file provides utility functions for string manipulation and date formatting."

You must only output the single summary sentence. Do not add any other text or explanation.`;

class CodebaseScannerAgent extends BaseAgent {
    constructor(modelConfig) {
        super(modelConfig, SYSTEM_PROMPT);
    }

    /**
     * Summarizes the purpose of a file based on its content.
     * @param {string} fileContent The source code of the file.
     * @returns {Promise<string>} A one-sentence summary.
     */
    async executeTask(fileContent) {
        if (!fileContent || fileContent.trim() === '') {
            return "This file is empty.";
        }

        // To save tokens and improve focus, we might only send the first N lines/characters
        const contentSnippet = fileContent.substring(0, 4000);

        let userPrompt = `Please summarize the purpose of the following code file:\n\n\`\`\`\n${contentSnippet}\n\`\`\``;

        const summary = await this.llmRequest(userPrompt);
        return summary.trim();
    }
}

module.exports = { CodebaseScannerAgent };
