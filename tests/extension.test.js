const test = require("node:test");
const assert = require("node:assert/strict");
const { renderMarkdown } = require("../src/report");
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
