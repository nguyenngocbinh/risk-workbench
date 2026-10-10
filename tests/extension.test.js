const test = require("node:test");
const assert = require("node:assert/strict");
const { renderMarkdown, renderHtmlReport } = require("../src/report");
const { escapeHtml } = require("../src/providers/dashboard-provider");

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
