import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "multi-agent-helper" is now active!');

	let disposable = vscode.commands.registerCommand('multi-agent-helper.startTask', () => {
		vscode.window.showInformationMessage('Hello from Multi Agent Helper!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
