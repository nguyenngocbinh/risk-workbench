const { renderHtmlReport } = require("../report");

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
    if (this.lastResult) return renderHtmlReport(this.lastResult);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><title>RiskWorkbench Dashboard</title><style>
:root{color-scheme:dark;--bg:#101416;--panel:#191e21;--line:#30383c;--text:#eef2f3;--muted:#a8b1b5;--orange:#f28a43;--green:#62c879}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 "Segoe UI",Arial,sans-serif}main{max-width:1100px;margin:30px auto;padding:22px}.hero{background:var(--panel);border:1px solid var(--line);border-bottom:3px solid var(--orange);padding:26px;border-radius:10px}.mark{color:var(--orange);font-weight:800;letter-spacing:.12em;font-size:12px}h1{margin:8px 0;font-size:26px}.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:16px}.card{padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:8px}.card h2{font-size:15px;margin:0 0 8px}.card p{margin:0;color:var(--muted);font-size:13px}code{color:var(--green)}</style></head><body><main><section class="hero"><div class="mark">CREDIT RISK ANALYTICS</div><h1>RiskWorkbench Dashboard</h1><p class="muted">Model development, validation and data quality.</p><p>Choose a command from the Command Palette to populate this dashboard.</p></section><section class="grid"><div class="card"><h2>Data Quality Audit</h2><p>Inspect missing values, duplicate records, target distribution and data warnings.</p></div><div class="card"><h2>Model Validation</h2><p>ROC AUC, Gini, KS, Brier score, classification metrics and confusion matrix.</p></div><div class="card"><h2>Visual Report</h2><p>Run validation, then use <code>RiskWorkbench: Generate Report</code> to save a standalone HTML report.</p></div></section></main></body></html>`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

module.exports = { DashboardProvider, escapeHtml };
