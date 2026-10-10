function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderMarkdown(result) {
  return ["# RiskWorkbench Report", "", "- Operation: " + (result.operation || "analysis"), "- Generated at: " + (result.generated_at || "not recorded"), "", "## Results", "", "```json", JSON.stringify(result, null, 2), "```", "", "> This report is an analytical aid, not a substitute for independent model validation.", ""].join("\n");
}
function fmt(value, digits = 4) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(digits);
}
function linePath(points, xKey, yKey, width = 360, height = 220, pad = 28) {
  if (!Array.isArray(points) || points.length < 2) return "";
  return points.map((p, i) => {
    const x = pad + Math.max(0, Math.min(1, Number(p[xKey]) || 0)) * (width - pad * 2);
    const y = height - pad - Math.max(0, Math.min(1, Number(p[yKey]) || 0)) * (height - pad * 2);
    return (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
  }).join(" ");
}
function chartSvg(points, xKey, yKey, labelX, labelY, baseline = false) {
  const w = 360, h = 220, p = 28;
  const path = linePath(points, xKey, yKey, w, h, p);
  const grid = [0, .25, .5, .75, 1].map(v => {
    const x = p + v * (w - 2 * p), y = h - p - v * (h - 2 * p);
    return `<path class="grid" d="M${x} ${p} V${h-p} M${p} ${y} H${w-p}"/><text class="tick" x="${x}" y="${h-8}" text-anchor="middle">${Math.round(v*100)}%</text><text class="tick" x="22" y="${y+3}" text-anchor="end">${Math.round(v*100)}%</text>`;
  }).join("");
  const random = baseline ? `<path d="M${p} ${h-p} L${w-p} ${p}" class="random"/>` : "";
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(labelY)} by ${escapeHtml(labelX)}">${grid}${random}<path class="curve" d="${path}"/><text class="axis" x="${w/2}" y="${h-1}" text-anchor="middle">${escapeHtml(labelX)}</text><text class="axis" transform="translate(10 ${h/2}) rotate(-90)" text-anchor="middle">${escapeHtml(labelY)}</text></svg>`;
}
function renderHtmlReport(result) {
  const metrics = result.metrics || result;
  const cm = metrics.confusion_matrix || {};
  const hasValidation = result.operation === "validate" || metrics.roc_auc !== undefined;
  const cards = [
    ["ROC AUC", fmt(metrics.roc_auc)], ["Gini", fmt(metrics.gini)], ["KS", fmt(metrics.ks)],
    ["Accuracy", fmt(metrics.accuracy)], ["Precision", fmt(metrics.precision)], ["Recall / TPR", fmt(metrics.recall)],
    ["Specificity / TNR", fmt(metrics.specificity)], ["F1 Score", fmt(metrics.f1_score)], ["Brier Score", fmt(metrics.brier_score)]
  ];
  const cardHtml = cards.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
  const auditColumns = Array.isArray(result.columns) ? result.columns : [];
  const auditHtml = `<section class="metrics audit-metrics">
    <div class="metric"><span>Rows scanned</span><strong>${fmt(result.n_rows,0)}</strong></div>
    <div class="metric"><span>Columns</span><strong>${fmt(result.n_columns ?? auditColumns.length,0)}</strong></div>
    <div class="metric"><span>Duplicate rows</span><strong>${fmt(result.duplicate_row_count,0)}</strong></div>
    <div class="metric"><span>Columns with missing data</span><strong>${auditColumns.filter(c => Number(c.missing_count) > 0).length}</strong></div>
    <div class="metric"><span>Warnings</span><strong>${Array.isArray(result.warnings) ? result.warnings.length : 0}</strong></div>
  </section>
  <div class="top">
    <section class="panel"><h2>Data Quality Overview</h2>
      <p>Rows scanned: <strong>${fmt(result.n_rows,0)}</strong></p>
      <p>Duplicate rows: <strong>${fmt(result.duplicate_row_count,0)}</strong></p>
      <p>Columns with missing values: <strong>${auditColumns.filter(c => Number(c.missing_count) > 0).length}</strong> / ${auditColumns.length}</p>
      ${result.target ? `<p>Target column: <strong>${escapeHtml(result.target.column || "")}</strong></p><p>Target missing values: <strong>${fmt(result.target.missing_count,0)}</strong></p>` : '<p class="hint">No target column selected for this audit.</p>'}
    </section>
    <section class="panel"><h2>Audit Warnings</h2>
      ${Array.isArray(result.warnings) && result.warnings.length ? `<ul class="audit-warnings">${result.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join("")}</ul>` : '<p class="hint">No data-quality warnings were reported.</p>'}
    </section>
  </div>
  <section class="panel audit-table-panel"><h2>Column-level Data Quality</h2>
    <div class="table-wrap"><table><thead><tr><th>Column</th><th>Type</th><th>Missing</th><th>Missing %</th><th>Unique values</th><th>Missingness</th></tr></thead><tbody>
    ${auditColumns.map(c => { const pct = Math.max(0, Math.min(100, Number(c.missing_pct) * 100 || 0)); return `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.dtype)}</td><td>${fmt(c.missing_count,0)}</td><td>${fmt(pct,1)}%</td><td>${fmt(c.unique_count,0)}</td><td><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></td></tr>`; }).join("")}
    </tbody></table></div>
  </section>`;
  const matrix = `<div class="matrix"><div></div><div class="mh">Predicted −</div><div class="mh">Predicted +</div><div class="mh">Actual −</div><div class="tn"><strong>${cm.tn ?? "—"}</strong><span>TN</span></div><div class="fp"><strong>${cm.fp ?? "—"}</strong><span>FP</span></div><div class="mh">Actual +</div><div class="fn"><strong>${cm.fn ?? "—"}</strong><span>FN</span></div><div class="tp"><strong>${cm.tp ?? "—"}</strong><span>TP</span></div></div>`;
  const roc = Array.isArray(metrics.roc_curve) ? chartSvg(metrics.roc_curve, "fpr", "tpr", "False Positive Rate", "True Positive Rate", true) : '<p class="hint">ROC coordinates are not available in this result. Run model validation with the updated engine.</p>';
  const gain = Array.isArray(metrics.cumulative_gain) ? chartSvg(metrics.cumulative_gain.map(p => ({x:p.population_share,y:p.positive_capture})), "x", "y", "Population selected", "Positive captured", true) : '<p class="hint">Cumulative gain data is not available in this result.</p>';
  let distribution = '<p class="hint">Prediction distribution is available after running validation with the updated engine.</p>';
  const dist = metrics.prediction_distribution;
  if (dist && Array.isArray(dist.bin_edges)) {
    const neg = dist.non_default_counts || [], pos = dist.default_counts || [];
    const max = Math.max(1, ...neg, ...pos), bars = neg.map((n,i) => {
      const x = 30 + i * 15, nh = n / max * 125, ph = (pos[i] || 0) / max * 125;
      return `<rect x="${x}" y="${155-nh}" width="6" height="${nh}" fill="#39865b" opacity=".8"/><rect x="${x+6}" y="${155-ph}" width="6" height="${ph}" fill="#8b3fb0" opacity=".85"/>`;
    }).join("");
    distribution = `<svg viewBox="0 0 350 190" role="img" aria-label="Prediction distribution"><path class="grid" d="M30 30 V155 H330"/>${bars}<text class="axis" x="180" y="184" text-anchor="middle">Predicted probability (0–1)</text><text class="axis" transform="translate(12 95) rotate(-90)" text-anchor="middle">Count</text></svg><p class="legend"><span class="green-dot"></span> Non-default <span class="purple-dot"></span> Default</p>`;
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RiskWorkbench Model Validation Report</title><style>
:root{color-scheme:dark;--bg:#101416;--panel:#191e21;--line:#30383c;--text:#eef2f3;--muted:#a8b1b5;--orange:#f28a43;--green:#62c879;--purple:#7a2d98}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 "Segoe UI",Arial,sans-serif}main{max-width:1600px;margin:0 auto;padding:22px}header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 22px;border:1px solid var(--line);background:var(--panel)}h1{font-size:22px;margin:0}h2{font-size:17px;margin:0 0 14px}.sub,.hint{color:var(--muted);font-size:12px}.metrics{display:grid;grid-template-columns:repeat(9,minmax(90px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin-top:12px}.metric{background:var(--panel);padding:14px 10px;min-height:86px;display:flex;flex-direction:column;justify-content:space-between}.metric span{color:var(--muted);font-size:11px}.metric strong{font-size:19px}.top{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.panel{min-width:0;background:var(--panel);border:1px solid var(--line);padding:18px}.matrix{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;text-align:center}.matrix>div{padding:13px 6px}.mh{font-size:11px;color:var(--muted);background:#202629}.tn,.fp,.fn,.tp{display:flex;flex-direction:column;gap:5px;justify-content:center}.tn{background:#252b2e}.fp{background:#64227e}.fn{background:#276846}.tp{background:#39865b}.matrix strong{font-size:18px}.matrix span{font-size:11px;opacity:.85}svg{width:100%;height:auto;display:block;margin-top:8px}.grid{stroke:#343d41;stroke-width:1;fill:none}.curve{fill:none;stroke:var(--green);stroke-width:3;stroke-linejoin:round;stroke-linecap:round}.random{fill:none;stroke:#7c8589;stroke-width:1.5;stroke-dasharray:5 4}.tick{fill:var(--muted);font-size:10px}.axis{fill:var(--muted);font-size:10px}.charts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}.legend{color:var(--muted);font-size:12px}.green-dot,.purple-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 5px 0 10px}.green-dot{background:#39865b}.purple-dot{background:#8b3fb0}details{margin-top:12px;background:var(--panel);border:1px solid var(--line);padding:14px}summary{cursor:pointer;color:var(--orange)}pre{white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;color:#d8e0e2;font-size:11px}.audit-metrics{grid-template-columns:repeat(5,minmax(100px,1fr))}.audit-table-panel{margin-top:12px}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:12px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:600}td:first-child{font-weight:600}.bar-track{height:8px;min-width:80px;background:#30383c;border-radius:4px;overflow:hidden}.bar-fill{height:100%;background:var(--orange);border-radius:4px}.audit-warnings{padding-left:20px}.audit-warnings li{margin:8px 0;color:var(--orange)}.disclaimer{color:var(--muted);font-size:11px;margin:18px 2px}@media(max-width:1050px){.metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.charts{grid-template-columns:1fr}.top{grid-template-columns:1fr}}@media print{body{background:#fff;color:#111}.panel,.metric,header,details{break-inside:avoid}.charts{grid-template-columns:repeat(3,1fr)}main{padding:0;max-width:none}.sub,.hint,.tick,.axis,.legend{color:#444}}
</style></head><body><main><header><div><h1>RiskWorkbench · Model Validation</h1><div class="sub">${escapeHtml(result.input_file || "Input data")} · ${escapeHtml(result.generated_at || "Timestamp not recorded")}</div></div><div class="sub" data-operation="${escapeHtml(result.operation || "analysis")}">${escapeHtml(result.operation || "analysis").toUpperCase()} · Engine ${escapeHtml(result.engine_version || "0.1.0")}</div></header>
${result.note ? `<p class="hint">${escapeHtml(result.note)}</p>` : ""}${hasValidation ? `<section class="metrics">${cardHtml}</section><div class="top"><section class="panel"><h2>Confusion Matrix</h2>${matrix}<p class="hint">Cutoff: ${fmt(metrics.cutoff,3)} · Total rows: ${metrics.n_rows ?? "—"}</p></section><section class="panel"><h2>Selection Summary</h2><p>Default rate: <strong>${fmt(metrics.default_rate*100,2)}%</strong></p><p>Classification threshold: <strong>${fmt(metrics.cutoff,3)}</strong></p><p class="hint">Positive class is target = 1. Metric values are computed from the selected threshold.</p></section></div><div class="charts"><section class="panel"><h2>ROC Curve</h2>${roc}<p class="hint">AUC ${fmt(metrics.roc_auc)} · KS ${fmt(metrics.ks)}</p></section><section class="panel"><h2>Prediction Distribution</h2>${distribution}</section><section class="panel"><h2>Cumulative Gain</h2>${gain}<p class="hint">Ranked from highest predicted probability to lowest.</p></section></div>` : result.operation === "audit" ? auditHtml : `<section class="panel"><h2>Analysis Summary</h2><p class="hint">No visual metrics are available for this result. Run model validation for ROC AUC, Gini, KS and validation charts, or run a data audit for column-level quality diagnostics.</p></section>`}
<p class="disclaimer">Analytical aid only; not a substitute for independent model validation. Verify data definitions, target window, sample selection and approved cutoff before decisioning.</p></main></body></html>`;
}
module.exports = { renderMarkdown, renderHtmlReport, escapeHtml };
