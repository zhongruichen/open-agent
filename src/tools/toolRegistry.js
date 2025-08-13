const { writeFile, readFile, listFiles } = require('./fileSystem.js');
const { executeCommand } = require('./terminal.js');

// 工具注册表，将工具名称映射到实现函数
const toolRegistry = { 'fileSystem.writeFile': writeFile, 'fileSystem.readFile': readFile, 'fileSystem.listFiles': listFiles, 'terminal.executeCommand': executeCommand, };

/**
 * 根据名称和参数执行工具
 * @param {string} toolName 要执行的工具名称
 * @param {object} args 工具的参数
 * @param {object} logger 日志记录器
 * @returns {Promise<any>} 工具执行的结果
 */
async function executeTool(toolName, args, logger) {
    logger.logLine(`\n--- 工具调用： ${toolName} ---`);
    logger.logLine(`参数: ${JSON.stringify(args)}`);
    if (toolRegistry[toolName]) {
        const tool = toolRegistry[toolName];
        let result;
        if (toolName === 'fileSystem.writeFile') { result = await tool(args.path, args.content); }
        else if (toolName === 'fileSystem.readFile') { result = await tool(args.path); }
        else if (toolName === 'fileSystem.listFiles') { result = await tool(args.path || './'); }
        else if (toolName === 'terminal.executeCommand') { result = await tool(args.command); }
        else { throw new Error(`工具参数处理未实现: ${toolName}`); }
        logger.logLine(`--- 工具结果 ---\n${result}\n---`);
        return result;
    }
    throw new Error(`未找到工具： "${toolName}"`);
}
module.exports = { executeTool };
