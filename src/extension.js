const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');
const { getModelsForRole } = require('./config');
const logger = require('./logger');
const { executeTool } = require('./tools/toolRegistry');
const { TaskContext } = require('./agents/taskContext');
const { OrchestratorAgent } = require('./agents/orchestratorAgent');
const { WorkerAgent } = require('./agents/workerAgent');
const { SynthesizerAgent } = require('./agents/synthesizerAgent');
const { EvaluatorAgent } = require('./agents/evaluatorAgent');
const { CritiqueAggregationAgent } = require('./agents/critiqueAggregationAgent');
const { CodebaseScannerAgent } = require('./agents/codebaseScannerAgent');
const { MainPanel } = require('./ui/mainPanel');

async function scanProject(scannerAgent) {
    MainPanel.update({ command: 'log', text: 'Scanning project codebase...' });
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return "No workspace is open.";
    }
    const rootPath = workspaceFolders[0].uri.fsPath;
    let projectContext = "Project Structure:\n";
    const ignoreDirs = new Set(['.git', 'node_modules', 'dist', 'out', '.vscode']);
    const ignoreExtensions = new Set(['.lock', '.svg', '.png', '.jpg', '.jpeg', '.gif']);

    async function walk(dir, indent = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (ignoreDirs.has(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                projectContext += `${indent}- ${entry.name}/\n`;
                await walk(fullPath, indent + '  ');
            } else {
                if (ignoreExtensions.has(path.extname(entry.name))) continue;

                try {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const summary = await scannerAgent.executeTask(content);
                    projectContext += `${indent}- ${entry.name}: ${summary}\n`;
                } catch (e) {
                    projectContext += `${indent}- ${entry.name}: (Could not read or summarize file)\n`;
                }
            }
        }
    }

    await walk(rootPath);
    MainPanel.update({ command: 'log', text: 'Project scan complete.' });
    return projectContext;
}


