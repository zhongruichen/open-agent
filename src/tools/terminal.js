const vscode = require('vscode');
const { exec } = require('child_process');

/**
 * 在用户批准后执行终端命令
 * @param {string} command 要执行的命令
 * @returns {Promise<string>} 命令的标准输出和标准错误
 */
async function executeCommand(command) {
    const userChoice = await vscode.window.showWarningMessage(`一个智能体想要执行以下终端命令：\n\n${command}\n\n您是否批准？`, { modal: true }, "批准");
    if (userChoice !== "批准") { return "用户拒绝执行该命令。"; }
    if (!vscode.workspace.workspaceFolders) { throw new Error("没有打开任何工作区。"); }
    const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
    return new Promise((resolve) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) { resolve(`命令执行出错: ${error.message}\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`); return; }
            resolve(`命令执行成功。\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
        });
    });
}
module.exports = { executeCommand };
