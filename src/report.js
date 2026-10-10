function renderMarkdown(result) {
  return [
    "# RiskWorkbench Report",
    "",
    "- Operation: " + (result.operation || "analysis"),
    "- Generated at: " + (result.generated_at || "not recorded"),
    "",
    "## Results",
    "",
    "```json",
    JSON.stringify(result, null, 2),
    "```",
    "",
    "> This report is an analytical aid, not a substitute for independent model validation.",
    ""
  ].join("\n");
}

module.exports = { renderMarkdown };
