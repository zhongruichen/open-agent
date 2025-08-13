const { OpenAICompatibleProvider } = require('../llm/provider.js');
class BaseAgent {
    constructor(modelConfig) {
        this.modelConfig = modelConfig;
        this.provider = new OpenAICompatibleProvider(modelConfig);
        this.systemPrompt = modelConfig.agentPrompt || 'You are a helpful assistant.';
    }
    async executeTask(userPrompt) {
        const messages = [ { role: 'system', content: this.systemPrompt }, { role: 'user', content: userPrompt } ];
        console.log(`Executing task with agent ${this.modelConfig.name}...`);
        const response = await this.provider.chatCompletion(messages);
        console.log(`Agent ${this.modelConfig.name} finished task.`);
        return response;
    }
}
module.exports = { BaseAgent };
