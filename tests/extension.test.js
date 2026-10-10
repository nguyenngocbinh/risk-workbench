const test = require("node:test");
const assert = require("node:assert/strict");
const { renderMarkdown, renderHtmlReport } = require("../src/report");
const { DashboardProvider, escapeHtml } = require("../src/providers/dashboard-provider");

test("renderMarkdown includes JSON result and disclaimer", () => {
  const content = renderMarkdown({ operation: "audit", n_rows: 12 });
  assert.match(content, /RiskWorkbench Report/);
  assert.match(content, /"n_rows": 12/);
  assert.match(content, /substitute for independent model validation/);
});

test("escapeHtml prevents webview HTML injection", () => {
  assert.equal(escapeHtml("<script>&'\""), "&lt;script&gt;&amp;&#39;&quot;");
});

test("renderHtmlReport creates a standalone HTML report and escapes data", () => {
  const content = renderHtmlReport({
    operation: "audit <script>",
    generated_at: "2026-10-10",
    note: "</pre><script>alert(1)</script>"
  });
  assert.match(content, /<!DOCTYPE html>/);
  assert.match(content, /RiskWorkbench Model Validation Report/);
  assert.match(content, /audit &lt;script&gt;/);
  assert.match(content, /&lt;\/pre&gt;&lt;script&gt;/);
  assert.match(content, /independent model validation/);
});

test("dashboard renders the visual validation report instead of raw JSON", () => {
  const dashboard = new DashboardProvider();
  dashboard.setResult({
    operation: "validate",
    generated_at: "2026-10-10",
    input_file: "validation.csv",
    metrics: {
      n_rows: 4,
      default_rate: 0.5,
      roc_auc: 1,
      gini: 1,
      ks: 1,
      brier_score: 0.025,
      cutoff: 0.5,
      accuracy: 1,
      precision: 1,
      recall: 1,
      specificity: 1,
      f1_score: 1,
      confusion_matrix: { tn: 2, fp: 0, fn: 0, tp: 2 },
      roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }],
      cumulative_gain: [{ population_share: 0, positive_capture: 0 }, { population_share: 1, positive_capture: 1 }],
      prediction_distribution: { bin_edges: [0, 0.5, 1], non_default_counts: [2, 0], default_counts: [0, 2] }
    }
  });
  const html = dashboard.renderHtml();
  assert.match(html, /ROC Curve/);
  assert.match(html, /Confusion Matrix/);
  assert.match(html, /Prediction Distribution/);
  assert.match(html, /Cumulative Gain/);
  assert.doesNotMatch(html, /<pre>\s*\{/);
});