function activate(context) {

    // Show a welcome message on first activation
    const a_key = 'multiAgentHelper.hasBeenActivated';
    if (!context.globalState.get(a_key)) {
        vscode.window.showInformationMessage('Welcome to Multi-Agent Helper! Configure your AI models in the settings to get started.');
        context.globalState.update(a_key, true);
    }

    let disposable = vscode.commands.registerCommand('multi-agent-helper.startTask', async () => {
        try {
            logger.createLogChannel();
            MainPanel.createOrShow(context.extensionPath);

            const userRequest = await vscode.window.showInputBox({ prompt: "Please enter your overall task goal" });
            if (!userRequest) {
                MainPanel.update({ command: 'log', text: 'Task cancelled by user.' });
                return;
            }
            MainPanel.update({ command: 'updateGoal', text: userRequest });

            // --- New Scanning Phase ---
            const scannerConfigs = getModelsForRole('codebaseScanner');
            if (!scannerConfigs) {
                vscode.window.showErrorMessage("Model configuration for Codebase Scanner is missing.");
                return;
            }
            const scannerAgent = new CodebaseScannerAgent(scannerConfigs[0]);
            const projectContextStr = await scanProject(scannerAgent);
            // --- End Scanning Phase ---

            const orchestratorConfigs = getModelsForRole('orchestrator');
            const workerConfigs = getModelsForRole('worker');
            const synthesizerConfigs = getModelsForRole('synthesizer');
            const evaluationTeamConfigs = getModelsForRole('evaluationTeam');
            const critiqueAggregatorConfigs = getModelsForRole('critiqueAggregator');

            if (!orchestratorConfigs || !workerConfigs || !synthesizerConfigs || !evaluationTeamConfigs || !critiqueAggregatorConfigs) {
                vscode.window.showErrorMessage("Model configuration is incomplete. Please define models for all roles in the settings.");
                return;
            }

            const orchestrator = new OrchestratorAgent(orchestratorConfigs[0]);
            const worker = new WorkerAgent(workerConfigs[0]);
            const synthesizer = new SynthesizerAgent(synthesizerConfigs[0]);
            const critiqueAggregator = new CritiqueAggregationAgent(critiqueAggregatorConfigs[0]);
            const taskContext = new TaskContext(userRequest);
            taskContext.projectContext = projectContextStr; // Add context to the task

            const MAX_ITERATIONS = 10;
            for (let i = 0; i < MAX_ITERATIONS; i++) {
                MainPanel.update({ command: 'log', text: `--- Iteration ${taskContext.currentIteration} ---` });

                const plan = await orchestrator.executeTask(taskContext);
                taskContext.setNewPlanForIteration(plan);
                MainPanel.update({ command: 'updatePlan', plan: taskContext.subTasks });

                let subTask = taskContext.getNextPendingTask();
                while(subTask) {
                    taskContext.updateTaskStatus(subTask.id, 'in_progress');
                    MainPanel.update({ command: 'updatePlan', plan: taskContext.subTasks });
                    MainPanel.update({ command: 'log', text: `Executing task: ${subTask.description.split('\n\n')[0]}` });

                    let attempts = 0;
                    const MAX_ATTEMPTS_PER_TASK = 3;
                    let lastError = '';

                    while (attempts < MAX_ATTEMPTS_PER_TASK) {
                        const workerResult = await worker.executeTask(subTask, taskContext);

                        try {
                            if (workerResult.toolName === 'terminal.executeCommand') {
                                const userApproval = await vscode.window.showWarningMessage(
                                    `Agent wants to execute command: \n\n${workerResult.args.command}\n\nApprove?`,
                                    { modal: true }, "Approve"
                                );
                                if (userApproval !== "Approve") throw new Error("User rejected terminal command.");
                            }
                            const toolResult = await executeTool(workerResult.toolName, workerResult.args, logger);
                            taskContext.updateTaskStatus(subTask.id, 'completed', toolResult);
                            MainPanel.update({ command: 'log', text: `Task completed successfully.` });
                            lastError = ''; // Clear error on success
                            break; // Exit retry loop
                        } catch (e) {
                            attempts++;
                            lastError = e.message;
                            MainPanel.update({ command: 'log', text: `Attempt ${attempts} failed: ${lastError}` });
                            if (attempts < MAX_ATTEMPTS_PER_TASK) {
                                const originalDescription = subTask.description.split('\n\n')[0];
                                subTask.description = `${originalDescription}\n\n(Previous attempt failed with error: ${lastError}). Please analyze this error and try a different approach.`;
                                MainPanel.update({ command: 'log', text: `Retrying...` });
                            }
                        }
                    }

                    if (lastError) {
                        taskContext.updateTaskStatus(subTask.id, 'failed', `Failed after ${MAX_ATTEMPTS_PER_TASK} attempts. Last error: ${lastError}`);
                    }

                    MainPanel.update({ command: 'updatePlan', plan: taskContext.subTasks });
                    subTask = taskContext.getNextPendingTask();
                }

                const artifact = await synthesizer.executeTask(taskContext);
                MainPanel.update({ command: 'showArtifact', artifact: artifact });

                const evaluationPromises = evaluationTeamConfigs.map(config => {
                    const evaluator = new EvaluatorAgent(config);
                    return evaluator.executeTask(artifact, taskContext);
                });
                const evaluations = await Promise.all(evaluationPromises);

                const finalCritique = await critiqueAggregator.executeTask(evaluations, taskContext);
                MainPanel.update({ command: 'log', text: `Final Score: ${finalCritique.score}/10. Summary: ${finalCritique.summary}` });

                taskContext.archiveCurrentIteration(artifact, finalCritique);

                if (finalCritique.score === 10) {
                    vscode.window.showInformationMessage("Task completed with a score of 10/10!");
                    break;
                }
                if (i === MAX_ITERATIONS - 1) {
                    vscode.window.showWarningMessage("Max iterations reached. Task terminated.");
                    break;
                }

                const choice = await vscode.window.showInformationMessage(
                    `Iteration ${taskContext.currentIteration - 1} complete. Score: ${finalCritique.score}/10. \nSummary: ${finalCritique.summary}\n\nContinue with optimization?`,
                    { modal: true }, "Continue", "Terminate"
                );
                if (choice !== "Continue") break;
            }

            const report = generateReport(taskContext);
            const reportDocument = await vscode.workspace.openTextDocument({ content: report, language: 'markdown' });
            await vscode.window.showTextDocument(reportDocument);

        } catch (error) {
            vscode.window.showErrorMessage(`A critical error occurred: ${error.message}`);
            logger.logLine(`\n--- CRITICAL ERROR ---\n${error.stack}`);
        }
    });
    context.subscriptions.push(disposable);
}

function generateReport(taskContext) {
    let report = `# Multi-Agent Task Report\n\n`;
    report += `**Original Request:** ${taskContext.originalUserRequest}\n\n`;
    const finalIteration = taskContext.getLatestIteration();
    if (finalIteration) {
        report += `**Final Score:** ${finalIteration.evaluation.score}/10\n`;
        if (finalIteration.evaluation.summary) {
            report += `**Final Summary:** ${finalIteration.evaluation.summary}\n\n`;
        }
        report += `## Final Artifact\n\n\`\`\`\n${finalIteration.artifact}\n\`\`\`\n\n`;
    }
    report += `## Iteration History\n\n`;
    for (const iter of taskContext.history) {
        report += `### Iteration ${iter.iteration} (Score: ${iter.evaluation.score}/10)\n`;
        if (iter.evaluation.summary) {
            report += `**Summary:** ${iter.evaluation.summary}\n`;
        }
        if (iter.evaluation.suggestions && iter.evaluation.suggestions.length > 0) {
            report += `**Suggestions:**\n` + iter.evaluation.suggestions.map(s => `- ${s}`).join('\n') + '\n';
        }
        report += `\n`;
    }
    return report;
}

function deactivate() {
    MainPanel.currentPanel?.dispose();
}

module.exports = { activate, deactivate };
