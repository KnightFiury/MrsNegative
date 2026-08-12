# Benchmark comparison — v1.1.0

| Metric | baseline-opencode_deepseek-v4-flash-free-r1 | mrs-negative-opencode_deepseek-v4-flash-free-r1 |
|---|---|---|
| Cases scored | 41 | 41 |
| Mean raw (/40) | 36.634 | 37.805 |
| Mean final (/40) | 36.634 | 37.805 |
| Detection (/5) | 4.268 | 4.878 |
| Severity accuracy (/5) | 3.780 | 4.488 |
| Evidence accuracy (/5) | 3.951 | 4.415 |
| Intent accuracy (/5) | 5.000 | 5.000 |
| False-positive avoidance (/5) | 5.000 | 5.000 |
| Verification quality (/5) | 4.634 | 4.024 |
| Fix quality (/5) | 5.000 | 5.000 |
| Regression-test quality (/5) | 5.000 | 5.000 |
| Precision | 0.786 | 0.958 |
| Recall | 1.000 | 1.000 |
| BLOCKING precision | 0.552 | 0.696 |
| BLOCKING recall | 1.000 | 1.000 |
| FP / FN / TP / TN | 6/0/22/4 | 1/0/23/9 |
| Intent detection | 1.000 | 1.000 |
| Evidence accuracy | 0.806 | 0.677 |
| Verification accuracy | 1.000 | 1.000 |
| Silence rate (NO-ISSUE) | 0.400 | 0.900 |

### Not run

- **baseline-opencode_deepseek-v4-flash-free-r1** (0): none
- **mrs-negative-opencode_deepseek-v4-flash-free-r1** (0): none

## Per-category

| Category | Cases | baseline-opencode_deepseek-v4-flash-free-r1 mean | mrs-negative-opencode_deepseek-v4-flash-free-r1 mean |
|---|---|---|---|
| architecture | 3 | 39.333 | 40.000 |
| concurrency | 4 | 39.500 | 39.500 |
| data-integrity | 3 | 38.667 | 38.667 |
| dependencies | 3 | 34.333 | 37.667 |
| false-positives | 5 | 29.000 | 33.000 |
| intent | 4 | 40.000 | 39.500 |
| lifecycle | 2 | 40.000 | 40.000 |
| maintainability | 3 | 37.333 | 38.667 |
| reliability | 4 | 36.500 | 36.500 |
| security | 6 | 37.500 | 38.167 |
| self-review | 4 | 34.750 | 37.250 |

## Per-case delta (baseline-opencode_deepseek-v4-flash-free-r1 → mrs-negative-opencode_deepseek-v4-flash-free-r1)

| Case | Expected | baseline-opencode_deepseek-v4-flash-free-r1 | mrs-negative-opencode_deepseek-v4-flash-free-r1 | Δ |
|---|---|---:|---:|---:|
| ARC-01 | BLOCKING | 40.0 | 40.0 | +0.0 |
| ARC-02 | WORTH-FIXING | 40.0 | 40.0 | +0.0 |
| ARC-03 | WORTH-FIXING | 38.0 | 40.0 | +2.0 |
| CON-01 | BLOCKING | 38.0 | 38.0 | +0.0 |
| CON-02 | BLOCKING | 40.0 | 40.0 | +0.0 |
| CON-03 | WORTH-FIXING | 40.0 | 40.0 | +0.0 |
| CON-04 | BLOCKING | 40.0 | 40.0 | +0.0 |
| DEP-01 | NO-ISSUE | 25.0 | 35.0 | +10.0 |
| DEP-02 | WORTH-FIXING | 38.0 | 38.0 | +0.0 |
| DEP-03 | WORTH-FIXING | 40.0 | 40.0 | +0.0 |
| DI-01 | BLOCKING | 40.0 | 40.0 | +0.0 |
| DI-02 | BLOCKING | 38.0 | 38.0 | +0.0 |
| DI-03 | BLOCKING | 38.0 | 38.0 | +0.0 |
| FP-01 | NO-ISSUE | 25.0 | 35.0 | +10.0 |
| FP-02 | NO-ISSUE | 25.0 | 25.0 | +0.0 |
| FP-03 | NO-ISSUE | 25.0 | 35.0 | +10.0 |
| FP-04 | NO-ISSUE | 35.0 | 35.0 | +0.0 |
| FP-05 | NO-ISSUE | 35.0 | 35.0 | +0.0 |
| INT-01 | BLOCKING | 40.0 | 40.0 | +0.0 |
| INT-02 | BLOCKING | 40.0 | 40.0 | +0.0 |
| INT-03 | WORTH-FIXING | 40.0 | 38.0 | -2.0 |
| INT-04 | BLOCKING | 40.0 | 40.0 | +0.0 |
| LIF-01 | NO-ISSUE | 40.0 | 40.0 | +0.0 |
| LIF-02 | BLOCKING | 40.0 | 40.0 | +0.0 |
| MAI-01 | NITPICK | 38.0 | 38.0 | +0.0 |
| MAI-02 | NITPICK | 38.0 | 40.0 | +2.0 |
| MAI-03 | NITPICK | 36.0 | 38.0 | +2.0 |
| REL-01 | WORTH-FIXING | 35.0 | 35.0 | +0.0 |
| REL-02 | WORTH-FIXING | 38.0 | 40.0 | +2.0 |
| REL-03 | WORTH-FIXING | 38.0 | 36.0 | -2.0 |
| REL-04 | NO-ISSUE | 35.0 | 35.0 | +0.0 |
| SEC-01 | BLOCKING | 40.0 | 40.0 | +0.0 |
| SEC-02 | NO-ISSUE | 25.0 | 35.0 | +10.0 |
| SEC-03 | BLOCKING | 40.0 | 38.0 | -2.0 |
| SEC-04 | BLOCKING | 40.0 | 40.0 | +0.0 |
| SEC-05 | BLOCKING | 40.0 | 38.0 | -2.0 |
| SEC-06 | BLOCKING | 40.0 | 38.0 | -2.0 |
| SR-01 | WORTH-FIXING | 38.0 | 38.0 | +0.0 |
| SR-02 | WORTH-FIXING | 38.0 | 38.0 | +0.0 |
| SR-03 | WORTH-FIXING | 38.0 | 38.0 | +0.0 |
| SR-04 | NO-ISSUE | 25.0 | 35.0 | +10.0 |
