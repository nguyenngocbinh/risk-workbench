import json
import subprocess
import sys
from pathlib import Path
import pandas as pd
import pytest
from pd_workbench.audit import audit_dataframe

def test_audit_missing_and_duplicate_rows():
    result=audit_dataframe(pd.DataFrame({"x":[1,1,None],"target":[0,0,1]}),"target")
    assert result["n_rows"]==3
    assert result["duplicate_row_count"]==1
    assert result["columns"][0]["missing_count"]==1
    assert result["target"]["class_counts"]["0"]==2

def test_audit_missing_target_raises():
    with pytest.raises(ValueError,match="not found"): audit_dataframe(pd.DataFrame({"x":[1]}),"missing")

def test_cli_json_output(tmp_path):
    source=tmp_path/"sample.csv"
    pd.DataFrame({"y":[0,0,1,1],"pd":[0.1,0.2,0.7,0.9]}).to_csv(source,index=False)
    root=Path(__file__).resolve().parents[1]
    proc=subprocess.run([sys.executable,"-m","pd_workbench.cli","validate","--csv",str(source),"--target","y","--prediction","pd"],cwd=root.parent,capture_output=True,text=True,check=False)
    assert proc.returncode==0,proc.stderr
    body=json.loads(proc.stdout)
    assert body["metrics"]["gini"]==pytest.approx(1.0)
