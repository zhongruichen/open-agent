const { OpenAICompatibleProvider } = require('../llm/provider.js');
// 规划者Agent，负责将高级目标分解为计划，或根据反馈制定修复/优化计划
class OrchestratorAgent {
    constructor(modelConfig) { this.modelConfig = modelConfig; this.provider = new OpenAICompatibleProvider(this.modelConfig); }
    async generatePlan(userRequest, latestIteration = null, logger = null) {
        let systemPrompt, userPromptContent;
        const failedTasks = latestIteration ? latestIteration.subTasks.filter(t => t.status === 'failed') : [];
        if (failedTasks.length > 0) {
            systemPrompt = `你是一个解决问题的专家。上一步的计划执行失败了。你的任务是分析错误报告，并制定一个全新的、简洁的计划来修复这个问题。计划中只应包含解决该错误所必需的步骤。你必须只返回一个有效的JSON字符串数组。`;
            const errorReport = failedTasks.map(t => `任务 "${t.description}" 失败，错误: ${t.error}`).join('\n');
            userPromptContent = `原始需求: "${userRequest}"\n\n--- 失败的任务 ---\n${errorReport}\n\n请提供一个解决这些错误的新计划。`;
        } else if (latestIteration) {
            systemPrompt = `你是一个项目管理专家，当前处于“精炼”循环中。你将收到原始用户需求、上一个版本的代码以及一份包含改进建议的评估报告。你的任务是创建一个全新的、简洁的子任务计划，以解决所有的建议。你必须只返回一个有效的JSON字符串数组。`;
            userPromptContent = `原始需求: "${userRequest}"\n\n--- 上一版产品 ---\n${latestIteration.artifact}\n\n--- 改进建议 ---\n${JSON.stringify(latestIteration.evaluation.suggestions, null, 2)}`;
        } else {
            systemPrompt = `你是一个项目规划专家。你的任务是将用户的请求分解成一系列清晰、可执行的、按顺序排列的子任务。你必须只返回一个有效的JSON字符串数组。`;
            userPromptContent = userRequest;
        }
        const messages = [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPromptContent } ];
        const response = await this.provider.chatCompletion(messages, logger ? (token) => logger.log(token) : null);
        try {
            const plan = JSON.parse(response);
            if (Array.isArray(plan) && plan.every(item => typeof item === 'string')) { return plan; } else { throw new Error("LLM 未返回一个有效的JSON字符串数组。"); }
        } catch (error) {
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) { try { const plan = JSON.parse(jsonMatch[1]); if (Array.isArray(plan) && plan.every(item => typeof item === 'string')) { return plan; } } catch (e) { throw new Error("无法从提取的JSON中生成有效计划。"); } }
            throw new Error(`无法生成有效计划。原始回复: ${response}`);
        }
    }
}
module.exports = { OrchestratorAgent };
