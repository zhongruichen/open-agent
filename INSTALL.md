# Installation Guide

This guide provides instructions on how to package the Multi-Agent Helper extension into an installable `.vsix` file and install it in Visual Studio Code.

## Prerequisites

- **Node.js and npm:** You must have Node.js (which includes npm) installed on your system. You can download it from [nodejs.org](https://nodejs.org/).
- **Visual Studio Code:** The editor must be installed.

## Installation Steps

Follow these steps from your terminal in the root directory of this project.

### 1. Install Dependencies

First, you need to install all the required project dependencies.

```bash
npm install
```

### 2. Package the Extension

Next, run the custom script to bundle the extension and package it into a `.vsix` file. This file is the installable extension package.

```bash
npm run package-vsix
```

This command will first compile the project and then use `vsce` to create a file named something like `multi-agent-helper-2.2.0.vsix` in the root directory.

### 3. Install the `.vsix` File in VS Code

You can install the packaged extension in two ways:

#### A) Using the Command Line

The easiest way is to use the `code` command-line tool that comes with VS Code.

```bash
code --install-extension multi-agent-helper-2.2.0.vsix
```
*(Replace `multi-agent-helper-2.2.0.vsix` with the actual name of the file created in the previous step.)*

#### B) Using the VS Code UI

1.  Open Visual Studio Code.
2.  Go to the **Extensions** view by clicking the icon in the sidebar or pressing `Ctrl+Shift+X`.
3.  Click the **...** (More Actions) button at the top of the Extensions view.
4.  Select **Install from VSIX...**.
5.  In the file dialog that opens, navigate to the project's root directory and select the `.vsix` file you created.
6.  Click **Install**.

### 4. Reload VS Code

After the installation is complete, you may need to reload VS Code for the extension to be activated.

---

You are now ready to use the extension! For instructions on how to configure and use it, please see the [**USAGE_GUIDE.md**](USAGE_GUIDE.md).
