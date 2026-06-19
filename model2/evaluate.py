"""
FitMentor — Model Evaluation Script
Run: python3 evaluate.py

Prints a full accuracy report for both ML models:
  - MAE, RMSE, R² on held-out test set
  - % predictions within practical tolerances
  - Feature importances
  - Dataset statistics
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from ml_models import _generate_training_data, GOAL_ENC, EXP_ENC
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor

CSV_PATH = "inbody_dataset.csv"
SEP = "─" * 62

def rmse(y, p): return float(np.sqrt(mean_squared_error(y, p)))
def pct_within(y, p, tol): return float(np.mean(np.abs(y-p) <= tol) * 100)

def print_section(title):
    print(f"\n{SEP}\n  {title}\n{SEP}")

def evaluate():
    print("\n🏋  FitMentor — Model Evaluation Report")
    print(SEP)

    # ── Dataset stats ────────────────────────────────────────────────────────
    raw = pd.read_csv(CSV_PATH)
    print_section("DATASET  (InBody CSV)")
    print(f"  Users          : {len(raw):,}")
    print(f"  Avg weight     : {raw.weight_kg.mean():.1f} kg")
    print(f"  Avg body fat   : {raw.pbf_percent.mean():.1f} %")
    print(f"  Avg muscle mass: {raw.smm_kg.mean():.1f} kg")
    print(f"  Avg BMI        : {raw.bmi.mean():.1f}")
    print(f"  Avg InBody score: {raw.inbody_score.mean():.1f}")
    print(f"  Age range      : {raw.age.min()}–{raw.age.max()}")
    print(f"  Gender split   : {raw.gender.value_counts().to_dict()}")

    # ── Generate synthetic training data ─────────────────────────────────────
    print_section("GENERATING SYNTHETIC TRAINING DATA")
    df = _generate_training_data(CSV_PATH, n_samples=6000, seed=42)
    print(f"  Samples: {len(df)} (80% train / 20% test)")

    feat_sr = ["weight_kg","pbf_percent","smm_kg","goal_enc","exp_enc","is_compound"]
    feat_wr = ["weight_kg","smm_kg","exp_enc","is_compound","base_wt_pct"]

    X_sr = df[feat_sr].values
    X_wr = df[feat_wr].values
    y_sets = df["delta_sets"].values
    y_reps = df["delta_reps"].values
    y_wt   = df["rec_weight"].values

    (X_sr_tr, X_sr_te,
     X_wr_tr, X_wr_te,
     ys_tr, ys_te,
     yr_tr, yr_te,
     yw_tr, yw_te) = train_test_split(
        X_sr, X_wr, y_sets, y_reps, y_wt,
        test_size=0.2, random_state=42
    )

    # ── Model 1: Sets/Reps Adjuster ───────────────────────────────────────────
    print_section("MODEL 1 — SETS/REPS ADJUSTER  (GradientBoosting)")
    m_sets = GradientBoostingRegressor(n_estimators=200,max_depth=4,
                                        learning_rate=0.05,subsample=0.8,random_state=42)
    m_reps = GradientBoostingRegressor(n_estimators=200,max_depth=4,
                                        learning_rate=0.05,subsample=0.8,random_state=42)
    m_sets.fit(X_sr_tr, ys_tr)
    m_reps.fit(X_sr_tr, yr_tr)

    ps = m_sets.predict(X_sr_te)
    pr = m_reps.predict(X_sr_te)

    print("\n  ── delta_sets ──")
    print(f"    MAE        : {mean_absolute_error(ys_te, ps):.3f}  sets")
    print(f"    RMSE       : {rmse(ys_te, ps):.3f}  sets")
    print(f"    R²         : {r2_score(ys_te, ps):.3f}")
    print(f"    Within ±0.5: {pct_within(ys_te, ps, 0.5):.1f}%")
    print(f"    Within ±1.0: {pct_within(ys_te, ps, 1.0):.1f}%")

    print("\n  ── delta_reps ──")
    print(f"    MAE        : {mean_absolute_error(yr_te, pr):.3f}  reps")
    print(f"    RMSE       : {rmse(yr_te, pr):.3f}  reps")
    print(f"    R²         : {r2_score(yr_te, pr):.3f}")
    print(f"    Within ±1  : {pct_within(yr_te, pr, 1.0):.1f}%")
    print(f"    Within ±2  : {pct_within(yr_te, pr, 2.0):.1f}%")

    print("\n  ── Feature importance (delta_sets model) ──")
    for name, imp in sorted(zip(feat_sr, m_sets.feature_importances_),
                             key=lambda x: -x[1]):
        bar = '█' * int(imp * 40)
        print(f"    {name:<18} {bar:<40} {imp:.4f}")

    # Cross-validation (5-fold)
    print("\n  ── 5-Fold Cross-Validation (sets) ──")
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(m_sets, X_sr, y_sets, cv=cv,
                                scoring='neg_mean_absolute_error')
    print(f"    MAE folds  : {[-round(s,3) for s in cv_scores]}")
    print(f"    Mean MAE   : {-cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # ── Model 2: Weight Recommender ───────────────────────────────────────────
    print_section("MODEL 2 — WEIGHT RECOMMENDER  (RandomForest)")
    m_wt = RandomForestRegressor(n_estimators=300,max_depth=8,
                                  min_samples_leaf=5,n_jobs=-1,random_state=42)
    m_wt.fit(X_wr_tr, yw_tr)
    pw = m_wt.predict(X_wr_te)

    print(f"    MAE        : {mean_absolute_error(yw_te, pw):.2f}  kg")
    print(f"    RMSE       : {rmse(yw_te, pw):.2f}  kg")
    print(f"    R²         : {r2_score(yw_te, pw):.3f}")
    print(f"    Within ±2.5kg: {pct_within(yw_te, pw, 2.5):.1f}%  (1 plate)")
    print(f"    Within ±5kg  : {pct_within(yw_te, pw, 5.0):.1f}%  (2 plates)")

    print("\n  ── Feature importance ──")
    for name, imp in sorted(zip(feat_wr, m_wt.feature_importances_),
                             key=lambda x: -x[1]):
        bar = '█' * int(imp * 40)
        print(f"    {name:<18} {bar:<40} {imp:.4f}")

    # Cross-validation
    print("\n  ── 5-Fold Cross-Validation ──")
    cv_wt = cross_val_score(m_wt, X_wr, y_wt, cv=cv,
                             scoring='neg_mean_absolute_error')
    print(f"    MAE folds  : {[-round(s,2) for s in cv_wt]}")
    print(f"    Mean MAE   : {-cv_wt.mean():.2f} ± {cv_wt.std():.2f} kg")

    print(f"\n{SEP}")
    print("  ✅  Evaluation complete.")
    print(SEP + "\n")


if __name__ == "__main__":
    evaluate()
