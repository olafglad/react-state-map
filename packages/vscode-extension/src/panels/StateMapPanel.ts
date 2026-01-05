import * as vscode from 'vscode';
import { ReactParser, serializeGraph, GraphAnalyzer } from '@react-state-map/core';
import type { SerializedStateFlowGraph } from '@react-state-map/core';
import { getWebviewContent } from './webviewContent';

export class StateMapPanel {
  public static currentPanel: StateMapPanel | undefined;
  public static readonly viewType = 'reactStateMap';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _debounceTimer: NodeJS.Timeout | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set initial content
    this._update();

    // Handle panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables
    );

    // Update when panel becomes visible
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel exists, show it
    if (StateMapPanel.currentPanel) {
      StateMapPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      StateMapPanel.viewType,
      'React State Map',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    StateMapPanel.currentPanel = new StateMapPanel(panel, extensionUri);
  }

  public refresh() {
    // Debounce refresh calls
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this._update();
    }, 300);
  }

  public dispose() {
    StateMapPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private async _update() {
    const webview = this._panel.webview;

    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      webview.html = this._getErrorHtml('No workspace folder open');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;

    try {
      // Get configuration
      const config = vscode.workspace.getConfiguration('reactStateMap');
      const drillingThreshold = config.get<number>('drillingThreshold', 3);
      const exclude = config.get<string[]>('exclude', ['**/node_modules/**', '**/dist/**']);
      const include = config.get<string[]>('include', ['**/*.tsx', '**/*.jsx']);

      // Parse the project
      const parser = new ReactParser({
        rootDir: rootPath,
        drillingThreshold,
        exclude,
        include,
      });

      const result = parser.parse();
      const graph = serializeGraph(result.graph);
      const analyzer = new GraphAnalyzer(result.graph);
      const summary = analyzer.getSummary();

      // Update webview
      webview.html = getWebviewContent(graph, summary, result.warnings);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      webview.html = this._getErrorHtml(`Error parsing project: ${message}`);
    }
  }

  private _handleMessage(message: { command: string; filePath?: string; line?: number }) {
    switch (message.command) {
      case 'openFile':
        if (message.filePath) {
          this._openFile(message.filePath, message.line);
        }
        break;
      case 'refresh':
        this.refresh();
        break;
    }
  }

  private async _openFile(filePath: string, line?: number) {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
      });

      if (line !== undefined && line > 0) {
        const position = new vscode.Position(line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
    }
  }

  private _getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: var(--vscode-font-family);
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .error {
      text-align: center;
      padding: 20px;
    }
    .error h2 {
      color: var(--vscode-errorForeground);
    }
  </style>
</head>
<body>
  <div class="error">
    <h2>Error</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
  }
}
