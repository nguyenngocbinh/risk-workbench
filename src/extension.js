const vscode = require("vscode");
const path = require("node:path");
const { PythonRunner } = require("./services/python-runner");
const { DashboardProvider } = require("./providers/dashboard-provider");

function activate(context) {
  const runner = new PythonRunner(context);
  const provider = new DashboardProvider(context.extensionUri);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider("riskWorkbench.dashboard", provider));

  context.subscriptions.push(vscode.commands.registerCommand("riskWorkbench.openDashboard", async () => {
    await vscode.commands.executeCommand("workbench.view.extension.riskWorkbench");
  }));

  context.subscriptions.push(vscode.commands.registerCommand("riskWorkbench.selectPython", async () => {
    const selected = await vscode.window.showInputBox({
      title: "Select Python executable",
      prompt: "Enter the full path to python.exe, or leave blank to use the VS Code-selected interpreter/PATH.",
      value: vscode.workspace.getConfiguration("riskWorkbench").get("pythonPath", ""),
      ignoreFocusOut: true
    });
    if (selected === undefined) return;
    await vscode.workspace.getConfiguration("riskWorkbench").update("pythonPath", selected.trim(), vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(selected.trim() ? "RiskWorkbench Python path updated." : "RiskWorkbench will resolve Python from VS Code/PATH.");
  }));

  context.subscriptions.push(vscode.commands.registerCommand("riskWorkbench.runDataAudit", async () => {
    const csv = await chooseCsv();
    if (!csv) return;
    const target = await askColumn("Target column (optional)", "DEFAULT_FLAG", true);
    if (target === undefined) return;
    await executeAndShow(runner, provider, {operation:"audit", csv, target:target || undefined});
  }));

  context.subscriptions.push(vscode.commands.registerCommand("riskWorkbench.validateModel", async () => {
    const csv = await chooseCsv();
    if (!csv) return;
    const cfg = vscode.workspace.getConfiguration("riskWorkbench");
    const target = await askColumn("Binary target column", cfg.get("defaultTargetColumn", "DEFAULT_FLAG"));
    if (target === undefined) return;
    const prediction = await askColumn("Predicted probability column", cfg.get("defaultPredictionColumn", "PD"));
    if (prediction === undefined) return;
    const cutoff = await vscode.window.showInputBox({
      title:"Classification cutoff", value:String(cfg.get("defaultCutoff", 0.5)),
      validateInput:value => Number.isFinite(Number(value)) && Number(value)>=0 && Number(value)<=1 ? null : "Enter a number between 0 and 1."
    });
    if (cutoff === undefined) return;
    await executeAndShow(runner, provider, {operation:"validate", csv, target, prediction, cutoff:Number(cutoff)});
  }));

  context.subscriptions.push(vscode.commands.registerCommand("riskWorkbench.generateReport", async () => {
    const result = provider.getLastResult();
    if (!result) { vscode.window.showWarningMessage("Run an audit or model validation first."); return; }
    const uri = await vscode.window.showSaveDialog({
      saveLabel:"Save RiskWorkbench report",
      filters:{"Markdown":["md"],"JSON":["json"]},
      defaultUri:vscode.workspace.workspaceFolders?.[0] ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "risk-workbench-report.md") : undefined
    });
    if (!uri) return;
    const content = path.extname(uri.fsPath).toLowerCase()===".json" ? JSON.stringify(result,null,2) : renderMarkdown(result);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content,"utf8"));
    vscode.window.showInformationMessage("RiskWorkbench report saved.");
  }));
}

async function chooseCsv() {
  const files = await vscode.window.showOpenDialog({canSelectMany:false,openLabel:"Select CSV data",filters:{"CSV files":["csv"]}});
  return files?.[0]?.fsPath;
}
async function askColumn(title,value,optional=false) {
  return vscode.window.showInputBox({title,value,prompt:optional ? "Leave blank to skip this check." : undefined,ignoreFocusOut:true,validateInput:text => !optional && !text.trim() ? "A column name is required." : null});
}
async function executeAndShow(runner,provider,payload) {
  await vscode.window.withProgress({location:vscode.ProgressLocation.Notification,title:payload.operation==="audit" ? "RiskWorkbench: auditing data" : "RiskWorkbench: validating model",cancellable:false},async()=>{
    try {
      const result=await runner.run(payload);
      provider.setResult(result);
      await vscode.commands.executeCommand("riskWorkbench.openDashboard");
      vscode.window.showInformationMessage("RiskWorkbench analysis completed.");
    } catch(error) { vscode.window.showErrorMessage(`RiskWorkbench failed: ${error.message}`); }
  });
}
function renderMarkdown(result) {
  return ["# RiskWorkbench Report","","- Operation: "+(result.operation||"analysis"),"- Generated at: "+(result.generated_at||"not recorded"),"","## Results","","```json",JSON.stringify(result,null,2),"```",""," > This report is an analytical aid, not a substitute for independent model validation.",""].join("\n");
}
function deactivate() {}
module.exports={activate,deactivate,renderMarkdown};
