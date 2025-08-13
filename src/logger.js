const vscode = require('vscode');

let outputChannel; // 单例输出通道

/**
 * 创建日志输出通道
 */
function createLogChannel() { if (!outputChannel) { outputChannel = vscode.window.createOutputChannel("多智能体日志"); } }

/**
 * 追加日志（不换行，用于流式输出）
 * @param {string} message
 */
function log(message) { if (outputChannel) { outputChannel.append(message); } }

/**
 * 追加一行日志
 * @param {string} message
 */
function logLine(message) { if (outputChannel) { outputChannel.appendLine(message); } }

/**
 * 显示输出面板
 */
function show() { if (outputChannel) { outputChannel.show(true); } }

/**
 * 销毁输出通道
 */
function dispose() { if (outputChannel) { outputChannel.dispose(); outputChannel = undefined; } }

module.exports = { createLogChannel, log, logLine, show, dispose };
