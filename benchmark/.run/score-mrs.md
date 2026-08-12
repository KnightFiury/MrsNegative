# Benchmark report

- **Benchmark version:** v1.1.0
- **Results source:** .run/results/mrs-negative-opencode_deepseek-v4-flash-free-r1
- **Generated:** 2026-08-12T05:00:42.001Z
- **Cases run:** 2 / 41
- **Not run (39):** ARC-01, ARC-02, ARC-03, CON-01, CON-02, CON-03, CON-04, DI-01, DI-02, DI-03, DEP-01, DEP-02, DEP-03, FP-02, FP-03, FP-04, FP-05, INT-01, INT-02, INT-03, INT-04, LIF-01, LIF-02, MAI-01, MAI-02, MAI-03, REL-01, REL-02, REL-03, REL-04, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SR-01, SR-02, SR-03, SR-04

## Overall

| Metric | Value |
|---|---|
| Mean raw score (/40) | 32.50 |
| Mean final score (/40, after FP multiplier) | 32.50 |
| Mean Detection (/5) | 2.50 |
| Mean Severity accuracy (/5) | 2.50 |
| Mean Evidence accuracy (/5) | 2.50 |
| Mean Intent accuracy (/5) | 5.00 |
| Mean False-positive avoidance (/5) | 5.00 |
| Mean Verification quality (/5) | 5.00 |
| Mean Fix quality (/5) | 5.00 |
| Mean Regression-test quality (/5) | 5.00 |

## Finding-level aggregates

| Metric | Value |
|---|---|
| TP / FP / FN / TN | 1 / 1 / 0 / 0 |
| Precision | 0.500 |
| Recall | 1.000 |
| BLOCKING TP / FP / FN | 1 / 1 / 0 |
| BLOCKING precision | 0.500 |
| BLOCKING recall | 1.000 |
| Intent detection rate | n/a |
| Evidence accuracy | 1.000 |
| Verification accuracy | 1.000 |
| Silence rate (NO-ISSUE) | 0.000 |

## Per-case scores

| Case | Expected | D | Sa | Ea | Ia | Fa | Vq | Fq | Rq | Raw | × | Final |
|---|---|------|---|---|---|---|---|---|---|---:|---:|---:|
| FP-01 | NO-ISSUE/N/A | 0 | 0 | 0 | 5 | 5 | 5 | 5 | 5 | 25 | ×1.00 | 25.0 |
| SEC-01 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
