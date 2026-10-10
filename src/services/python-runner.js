const vscode = require("vscode");
const path = require("node:path");
const {spawn}=require("node:child_process");

class PythonRunner {
  constructor(context){this.context=context;}
  async resolvePython(){
    const configured=vscode.workspace.getConfiguration("riskWorkbench").get("pythonPath","").trim();
    if(configured) return configured;
    try {
      const ext=vscode.extensions.getExtension("ms-python.python");
      if(ext){
        if(!ext.isActive) await ext.activate();
        const executable=ext.exports?.settings?.getExecutionDetails?.().execCommand?.[0];
        if(executable) return executable;
      }
    } catch {}
    return process.platform==="win32" ? "python" : "python3";
  }
  async run(payload){
    const python=await this.resolvePython();
    const script=path.join(this.context.extensionPath,"python","pd_workbench","cli.py");
    const args=[script,payload.operation,"--csv",payload.csv];
    if(payload.target) args.push("--target",payload.target);
    if(payload.prediction) args.push("--prediction",payload.prediction);
    if(payload.cutoff!==undefined) args.push("--cutoff",String(payload.cutoff));
    return new Promise((resolve,reject)=>{
      const child=spawn(python,args,{cwd:vscode.workspace.workspaceFolders?.[0]?.uri.fsPath||this.context.extensionPath,windowsHide:true,shell:false,env:{...process.env,PYTHONUTF8:"1"}});
      let stdout="",stderr="";
      const limit=10*1024*1024;
      child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
      child.stdout.on("data",chunk=>{stdout+=chunk;if(stdout.length>limit) child.kill();});
      child.stderr.on("data",chunk=>{stderr+=chunk;});
      child.on("error",error=>reject(new Error(`Unable to start Python (${python}): ${error.message}`)));
      child.on("close",code=>{
        if(code!==0){reject(new Error(stderr.trim()||`Python exited with code ${code}.`));return;}
        try{resolve(JSON.parse(stdout));}catch{reject(new Error("Python engine returned invalid JSON. Install the listed dependencies and ensure logs are written to stderr."));}
      });
    });
  }
}
module.exports={PythonRunner};
