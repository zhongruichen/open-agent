// 定义JSDoc类型以便于理解
/** @typedef {{id: string, description: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', result: string | null, error: string | null}} SubTask */
/** @typedef {{score: number, suggestions: string[]}} Evaluation */
/** @typedef {{iteration: number, artifact: string, evaluation: Evaluation, subTasks: SubTask[]}} IterationHistory */

// 任务上下文管理器，负责在多步骤、多轮次的任务中跟踪所有状态
class TaskContext {
    /** @param {string} originalUserRequest 用户的原始请求 */
    constructor(originalUserRequest) {
        this.originalUserRequest = originalUserRequest;
        /** @type {SubTask[]} */
        this.subTasks = [];
        /** @type {IterationHistory[]} */
        this.history = [];
        this.currentIteration = 1;
    }

    /**
     * 为新一轮迭代设置计划
     * @param {string[]} planDescriptions
     */
    setNewPlanForIteration(planDescriptions) { this.subTasks = planDescriptions.map((desc, index) => ({ id: `task_iter${this.currentIteration}_${index + 1}`, description: desc, status: 'pending', result: null, error: null, })); }

    /** @returns {SubTask[]} 获取所有失败的子任务 */
    getFailedTasks() { return this.subTasks.filter(task => task.status === 'failed'); }

    /** @returns {SubTask | undefined} 获取下一个待处理的子任务 */
    getNextPendingTask() { return this.subTasks.find(task => task.status === 'pending'); }

    /**
     * 更新子任务的状态
     * @param {string} taskId
     * @param {'in_progress' | 'completed' | 'failed'} status
     * @param {string | null} [resultOrError]
     */
    updateTaskStatus(taskId, status, resultOrError = null) {
        const task = this.subTasks.find(t => t.id === taskId);
        if (task) { task.status = status; if (status === 'completed') { task.result = resultOrError; } else if (status === 'failed') { task.error = resultOrError; } }
    }

    /**
     * 归档当前迭代的结果
     * @param {string} artifact
     * @param {Evaluation} evaluation
     */
    archiveCurrentIteration(artifact, evaluation) { this.history.push({ iteration: this.currentIteration, artifact: artifact, evaluation: evaluation, subTasks: this.subTasks }); this.currentIteration++; }

    /** @returns {IterationHistory | null} 获取最近一次的迭代历史 */
    getLatestIteration() { return this.history.length > 0 ? this.history[this.history.length - 1] : null; }
}
module.exports = { TaskContext };
