# Benchmark report

- **Benchmark version:** v1.1.0
- **Results source:** .run/results/baseline-opencode_deepseek-v4-flash-free-r1
- **Generated:** 2026-08-12T06:30:05.222Z
- **Cases run:** 41 / 41

## Overall

| Metric | Value |
|---|---|
| Mean raw score (/40) | 36.63 |
| Mean final score (/40, after FP multiplier) | 36.63 |
| Mean Detection (/5) | 4.27 |
| Mean Severity accuracy (/5) | 3.78 |
| Mean Evidence accuracy (/5) | 3.95 |
| Mean Intent accuracy (/5) | 5.00 |
| Mean False-positive avoidance (/5) | 5.00 |
| Mean Verification quality (/5) | 4.63 |
| Mean Fix quality (/5) | 5.00 |
| Mean Regression-test quality (/5) | 5.00 |

## Finding-level aggregates

| Metric | Value |
|---|---|
| TP / FP / FN / TN | 22 / 6 / 0 / 4 |
| Precision | 0.786 |
| Recall | 1.000 |
| BLOCKING TP / FP / FN | 16 / 13 / 0 |
| BLOCKING precision | 0.552 |
| BLOCKING recall | 1.000 |
| Intent detection rate | 1.000 |
| Evidence accuracy | 0.806 |
| Verification accuracy | 1.000 |
| Silence rate (NO-ISSUE) | 0.400 |

## Per-case scores

| Case | Expected | D | Sa | Ea | Ia | Fa | Vq | Fq | Rq | Raw | × | Final |
|---|---|------|---|---|---|---|---|---|---|---:|---:|---:|
| ARC-01 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| ARC-02 | WORTH-FIXING/LIKELY | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| ARC-03 | WORTH-FIXING/LIKELY | 5 | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| CON-01 | BLOCKING/CONFIRMED | 5 | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| CON-02 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| CON-03 | WORTH-FIXING/LIKELY | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| CON-04 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| DI-01 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| DI-02 | BLOCKING/LIKELY | 5 | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| DI-03 | BLOCKING/LIKELY | 5 | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| DEP-01 | NO-ISSUE/N/A | 0 | 0 | 0 | 5 | 5 | 5 | 5 | 5 | 25 | ×1.00 | 25.0 |
| DEP-02 | WORTH-FIXING/CONFIRMED | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| DEP-03 | WORTH-FIXING/UNVERIFIED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| FP-01 | NO-ISSUE/N/A | 0 | 0 | 0 | 5 | 5 | 5 | 5 | 5 | 25 | ×1.00 | 25.0 |
| FP-02 | NO-ISSUE/N/A | 0 | 0 | 0 | 5 | 5 | 5 | 5 | 5 | 25 | ×1.00 | 25.0 |
| FP-03 | NO-ISSUE/N/A | 0 | 0 | 0 | 5 | 5 | 5 | 5 | 5 | 25 | ×1.00 | 25.0 |
| FP-04 | NO-ISSUE/N/A | 5 | 5 | 5 | 5 | 5 | 0 | 5 | 5 | 35 | ×1.00 | 35.0 |
| FP-05 | NO-ISSUE/N/A | 5 | 5 | 5 | 5 | 5 | 0 | 5 | 5 | 35 | ×1.00 | 35.0 |
| INT-01 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| INT-02 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| INT-03 | WORTH-FIXING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| INT-04 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| LIF-01 | NO-ISSUE/N/A | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| LIF-02 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| MAI-01 | NITPICK/CONFIRMED | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| MAI-02 | NITPICK/CONFIRMED | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| MAI-03 | NITPICK/CONFIRMED | 5 | 1 | 5 | 5 | 5 | 5 | 5 | 5 | 36 | ×1.00 | 36.0 |
| REL-01 | WORTH-FIXING/UNVERIFIED | 5 | 3 | 2 | 5 | 5 | 5 | 5 | 5 | 35 | ×1.00 | 35.0 |
| REL-02 | WORTH-FIXING/LIKELY | 5 | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| REL-03 | WORTH-FIXING/CONFIRMED | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| REL-04 | NO-ISSUE/N/A | 5 | 5 | 5 | 5 | 5 | 0 | 5 | 5 | 35 | ×1.00 | 35.0 |
| SEC-01 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| SEC-02 | NO-ISSUE/N/A | 0 | 0 | 0 | 5 | 5 | 5 | 5 | 5 | 25 | ×1.00 | 25.0 |
| SEC-03 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| SEC-04 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| SEC-05 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| SEC-06 | BLOCKING/CONFIRMED | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 | ×1.00 | 40.0 |
| SR-01 | WORTH-FIXING/CONFIRMED | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| SR-02 | WORTH-FIXING/CONFIRMED | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| SR-03 | WORTH-FIXING/CONFIRMED | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 38 | ×1.00 | 38.0 |
| SR-04 | NO-ISSUE/N/A | 0 | 0 | 0 | 5 | 5 | 5 | 5 | 5 | 25 | ×1.00 | 25.0 |
