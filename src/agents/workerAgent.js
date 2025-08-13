const { OpenAICompatibleProvider } = require('../llm/provider.js');
const { executeTool } = require('../tools/toolRegistry.js');
const MAX_TOOL_USES = 10;
// 工人Agent，负责执行具体的子任务，是具备工具使用能力的“实干家”
class WorkerAgent {
    constructor(modelConfig) { this.modelConfig = modelConfig; this.provider = new OpenAICompatibleProvider(this.modelConfig); }
    async executeTask(taskDescription, context, logger) {
        const systemPrompt = `你是一个专家级的智能体，旨在完成一项具体的编程任务。你可以使用一系列工具。为了完成任务，你必须分步思考并使用所提供的工具。当你需要使用工具时，必须只返回一个有效的JSON对象，格式如下：{"tool_name": "要调用的工具名", "arguments": {"arg1": "value1"}}。\n可用工具如下：\n- fileSystem.writeFile(path: string, content: string): 将内容写入文件。\n- fileSystem.readFile(path: string): 读取文件内容。\n- fileSystem.listFiles(path: string): 列出路径下的文件和目录。\n- terminal.executeCommand(command: string): 执行终端命令。\n当一个工具被执行后，你会收到一条确认信息。请继续使用工具，直到子任务完全完成。一旦子任务完成，你必须返回一条纯文本消息，总结你做了什么。最终消息中不要调用工具。`;
        const initialUserPrompt = `总目标是: "${context.originalUserRequest}". 你当前具体的子任务是: "${taskDescription}". 开始工作。`;
        let conversation = [ { role: 'system', content: systemPrompt }, { role: 'user', content: initialUserPrompt } ];
        for (let i = 0; i < MAX_TOOL_USES; i++) {
            logger.logLine(`\n--- 工人Agent回合 ${i+1} ---`);
            const response = await this.provider.chatCompletion(conversation, (token) => logger.log(token));
            let toolCall;
            try { toolCall = JSON.parse(response); } catch (e) { return response; }
            if (toolCall && toolCall.tool_name) {
                conversation.push({ role: 'assistant', content: response });
                const toolResult = await executeTool(toolCall.tool_name, toolCall.arguments, logger);
                conversation.push({ role: 'tool', content: toolResult });
            } else { return response; }
        }
        return "此子任务已达到最大工具使用次数，但未提供最终答案。";
    }
}
module.exports = { WorkerAgent };
