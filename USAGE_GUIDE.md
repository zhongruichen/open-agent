# Multi-Agent Helper - Detailed Usage Guide

Welcome! This guide will walk you through configuring and using all the features of this extension to unleash the full potential of your AI team.

---

## Prerequisites

Before you begin, please make sure you have:
1.  **Installed the Extension:** Follow the instructions in [**INSTALL.md**](INSTALL.md) to build and install the extension.
2.  **Configured AI Models:** You must define at least one AI model in the VS Code settings (`multiAgent.models`) for the agents to work. The extension will not function without it.

---

## Table of Contents
1.  [Quick Start: Plugin Configuration](#1-quick-start-plugin-configuration)
2.  [Tutorial: Creating Your First Project](#2-tutorial-creating-your-first-project)
3.  [Advanced Tips & Best Practices](#3-advanced-tips--best-practices)

---

### 1. Quick Start: Plugin Configuration

Proper configuration is half the battle. This plugin's configuration is divided into two main parts: **Model Definitions** and **Role Assignments**.

**How to Open Settings:**
- Use the shortcut `Ctrl + ,` (or `Cmd + ,` on Mac) to open VS Code settings.
- In the search bar, type `Multi Agent Helper` to find the relevant settings.

#### **Part 1: Defining Available Models (`multiAgent.models`)**

This is a JSON array where you can define all the AI models you want your agent team to use.

- **Click `Edit in settings.json`**
- For each model, you need to add a JSON object with the following fields:
  - `name`: **(Required)** A **unique, memorable name** for this model configuration (e.g., "gpt-4-main"). This name will be used later in "Role Assignments".
  - `provider`: **(Required)** The model's provider. Currently supports `OpenAI`, `Anthropic`, `Google`, `Custom`.
  - `modelName`: **(Required)** The official name of the model you want to use (e.g., 'gpt-4-turbo-preview', 'claude-3-opus-20240229').
  - `apiKey`: **(Required)** The API key for the corresponding provider.
  - `baseUrl`: (Optional) The base URL for the API. This is very useful for custom or self-hosted models (like Ollama, LocalAI). You can leave it blank if using an official API.
  - `agentPrompt`: (Optional) A default global system prompt for any Agent using this model.

**Configuration Example:**
```json
"multiAgent.models": [
    {
        "name": "gpt-4-main",
        "provider": "OpenAI",
        "modelName": "gpt-4-1106-preview",
        "apiKey": "sk-YourOpenAI_API_Key_Here"
    },
    {
        "name": "claude-opus-creative",
        "provider": "Anthropic",
        "modelName": "claude-3-opus-20240229",
        "apiKey": "sk-ant-YourAnthropic_API_Key_Here"
    },
    {
        "name": "local-coder-model",
        "provider": "Custom",
        "modelName": "deepseek-coder-6.7b-instruct",
        "apiKey": "ollama", // For Ollama, the API key can be any string
        "baseUrl": "http://localhost:11434/v1"
    }
]
```

#### **Part 2: Assigning Models to Roles (`multiAgent.roleAssignments`)**

Here, you can assign one of your pre-defined models to each role in your AI team.

- **Click `Edit in settings.json`**
- This is a JSON object containing the following six keys:
  - `orchestrator`: **The Planner**. Responsible for thinking and breaking down tasks. **Recommended to use your most powerful model**.
  - `worker`: **The Worker**. Responsible for executing specific sub-tasks (like writing code, running commands). **Can use faster or more economical models**.
  - `synthesizer`: **The Integrator**. Responsible for combining scattered results into a complete product.
  - `evaluationTeam`: **The Evaluation Team**. An **array** of one or more model names that will evaluate the output in parallel, enabling "wisdom of the crowd".
  - `critiqueAggregator`: **The Critique Aggregator**. Responsible for receiving all feedback from the `evaluationTeam` and consolidating it into a final, unified review. **Recommended to use your most powerful model**.
  - `codebaseScanner`: **The Codebase Scanner**. Responsible for scanning project files and generating summaries before the task begins. **Recommended to use a very fast model** to reduce latency.

**Configuration Example:**
```json
"multiAgent.roleAssignments": {
    "orchestrator": "gpt-4-main",
    "worker": "local-coder-model",
    "synthesizer": "gpt-4-main",
    "evaluationTeam": [
        "claude-opus-creative",
        "gpt-4-main"
    ],
    "critiqueAggregator": "claude-opus-creative",
    "codebaseScanner": "local-coder-model"
}
```
*Tip: If a role is not assigned a model, the system will automatically use the first model defined in your `models` list as a fallback.*

---

### 2. Tutorial: Creating Your First Project

Let's walk through a concrete example: "**Create a simple HTML page with a button that shows a 'Hello, World!' alert when clicked.**"

#### **Step 1: Start the Task**
- Open the Command Palette (`Ctrl/Cmd + Shift + P`).
- Type and select `Start Multi-Agent Task`.

#### **Step 2: Give Your Instruction**
- In the input box that appears at the top of the screen, enter our goal:
  `Create a simple HTML page with a button that shows a 'Hello, World!' alert when clicked.`
- Press Enter.

#### **Step 3: Observe the AI Team at Work**
- A new **UI Panel** titled "Multi-Agent Status" will open automatically. This is your main window into the AI's operations.
- You will see:
  - The **Overall Goal** you provided.
  - The **Current Plan**, with status icons for each step (pending, in-progress, completed, failed).
  - A real-time **Execution Log** showing which agent is working and what they are doing.
  - The **Final Artifact** as it's being built and refined.
- You can also open the "Output" panel and select "多智能体日志" to see more detailed, raw logs.

#### **Step 4: Interact with the AI Team**
During the workflow, the agents may pause and ask for your approval:
- **Terminal Command Review:** If an agent needs to run a command like `npm install`, a yellow warning dialog will appear, showing the full command and asking you to "Approve".
- **Refinement Loop Review:** After a full "Plan -> Execute -> Evaluate" cycle, if the resulting score is less than 10, a blue info dialog will show you the score and suggestions, asking if you want to "Continue" with optimization.

#### **Step 5: Review the Final Report**
- When the loop ends (by reaching a score of 10 or because you chose to terminate), a new tab named `Multi-Agent Task Report` will open automatically.
- This detailed Markdown report includes:
  - Your original request.
  - The final score and summary.
  - A **detailed history of each iteration**, including the score, suggestions received, and the full artifact produced in that round.

---

### 3. Advanced Tips & Best Practices

- **The Value of Good Models:** Assigning your most powerful models to the `orchestrator`, `evaluationTeam`, and `critiqueAggregator` roles is the most effective way to improve the team's performance.
- **Clear Instructions:** The clearer and more specific your initial goal, the better the AI's initial plan will be, leading to faster and more accurate results.
- **Trust, but Verify:** Always read terminal commands carefully before approving them to ensure they match your expectations.
- **Embrace Iteration:** If the first version isn't perfect, let the system run for another one or two refinement cycles. The results often improve dramatically.

---

Thank you for using the extension! We hope this AI team becomes your trusted programming assistant.
