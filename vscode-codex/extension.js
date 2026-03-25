const vscode = require('vscode');

class CodexViewProvider {
  constructor(context) {
    this._context = context;
  }

  resolveWebviewView(webviewView, context, token) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();
  }

  _getHtml() {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Codex</title>
    <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:12px}</style>
  </head>
  <body>
    <h2>Codex</h2>
    <p>This is a minimal Codex Activity Bar view. Replace this content with your extension UI.</p>
    <button id="ping">Ping</button>
    <script>
      const vscode = acquireVsCodeApi();
      document.getElementById('ping').addEventListener('click', () => {
        vscode.postMessage({ type: 'ping' });
      });
    </script>
  </body>
</html>`;
  }
}

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const provider = new CodexViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codex.view', provider)
  );

  // simple command to reveal the view
  context.subscriptions.push(
    vscode.commands.registerCommand('codex.reveal', () => {
      vscode.commands.executeCommand('workbench.view.codex');
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
