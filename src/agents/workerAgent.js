const { BaseAgent } = require('./baseAgent.js');

const SYSTEM_PROMPT = `You are a Worker Agent. Your job is to execute a single task given to you by the Project Manager.
You have access to a set of tools to interact with the file system and a terminal.

Based on the user's original request, the overall plan, the work done so far, and your current sub-task, you must decide which single tool to call.
You must respond with a single JSON object containing the key "toolName" and a key "args" which is an object of arguments for that tool.

Your available tools are:
- 'fileSystem.writeFile': Writes content to a file.
  - args: { "path": "<relative_path_to_file>", "content": "<file_content>" }
- 'fileSystem.readFile': Reads the content of a file.
  - args: { "path": "<relative_path_to_file>" }
- 'fileSystem.listFiles': Lists files and directories at a path.
  - args: { "path": "<relative_path_to_list>" }
- 'terminal.executeCommand': Executes a shell command.
  - args: { "command": "<command_to_execute>" }
- 'webSearch.search': Performs a web search to find information, answer questions, or get examples.
  - args: { "query": "<search_query>" }

Do not add any explanation. Just output the JSON object.

Example response for the task "Create a file named 'index.html' with the content '<h1>Hello</h1>'":
{
  "toolName": "fileSystem.writeFile",
  "args": {
    "path": "index.html",
    "content": "<h1>Hello</h1>"
  }
}`;

class WorkerAgent extends BaseAgent {
    constructor(modelConfig) {
        super(modelConfig, SYSTEM_PROMPT);
    }

    /**
     * Executes a single sub-task.
     * @param {import('./taskContext').SubTask} subTask The sub-task to execute.
     * @param {import('./taskContext').TaskContext} taskContext The overall task context.
     * @returns {Promise<{toolName: string, args: object}>} The tool call to be executed.
     */
    async executeTask(subTask, taskContext) {
        let userPrompt = `The original user request was: "${taskContext.originalUserRequest}"`;
        userPrompt += `\n\nHere is the overall progress so far:\n${taskContext.overallProgress}`;
        userPrompt += `\n\nYour current task is: "${subTask.description}"`;
        userPrompt += `\nPlease decide which tool to use to complete this task and provide the corresponding JSON output.`;

        const responseJson = await this.llmRequest(userPrompt, true);
        try {
            const responseObject = JSON.parse(responseJson);
            if (responseObject && responseObject.toolName && responseObject.args) {
                return responseObject;
            } else {
                throw new Error("Response from Worker Agent is not a valid tool call.");
            }
        } catch (e) {
            // If parsing fails, try to recover by looking for a JSON block in the response
            const jsonMatch = responseJson.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (parsed && parsed.toolName && parsed.args) {
                        return parsed;
                    }
                } catch (parseError) {
                     throw new Error(`Failed to parse tool call from LLM response, even after finding a JSON block. Error: ${parseError.message}`);
                }
            }
            throw new Error(`Failed to parse tool call from LLM response. Error: ${e.message}`);
        }
    }
}

module.exports = { WorkerAgent };
