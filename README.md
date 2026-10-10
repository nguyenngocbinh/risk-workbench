# RiskWorkbench

**Credit Risk Modeling & Validation for VS Code**

RiskWorkbench is a local-first Visual Studio Code extension for credit-risk model development, validation, and monitoring. The initial MVP provides data-quality audit, binary classification metrics, PSI, and HTML/Markdown-ready JSON outputs using a Python analytics engine.

> Status: early MVP. Results are analytical aids, not regulatory approval or a substitute for independent model validation.

## Features in 0.1.0

- VS Code sidebar and commands for data audit, model validation, and report generation.
- Python CLI engine with deterministic JSON output.
- Data checks: row count, duplicate rows, missing values, and target prevalence.
- Binary metrics: ROC AUC, Gini, KS, Brier score, and confusion matrix at a configurable cutoff.
- Population Stability Index (PSI) for numeric values.
- GitHub Actions to test the Python engine and JavaScript extension, then package a VSIX artifact.
- Local-first processing: data are not sent to a remote service by the extension.

## Requirements

- Visual Studio Code (version 1.85 or newer).
- Node.js 20 or newer to develop/package the extension.
- Python 3.10 or newer, with `pandas` and `numpy` installed in a selected environment.

## Quick start

1. Clone this repository and open it in VS Code.
2. Run `npm install`.
3. Select your Python interpreter using **RiskWorkbench: Select Python Interpreter** or set `riskWorkbench.pythonPath`.
4. Install Python dependencies in that interpreter:

   ```powershell
   python -m pip install -r python/requirements.txt
   ```

5. Press `F5` to launch an Extension Development Host.
6. Use the RiskWorkbench view or Command Palette (`Ctrl+Shift+P`) to run an audit or validation.

### Input format

CSV input is supported in the first MVP. Validation requires a binary target column (`0`/`1`) and a numeric probability/prediction column between 0 and 1. Example:

```csv
PROCESS_DATE,CUSTOMER_ID,DEFAULT_FLAG,PD
2026-01-31,C001,0,0.012
2026-01-31,C002,1,0.430
2026-02-28,C003,0,0.025
```

Do not use real customer data in public examples, issues, or screenshots. Use synthetic or properly anonymized data.

## Commands

- `RiskWorkbench: Open Dashboard`
- `RiskWorkbench: Select Python Interpreter`
- `RiskWorkbench: Run Data Audit`
- `RiskWorkbench: Validate Model`
- `RiskWorkbench: Generate Report`

## Build a VSIX locally

```powershell
npm ci
npm test
python -m pip install -r python/requirements-dev.txt
python -m pytest python/tests -q
npx @vscode/vsce package
```

The packaged file is named like `risk-workbench-0.1.0.vsix`. Install it using:

```powershell
code --install-extension .\risk-workbench-0.1.0.vsix
```

## Configuration

- `riskWorkbench.pythonPath`: optional explicit Python executable path. Leave empty to use the VS Code-selected interpreter or `python` from PATH.
- `riskWorkbench.defaultTargetColumn`: default label for validation.
- `riskWorkbench.defaultPredictionColumn`: default predicted-probability column.
- `riskWorkbench.defaultCutoff`: threshold used for confusion-matrix metrics.

## Design and limitations

- Local-first; no telemetry or external API calls are implemented by this MVP.
- The extension invokes a Python CLI as a subprocess and exchanges structured JSON.
- AUC/Gini/KS are only meaningful with suitable target and score data. Small samples and single-class targets are rejected or clearly reported.
- PSI uses fixed numeric bins and a small smoothing value; the configuration and binning method must be reviewed before using results for formal validation.
- This tool does not certify compliance with IFRS 9, IRB, or any regulatory standard.

## Development

```powershell
npm install
npm test
python -m pip install -r python/requirements-dev.txt
python -m pytest python/tests -q
```

## License

MIT. See [LICENSE](LICENSE).

## Contributing

Issues and pull requests are welcome. Please include reproducible tests and never attach confidential bank/customer data.
