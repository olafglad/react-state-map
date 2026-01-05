import * as vscode from 'vscode';
import { StateMapPanel } from './panels/StateMapPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('React State Map extension is now active');

  // Register the open panel command
  const openPanelCommand = vscode.commands.registerCommand(
    'reactStateMap.openPanel',
    () => {
      StateMapPanel.createOrShow(context.extensionUri);
    }
  );

  // Register the refresh command
  const refreshCommand = vscode.commands.registerCommand(
    'reactStateMap.refresh',
    () => {
      if (StateMapPanel.currentPanel) {
        StateMapPanel.currentPanel.refresh();
      } else {
        StateMapPanel.createOrShow(context.extensionUri);
      }
    }
  );

  context.subscriptions.push(openPanelCommand, refreshCommand);

  // Watch for file saves if auto-refresh is enabled
  const fileWatcher = vscode.workspace.onDidSaveTextDocument((document) => {
    const config = vscode.workspace.getConfiguration('reactStateMap');
    const autoRefresh = config.get<boolean>('autoRefresh', true);

    if (autoRefresh && StateMapPanel.currentPanel) {
      const fileName = document.fileName;
      if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx') ||
          fileName.endsWith('.ts') || fileName.endsWith('.js')) {
        StateMapPanel.currentPanel.refresh();
      }
    }
  });

  context.subscriptions.push(fileWatcher);
}

export function deactivate() {
  // Clean up
}
