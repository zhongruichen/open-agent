const vscode = require('vscode');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');

/**
 * 向工作区写入文件
 * @param {string} relativePath 相对路径
 * @param {string} content 文件内容
 * @returns {Promise<string>} 确认信息
 */
async function writeFile(relativePath, content) { if (!vscode.workspace.workspaceFolders) { throw new Error("没有打开任何工作区。"); } const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath; const absolutePath = path.join(rootPath, relativePath); if (!absolutePath.startsWith(rootPath)) { throw new Error("文件路径在工作区之外。"); } await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(absolutePath))); const fileUri = vscode.Uri.file(absolutePath); const uint8ArrayContent = new TextEncoder().encode(content); await vscode.workspace.fs.writeFile(fileUri, uint8ArrayContent); return `成功写入文件: ${relativePath}`; }

/**
 * 读取工作区中的文件
 * @param {string} relativePath 相对路径
 * @returns {Promise<string>} 文件内容
 */
async function readFile(relativePath) { if (!vscode.workspace.workspaceFolders) { throw new Error("没有打开任何工作区。"); } const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath; const absolutePath = path.join(rootPath, relativePath); if (!absolutePath.startsWith(rootPath)) { throw new Error("文件路径在工作区之外。"); } const fileUri = vscode.Uri.file(absolutePath); const uint8ArrayContent = await vscode.workspace.fs.readFile(fileUri); return new TextDecoder().decode(uint8ArrayContent); }

/**
 * 列出工作区路径下的文件和目录
 * @param {string} relativePath 相对路径
 * @returns {Promise<string[]>} 文件和目录名列表
 */
async function listFiles(relativePath = './') { if (!vscode.workspace.workspaceFolders) { throw new Error("没有打开任何工作区。"); } const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath; const absolutePath = path.join(rootPath, relativePath); if (!absolutePath.startsWith(rootPath)) { throw new Error("文件路径在工作区之外。"); } const directoryUri = vscode.Uri.file(absolutePath); const entries = await vscode.workspace.fs.readDirectory(directoryUri); return entries.map(([name, type]) => type === vscode.FileType.Directory ? `${name}/` : name); }

module.exports = { writeFile, readFile, listFiles };
