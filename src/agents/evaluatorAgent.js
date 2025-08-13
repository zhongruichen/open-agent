const { OpenAICompatibleProvider } = require('../llm/provider.js');
// 评估者Agent，负责像QA一样评审产品，并给出结构化的分数和建议
class EvaluatorAgent {
    constructor(modelConfig) { this.modelConfig = modelConfig; this.provider = new OpenAICompatibleProvider(this.modelConfig); }
    async executeTask(artifact, originalUserRequest, logger) {
        const systemPrompt = `你是一个一丝不苟、甚至有些苛刻的软件质量保证专家和代码评审员。你的回答必须只包含一个有效的JSON对象，该对象有两个键：1. "score": 一个1到10之间的数字。2. "suggestions": 一个包含具体、可操作改进建议的字符串数组。如果产品是完美的，分数为10，suggestions数组必须为空。`;
        const userPrompt = `请根据以下原始用户需求，评估这个产品。\n\n原始需求: "${originalUserRequest}"\n\n--- 待评估产品开始 ---\n${artifact}\n--- 待评估产品结束 ---`;
        const messages = [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ];
        logger.logLine("\n--- 评估者Agent正在评估... ---");
        const response = await this.provider.chatCompletion(messages, (token) => logger.log(token));
        try {
            const evaluation = JSON.parse(response);
            if (typeof evaluation.score === 'number' && Array.isArray(evaluation.suggestions)) { return evaluation; } else { throw new Error("LLM 未返回一个有效的评估对象。"); }
        } catch (error) { throw new Error("无法生成有效评估。原始回复非有效JSON。"); }
    }
}
module.exports = { EvaluatorAgent };
