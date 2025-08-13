const vscode = require('vscode');

/**
 * @returns {Array<object>} 获取所有模型定义
 */
function getModelConfigs() { return vscode.workspace.getConfiguration('multiAgent').get('models', []); }

/**
 * @returns {object} 获取角色分配设置
 */
function getRoleAssignments() { return vscode.workspace.getConfiguration('multiAgent').get('roleAssignments', {}); }

/**
 * 根据角色获取对应的模型配置
 * 如果没有为角色特别指定模型，则回退到模型列表中的第一个
 * @param {'orchestrator' | 'worker' | 'synthesizer' | 'evaluator'} role 角色名称
 * @returns {object | null} 模型的完整配置对象，或null
 */
function getModelForRole(role) {
    const assignments = getRoleAssignments();
    const allModels = getModelConfigs();
    if (allModels.length === 0) { return null; }
    const modelName = assignments[role];
    if (modelName) {
        const model = allModels.find(m => m.name === modelName);
        if (model) { return JSON.parse(JSON.stringify(model)); } // 返回一个深拷贝，防止意外修改原始配置
    }
    return JSON.parse(JSON.stringify(allModels[0])); // 返回深拷贝作为备用
}
module.exports = { getModelForRole };
