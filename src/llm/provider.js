const https = require('https');

// 处理与兼容OpenAI API的LLM提供商的通信
class OpenAICompatibleProvider {
    constructor(modelConfig) { this.config = modelConfig; }

    /**
     * 发起聊天补全请求，并支持流式响应
     * @param {Array<object>} messages 聊天消息历史
     * @param {(token: string) => void} onToken 用于处理流式返回的token的回调函数
     * @returns {Promise<string>} 最终完整的回复文本
     */
    async chatCompletion(messages, onToken) {
        const url = new URL(this.config.baseUrl || 'https://api.openai.com/v1/chat/completions');
        const body = JSON.stringify({ model: this.config.modelName, messages: messages, stream: true, temperature: 0.5 });
        const options = { hostname: url.hostname, port: url.port || 443, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}`, 'Accept': 'text/event-stream' } };
        let fullResponse = "";
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                if (res.statusCode < 200 || res.statusCode >= 300) { return reject(new Error(`API请求失败，状态码: ${res.statusCode}`)); }
                res.on('data', (chunk) => {
                    const chunkStr = chunk.toString();
                    const lines = chunkStr.split('\n').filter(line => line.trim() !== '');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6);
                            if (dataStr === '[DONE]') { resolve(fullResponse); return; }
                            try {
                                const parsed = JSON.parse(dataStr);
                                const token = parsed.choices[0]?.delta?.content || '';
                                if (token) { fullResponse += token; if (onToken) { onToken(token); } }
                            } catch (e) { /* 忽略无法解析的行 */ }
                        }
                    }
                });
                res.on('end', () => { resolve(fullResponse); });
            });
            req.on('error', (e) => { reject(new Error(`API请求错误: ${e.message}`)); });
            req.write(body);
            req.end();
        });
    }
}
module.exports = { OpenAICompatibleProvider };
