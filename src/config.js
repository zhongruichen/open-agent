const vscode = require('vscode');

/**
 * @returns {Array<object>}
 */
function getModelConfigs() {
    return vscode.workspace.getConfiguration('multiAgent').get('models', []);
}

/**
 * @returns {object}
 */
function getRoleAssignments() {
    return vscode.workspace.getConfiguration('multiAgent').get('roleAssignments', {});
}

/**
 * Gets the model configuration for a given role.
 * Falls back to the first model in the list if no specific assignment is found.
 * @param {'orchestrator' | 'worker' | 'synthesizer' | 'evaluator'} role The role name.
 * @returns {object | null} A deep copy of the model configuration object, or null if no models are defined.
 */
function getModelForRole(role) {
    const assignments = getRoleAssignments();
    const allModels = getModelConfigs();

    if (allModels.length === 0) {
        return null;
    }

    const modelName = assignments[role];
    if (modelName) {
        const model = allModels.find(m => m.name === modelName);
        if (model) {
            // Return a deep copy to prevent accidental mutation of the original config
            return JSON.parse(JSON.stringify(model));
        }
    }

    // Fallback to the first model in the list
    return JSON.parse(JSON.stringify(allModels[0]));
}

module.exports = {
    getModelForRole
};
