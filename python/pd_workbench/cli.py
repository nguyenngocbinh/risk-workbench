"""CLI entry point used by the VS Code extension."""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd

# The VS Code extension launches this file by absolute path, so Python places
# python/pd_workbench on sys.path rather than its parent directory. Add the
# engine root explicitly to support both direct-script and module execution.
ENGINE_ROOT = Path(__file__).resolve().parent.parent
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from pd_workbench.audit import audit_dataframe
from pd_workbench.metrics import evaluate_binary, population_stability_index

def build_parser():
    parser=argparse.ArgumentParser(description="RiskWorkbench analytics engine")
    parser.add_argument("operation",choices=["audit","validate","psi"])
    parser.add_argument("--csv",required=True,help="Expected/input CSV file")
    parser.add_argument("--target",help="Binary target column (0/1)")
    parser.add_argument("--prediction",help="Predicted probability column in [0,1]")
    parser.add_argument("--cutoff",type=float,default=0.5)
    parser.add_argument("--expected-column",help="Numeric column in expected sample")
    parser.add_argument("--actual-csv",help="CSV containing actual sample")
    parser.add_argument("--actual-column",help="Numeric column in actual sample")
    return parser

def run(args):
    csv_path=Path(args.csv).expanduser().resolve()
    if not csv_path.is_file(): raise ValueError(f"Input CSV file does not exist: {csv_path}")
    frame=pd.read_csv(csv_path)
    if args.operation=="audit":
        result=audit_dataframe(frame,args.target)
    elif args.operation=="validate":
        if not args.target or not args.prediction: raise ValueError("Validation requires --target and --prediction.")
        for col in (args.target,args.prediction):
            if col not in frame.columns: raise ValueError(f"Column '{col}' was not found in the input CSV.")
        if frame[[args.target,args.prediction]].isna().any().any(): raise ValueError("Target or prediction contains missing values. Resolve them explicitly before validation.")
        result={"operation":"validate","target_column":args.target,"prediction_column":args.prediction,"metrics":evaluate_binary(frame[args.target].to_numpy(),frame[args.prediction].to_numpy(),args.cutoff)}
    else:
        if not args.expected_column or not args.actual_csv or not args.actual_column: raise ValueError("PSI requires --expected-column, --actual-csv, and --actual-column.")
        actual_path=Path(args.actual_csv).expanduser().resolve()
        if not actual_path.is_file(): raise ValueError(f"Actual-sample CSV does not exist: {actual_path}")
        if args.expected_column not in frame.columns: raise ValueError(f"Column '{args.expected_column}' was not found in expected CSV.")
        actual_frame=pd.read_csv(actual_path)
        if args.actual_column not in actual_frame.columns: raise ValueError(f"Column '{args.actual_column}' was not found in actual CSV.")
        result={"operation":"psi","expected_column":args.expected_column,"actual_column":args.actual_column,"metrics":population_stability_index(frame[args.expected_column],actual_frame[args.actual_column])}
    result["generated_at"]=datetime.now(timezone.utc).isoformat()
    result["input_file"]=csv_path.name
    result["engine_version"]="0.1.0"
    return result

def main(argv=None):
    args=build_parser().parse_args(argv)
    try:
        print(json.dumps(run(args),ensure_ascii=False,allow_nan=False))
        return 0
    except Exception as exc:
        print(f"RiskWorkbench error: {exc}",file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())
