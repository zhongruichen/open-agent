const vscode = require('vscode');
const { getModelForRole } = require('./config');
const logger = require('./logger');
const { executeTool } = require('./tools/toolRegistry');
const { TaskContext } = require('./agents/taskContext');
const { OrchestratorAgent } = require('./agents/orchestratorAgent');
const { WorkerAgent } = require('./agents/workerAgent');
const { SynthesizerAgent } = require('./agents/synthesizerAgent');
const { EvaluatorAgent } = require('./agents/evaluatorAgent');

// Main extension activation function
function activate(context) {
    let disposable = vscode.commands.registerCommand('multi-agent-helper.startTask', async () => {
        try {
            // 1. Initialize
            logger.createLogChannel();
            logger.show();
            logger.logLine("--- 多智能体任务已启动 ---");

            // 2. Get user's main goal
            const userRequest = await vscode.window.showInputBox({
                prompt: "请输入您的总体任务目标",
                placeHolder: "例如：创建一个带有按钮的简单HTML页面，点击按钮时显示'Hello World'提示框"
            });
            if (!userRequest) {
                logger.logLine("任务已取消。");
                return;
            }
            logger.logLine(`用户目标: ${userRequest}`);

            // 3. Load configurations and initialize agents
            const orchestratorConfig = getModelForRole('orchestrator');
            const workerConfig = getModelForRole('worker');
            const synthesizerConfig = getModelForRole('synthesizer');
            const evaluatorConfig = getModelForRole('evaluator');

            if (!orchestratorConfig || !workerConfig || !synthesizerConfig || !evaluatorConfig) {
                vscode.window.showErrorMessage("模型配置不完整，请在设置中至少定义一个模型。");
                logger.logLine("错误：模型配置不完整。");
                return;
            }

            const orchestrator = new OrchestratorAgent(orchestratorConfig);
            const worker = new WorkerAgent(workerConfig);
            const synthesizer = new SynthesizerAgent(synthesizerConfig);
            const evaluator = new EvaluatorAgent(evaluatorConfig);
            const taskContext = new TaskContext(userRequest);

            // 4. Main execution loop
            const MAX_ITERATIONS = 10;
            for (let i = 0; i < MAX_ITERATIONS; i++) {
                logger.logLine(`\n--- 第 ${taskContext.currentIteration} 轮迭代 ---`);

                // a. Orchestrator creates a plan
                const plan = await orchestrator.executeTask(taskContext);
                taskContext.setNewPlanForIteration(plan);
                logger.logLine(`规划者制定了 ${plan.length} 个步骤的计划。`);

                // b. Worker executes sub-tasks
                let subTask = taskContext.getNextPendingTask();
                while(subTask) {
                    taskContext.updateTaskStatus(subTask.id, 'in_progress');
                    logger.logLine(`\n工人正在执行任务: ${subTask.description}`);

                    const workerResult = await worker.executeTask(subTask, taskContext); // Expects { toolName, args }

                    // Execute tool
                    try {
                        // IMPORTANT: Need to handle user approval for terminal commands here
                        if (workerResult.toolName === 'terminal.executeCommand') {
                            const userApproval = await vscode.window.showWarningMessage(
                                `Agent wants to execute the following command: \n\n${workerResult.args.command}\n\nDo you approve?`,
                                { modal: true },
                                "Approve"
                            );
                            if (userApproval !== "Approve") {
                                throw new Error("User rejected terminal command execution.");
                            }
                        }
                        const toolResult = await executeTool(workerResult.toolName, workerResult.args, logger);
                        taskContext.updateTaskStatus(subTask.id, 'completed', toolResult);
                    } catch (e) {
                        logger.logLine(`工具执行错误: ${e.message}`);
                        taskContext.updateTaskStatus(subTask.id, 'failed', e.message);
                    }
                    subTask = taskContext.getNextPendingTask();
                }

                // c. Synthesizer creates the final artifact
                logger.logLine("\n整合者正在生成最终产物...");
                const artifact = await synthesizer.executeTask(taskContext);
                logger.logLine("整合者已完成工作。");

                // d. Evaluator assesses the artifact
                logger.logLine("\n评估者正在对产物进行评分...");
                const evaluation = await evaluator.executeTask(artifact, taskContext);
                logger.logLine(`评估结果: ${evaluation.score}/10`);
                if(evaluation.suggestions) {
                    logger.logLine(`建议: ${evaluation.suggestions.join(', ')}`);
                }

                // e. Archive and check for completion
                taskContext.archiveCurrentIteration(artifact, evaluation);

                if (evaluation.score === 10) {
                    vscode.window.showInformationMessage("任务已完成，评分为10/10！");
                    logger.logLine("\n--- 任务成功完成 ---");
                    break;
                }

                if (i === MAX_ITERATIONS - 1) {
                    vscode.window.showWarningMessage("已达到最大迭代次数，任务终止。");
                    logger.logLine("\n--- 已达到最大迭代次数 ---");
                    break;
                }

                // f. Ask user to continue
                const choice = await vscode.window.showInformationMessage(
                    `第 ${taskContext.currentIteration - 1} 轮完成，得分 ${evaluation.score}/10。是否根据建议继续优化？`,
                    { modal: true },
                    "继续优化",
                    "终止"
                );

                if (choice !== "继续优化") {
                    logger.logLine("\n--- 用户选择终止任务 ---");
                    break;
                }
            }

            // 5. Generate and show final report
            const report = generateReport(taskContext);
            const reportDocument = await vscode.workspace.openTextDocument({ content: report, language: 'markdown' });
            await vscode.window.showTextDocument(reportDocument);

        } catch (error) {
            vscode.window.showErrorMessage(`发生严重错误: ${error.message}`);
            logger.logLine(`\n--- 发生严重错误 ---\n${error.stack}`);
        }
    });

    context.subscriptions.push(disposable);
}

function generateReport(taskContext) {
    let report = `# 多智能体任务报告\n\n`;
    report += `**原始需求:** ${taskContext.originalUserRequest}\n\n`;
    const finalIteration = taskContext.getLatestIteration();
    if (finalIteration) {
        report += `**最终得分:** ${finalIteration.evaluation.score}/10\n`;
        if (finalIteration.evaluation.suggestions) {
            report += `**最终总结:** ${finalIteration.evaluation.suggestions.join(' ')}\n\n`;
        }
        report += `## 最终产物\n\n\`\`\`\n${finalIteration.artifact}\n\`\`\`\n\n`;
    }

    report += `## 迭代历史\n\n`;
    for (const iter of taskContext.history) {
        report += `### 第 ${iter.iteration} 輪 (得分: ${iter.evaluation.score}/10)\n`;
        if (iter.evaluation.suggestions) {
            report += `**评估建议:** ${iter.evaluation.suggestions.join(' ')}\n`;
        }
        report += `#### 子任务:\n`;
        for (const sub of iter.subTasks) {
            report += `- **[${sub.status}]** ${sub.description}\n`;
            if (sub.result) {
                const resultStr = String(sub.result);
                report += `  - 结果: ${resultStr.substring(0, 100)}...\n`;
            }
            if (sub.error) report += `  - 错误: ${sub.error}\n`;
        }
        report += `#### 产物:\n\`\`\`\n${iter.artifact}\n\`\`\`\n\n`;
    }
    return report;
}

function deactivate() {
    logger.dispose();
}

module.exports = {
    activate,
    deactivate
};
