const vscode = require('vscode');
const { getModelsForRole } = require('./config');
const logger = require('./logger');
const { executeTool } = require('./tools/toolRegistry');
const { TaskContext } = require('./agents/taskContext');
const { OrchestratorAgent } = require('./agents/orchestratorAgent');
const { WorkerAgent } = require('./agents/workerAgent');
const { SynthesizerAgent } = require('./agents/synthesizerAgent');
const { EvaluatorAgent } = require('./agents/evaluatorAgent');
const { CritiqueAggregationAgent } = require('./agents/critiqueAggregationAgent');

function activate(context) {
    let disposable = vscode.commands.registerCommand('multi-agent-helper.startTask', async () => {
        try {
            logger.createLogChannel();
            logger.show();
            logger.logLine("--- Multi-Agent Task Started ---");

            const userRequest = await vscode.window.showInputBox({ prompt: "Please enter your overall task goal" });
            if (!userRequest) {
                logger.logLine("Task cancelled by user.");
                return;
            }
            logger.logLine(`User Goal: ${userRequest}`);

            // Load configurations for all roles
            const orchestratorConfigs = getModelsForRole('orchestrator');
            const workerConfigs = getModelsForRole('worker');
            const synthesizerConfigs = getModelsForRole('synthesizer');
            const evaluationTeamConfigs = getModelsForRole('evaluationTeam');
            const critiqueAggregatorConfigs = getModelsForRole('critiqueAggregator');

            if (!orchestratorConfigs || !workerConfigs || !synthesizerConfigs || !evaluationTeamConfigs || !critiqueAggregatorConfigs) {
                vscode.window.showErrorMessage("Model configuration is incomplete. Please define models for all roles in the settings.");
                return;
            }

            // Instantiate agents
            const orchestrator = new OrchestratorAgent(orchestratorConfigs[0]);
            const worker = new WorkerAgent(workerConfigs[0]);
            const synthesizer = new SynthesizerAgent(synthesizerConfigs[0]);
            const critiqueAggregator = new CritiqueAggregationAgent(critiqueAggregatorConfigs[0]);
            const taskContext = new TaskContext(userRequest);

            const MAX_ITERATIONS = 10;
            for (let i = 0; i < MAX_ITERATIONS; i++) {
                logger.logLine(`\n--- Iteration ${taskContext.currentIteration} ---`);

                const plan = await orchestrator.executeTask(taskContext);
                taskContext.setNewPlanForIteration(plan);
                logger.logLine(`Orchestrator created a plan with ${plan.length} steps.`);

                let subTask = taskContext.getNextPendingTask();
                while(subTask) {
                    taskContext.updateTaskStatus(subTask.id, 'in_progress');
                    logger.logLine(`\nWorker executing task: ${subTask.description}`);

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
                    } catch (e) {
                        logger.logLine(`Tool execution error: ${e.message}`);
                        taskContext.updateTaskStatus(subTask.id, 'failed', e.message);
                    }
                    subTask = taskContext.getNextPendingTask();
                }

                logger.logLine("\nSynthesizer generating final artifact...");
                const artifact = await synthesizer.executeTask(taskContext);
                logger.logLine("Synthesizer finished.");

                // --- New Multi-Agent Evaluation Flow ---
                logger.logLine(`\nEvaluation Team assessing the artifact...`);
                const evaluationPromises = evaluationTeamConfigs.map(config => {
                    const evaluator = new EvaluatorAgent(config);
                    logger.logLine(`- Evaluator ${config.name} starting...`);
                    return evaluator.executeTask(artifact, taskContext);
                });

                const evaluations = await Promise.all(evaluationPromises);
                logger.logLine(`Evaluation team provided ${evaluations.length} critiques.`);

                logger.logLine(`\nCritique Aggregator synthesizing feedback...`);
                const finalCritique = await critiqueAggregator.executeTask(evaluations, taskContext);
                logger.logLine(`Final Score: ${finalCritique.score}/10`);
                logger.logLine(`Summary: ${finalCritique.summary}`);

                taskContext.archiveCurrentIteration(artifact, finalCritique);

                if (finalCritique.score === 10) {
                    vscode.window.showInformationMessage("Task completed with a score of 10/10!");
                    logger.logLine("\n--- Task Successfully Completed ---");
                    break;
                }

                if (i === MAX_ITERATIONS - 1) {
                    vscode.window.showWarningMessage("Max iterations reached. Task terminated.");
                    logger.logLine("\n--- Max Iterations Reached ---");
                    break;
                }

                const choice = await vscode.window.showInformationMessage(
                    `Iteration ${taskContext.currentIteration - 1} complete. Score: ${finalCritique.score}/10. \nSummary: ${finalCritique.summary}\n\nContinue with optimization?`,
                    { modal: true }, "Continue", "Terminate"
                );

                if (choice !== "Continue") {
                    logger.logLine("\n--- Task Terminated by User ---");
                    break;
                }
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
    logger.dispose();
}

module.exports = { activate, deactivate };
