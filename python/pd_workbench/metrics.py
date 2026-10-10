"""Validation metrics for binary default outcomes and predicted probabilities."""
from __future__ import annotations
import numpy as np

def _validate_binary_inputs(y_true, y_prob):
    y_raw = np.asarray(y_true)
    p = np.asarray(y_prob, dtype=float)
    if y_raw.ndim != 1 or p.ndim != 1 or len(y_raw) != len(p):
        raise ValueError("Target and prediction must be one-dimensional arrays of equal length.")
    if len(y_raw) == 0:
        raise ValueError("At least one row is required.")
    if not np.isin(y_raw, [0, 1, False, True]).all():
        raise ValueError("Target column must contain only binary values 0 and 1.")
    y = y_raw.astype(int)
    if not np.isfinite(p).all() or ((p < 0) | (p > 1)).any():
        raise ValueError("Predicted probabilities must be finite values between 0 and 1.")
    if np.unique(y).size != 2:
        raise ValueError("Target must contain both classes 0 and 1 to calculate ranking metrics.")
    return y, p

def roc_auc_score(y_true, y_prob) -> float:
    """ROC AUC via average ranks (Mann–Whitney form), including tied predictions."""
    y, p = _validate_binary_inputs(y_true, y_prob)
    order = np.argsort(p, kind="mergesort")
    sorted_p = p[order]
    ranks = np.empty(len(p), dtype=float)
    start = 0
    while start < len(p):
        end = start + 1
        while end < len(p) and sorted_p[end] == sorted_p[start]:
            end += 1
        ranks[order[start:end]] = (start + 1 + end) / 2.0
        start = end
    pos = y == 1
    n_pos, n_neg = int(pos.sum()), int(len(y) - pos.sum())
    return float((ranks[pos].sum() - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg))

def ks_statistic(y_true, y_prob) -> float:
    y, p = _validate_binary_inputs(y_true, y_prob)
    order = np.argsort(-p, kind="mergesort")
    y_sorted, p_sorted = y[order], p[order]
    n_pos, n_neg = int(y.sum()), int(len(y) - y.sum())
    cum_pos, cum_neg = np.cumsum(y_sorted) / n_pos, np.cumsum(1-y_sorted) / n_neg
    ends = np.r_[np.flatnonzero(p_sorted[:-1] != p_sorted[1:]), len(p_sorted)-1]
    return float(np.max(np.abs(cum_pos[ends] - cum_neg[ends])))

def evaluate_binary(y_true, y_prob, cutoff: float = 0.5) -> dict:
    if not np.isfinite(cutoff) or not 0 <= cutoff <= 1:
        raise ValueError("Cutoff must be between 0 and 1.")
    y, p = _validate_binary_inputs(y_true, y_prob)
    pred = (p >= cutoff).astype(int)
    tp=int(((pred==1)&(y==1)).sum()); tn=int(((pred==0)&(y==0)).sum())
    fp=int(((pred==1)&(y==0)).sum()); fn=int(((pred==0)&(y==1)).sum())
    auc=roc_auc_score(y,p)
    return {
        "n_rows":int(len(y)), "default_rate":float(y.mean()), "roc_auc":auc,
        "gini":float(2*auc-1), "ks":ks_statistic(y,p),
        "brier_score":float(np.mean((p-y)**2)), "cutoff":float(cutoff),
        "confusion_matrix":{"tn":tn,"fp":fp,"fn":fn,"tp":tp},
        "precision":float(tp/(tp+fp)) if tp+fp else None,
        "recall":float(tp/(tp+fn)) if tp+fn else None
    }

def population_stability_index(expected, actual, bins: int = 10, epsilon: float = 1e-6) -> dict:
    exp=np.asarray(expected,dtype=float); act=np.asarray(actual,dtype=float)
    exp=exp[np.isfinite(exp)]; act=act[np.isfinite(act)]
    if len(exp)==0 or len(act)==0: raise ValueError("Expected and actual samples must contain finite numeric values.")
    if bins<2: raise ValueError("At least two bins are required.")
    edges=np.unique(np.quantile(exp,np.linspace(0,1,bins+1)))
    if len(edges)<2:
        edges=np.array([-np.inf,float(exp[0]),np.inf])
    else:
        edges[0]=-np.inf; edges[-1]=np.inf
    ec,_=np.histogram(exp,bins=edges); ac,_=np.histogram(act,bins=edges)
    ep=ec/len(exp); ap=ac/len(act)
    ea=np.clip(ep,epsilon,None); aa=np.clip(ap,epsilon,None)
    value=float(np.sum((aa-ea)*np.log(aa/ea)))
    return {"psi":value,"n_expected":int(len(exp)),"n_actual":int(len(act)),"bins":int(len(edges)-1),"expected_distribution":ep.tolist(),"actual_distribution":ap.tolist(),"interpretation":"Heuristic only; thresholds and binning must be approved for the intended use."}
