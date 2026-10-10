import numpy as np
import pytest
from pd_workbench.metrics import evaluate_binary, population_stability_index, roc_auc_score

def test_perfect_ranking_auc_gini_ks():
    result=evaluate_binary([0,0,1,1],[0.1,0.2,0.8,0.9],0.5)
    assert result["roc_auc"]==pytest.approx(1.0)
    assert result["gini"]==pytest.approx(1.0)
    assert result["ks"]==pytest.approx(1.0)
    assert result["confusion_matrix"]=={"tn":2,"fp":0,"fn":0,"tp":2}

def test_auc_ties_average_rank():
    assert roc_auc_score([0,1],[0.5,0.5])==pytest.approx(0.5)

def test_rejects_single_class():
    with pytest.raises(ValueError,match="both classes"): evaluate_binary([0,0],[0.1,0.2])

def test_rejects_probability_outside_range():
    with pytest.raises(ValueError,match="between 0 and 1"): evaluate_binary([0,1],[0.1,1.2])

def test_psi_zero_for_same_distribution():
    v=np.linspace(0.01,0.99,100)
    assert population_stability_index(v,v)["psi"]==pytest.approx(0.0)

def test_psi_detects_shift():
    assert population_stability_index(np.linspace(0,1,200),np.linspace(0.8,1.8,200))["psi"]>0
