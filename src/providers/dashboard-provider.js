class DashboardProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.view = undefined;
    this.panel = undefined;
    this.lastResult = undefined;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: false };
    webviewView.webview.html = this.renderHtml();
    webviewView.onDidDispose(() => {
      if (this.view === webviewView) this.view = undefined;
    });
  }

  openPanel() {
    // Load the VS Code API only when a panel is actually opened. This keeps
    // pure rendering helpers importable in Node.js unit tests and CLI tooling.
    const vscode = require("vscode");
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      this.panel.webview.html = this.renderHtml();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "riskWorkbench.dashboardPanel",
      "RiskWorkbench Dashboard",
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    this.panel.webview.html = this.renderHtml();
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  setResult(result) {
    this.lastResult = result;
    if (this.view) this.view.webview.html = this.renderHtml();
    if (this.panel) this.panel.webview.html = this.renderHtml();
  }

  getLastResult() {
    return this.lastResult;
  }

  renderHtml() {
    const result = this.lastResult;
    const body = result
      ? `<h2>Latest run</h2><p class="muted">Operation: ${escapeHtml(result.operation || "analysis")}</p><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>`
      : `<div class="empty"><div class="mark">RW</div><h2>RiskWorkbench</h2><p>Credit risk modeling &amp; validation</p><p class="muted">Run an audit or model validation from the Command Palette.</p><ul><li>Data quality audit</li><li>Gini, AUC, KS and Brier score</li><li>Population Stability Index (engine/CLI)</li><li>Markdown/JSON report export</li></ul></div>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><title>RiskWorkbench</title><style>
:root{color-scheme:dark;--accent:#f59e0b;--muted:var(--vscode-descriptionForeground)}body{padding:18px;font-family:var(--vscode-font-family);color:var(--vscode-foreground);max-width:1100px;margin:0 auto}.mark{display:grid;place-items:center;width:46px;height:46px;border-radius:12px;background:#17243a;color:var(--accent);font-weight:800;font-size:18px}h2{font-weight:600;font-size:18px;margin-top:16px}.muted{color:var(--muted)}pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:14px;border-radius:8px;background:var(--vscode-textCodeBlock-background);font-size:12px;line-height:1.5}.empty{padding-top:10px}li,p{line-height:1.65}ul{padding-left:20px}</style></head><body>${body}</body></html>`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

module.exports = { DashboardProvider, escapeHtml };
