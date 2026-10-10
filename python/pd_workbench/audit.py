"""Input-data quality checks."""
import pandas as pd

def audit_dataframe(frame: pd.DataFrame, target: str | None = None) -> dict:
    if frame.empty: raise ValueError("CSV contains no data rows.")
    columns=[]
    for name in frame.columns:
        series=frame[name]
        columns.append({"name":str(name),"dtype":str(series.dtype),"missing_count":int(series.isna().sum()),"missing_pct":float(series.isna().mean()),"unique_count":int(series.nunique(dropna=True))})
    result={"operation":"audit","n_rows":int(len(frame)),"n_columns":int(len(frame.columns)),"duplicate_row_count":int(frame.duplicated().sum()),"columns":columns,"warnings":[]}
    if target:
        if target not in frame.columns: raise ValueError(f"Target column '{target}' was not found.")
        s=frame[target]
        result["target"]={"column":target,"missing_count":int(s.isna().sum()),"class_counts":{str(k):int(v) for k,v in s.value_counts(dropna=False).items()}}
        values=set(s.dropna().unique().tolist())
        if not values.issubset({0,1,0.0,1.0,False,True}): result["warnings"].append("Target values are not strictly binary 0/1; confirm label definition before validation.")
        if s.isna().any(): result["warnings"].append("Target contains missing values.")
    high=[c["name"] for c in columns if c["missing_pct"]>=0.5]
    if high: result["warnings"].append("Columns with at least 50% missing values: "+", ".join(high))
    if result["duplicate_row_count"]: result["warnings"].append("Duplicate rows detected; confirm whether duplicates are valid observations.")
    return result
