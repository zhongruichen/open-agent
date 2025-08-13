const { OpenAICompatibleProvider } = require('../llm/provider.js');
const { executeTool } = require('../tools/toolRegistry.js');
const MAX_TOOL_USES = 10;
// 整合者Agent，负责将工人Agent的零散成果（通过工具读取文件）整合成一个完整的产品
class SynthesizerAgent {
    constructor(modelConfig) { this.modelConfig = modelConfig; this.provider = new OpenAICompatibleProvider(this.modelConfig); }
    async executeTask(context, logger) {
        const systemPrompt = `你是一个专家级的软件整合者。你的工作是基于用户的请求和其他Agent执行的一系列动作日志，来创建一个最终的、完整的、可运行的程序。你可以使用工具来读取已创建的文件。你的任务是读取必要的文件，将它们组合成一个单一、内聚的成品，然后将该成品作为你的最终答案输出。你的最终回答应该只有纯粹的、原始的代码。`;
        const actionLog = context.subTasks.filter(task => task.status === 'completed' && task.result).map((task, index) => `子任务 ${index + 1} ("${task.description}") 已完成，总结: "${task.result}"`).join('\n');
        const initialUserPrompt = `总目标是: "${context.originalUserRequest}".\n之前的Agent已执行了以下动作:\n${actionLog}\n请现在整合出最终的程序。`;
        let conversation = [ { role: 'system', content: systemPrompt }, { role: 'user', content: initialUserPrompt } ];
        for (let i = 0; i < MAX_TOOL_USES; i++) {
            logger.logLine(`\n--- 整合者Agent回合 ${i+1} ---`);
            const response = await this.provider.chatCompletion(conversation, (token) => logger.log(token));
            let toolCall;
            try { toolCall = JSON.parse(response); } catch (e) { return response; }
            if (toolCall && toolCall.tool_name) {
                conversation.push({ role: 'assistant', content: response });
                const toolResult = await executeTool(toolCall.tool_name, toolCall.arguments, logger);
                conversation.push({ role: 'tool', content: `工具 ${toolCall.tool_name} 执行完毕. 结果: ${toolResult}` });
            } else { return response; }
        }
        return "整合任务已达到最大工具使用次数。";
    }
}
module.exports = { SynthesizerAgent };
