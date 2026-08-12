# Benchmark comparison — v1.1.0

| Metric | baseline-opencode_deepseek-v4-flash-free-r1 | baseline-opencode_deepseek-v4-flash-free-r1 |
|---|---|---|
| Cases scored | 41 | 10 |
| Mean raw (/40) | 36.634 | 35.800 |
| Mean final (/40) | 36.634 | 35.800 |
| Detection (/5) | 4.268 | 4.000 |
| Severity accuracy (/5) | 3.780 | 4.000 |
| Evidence accuracy (/5) | 3.951 | 3.800 |
| Intent accuracy (/5) | 5.000 | 5.000 |
| False-positive avoidance (/5) | 5.000 | 5.000 |
| Verification quality (/5) | 4.634 | 4.000 |
| Fix quality (/5) | 5.000 | 5.000 |
| Regression-test quality (/5) | 5.000 | 5.000 |
| Precision | 0.786 | 0.667 |
| Recall | 1.000 | 1.000 |
| BLOCKING precision | 0.552 | 0.500 |
| BLOCKING recall | 1.000 | 1.000 |
| FP / FN / TP / TN | 6/0/22/4 | 2/0/4/4 |
| Intent detection | 1.000 | 1.000 |
| Evidence accuracy | 0.806 | 0.750 |
| Verification accuracy | 1.000 | 1.000 |
| Silence rate (NO-ISSUE) | 0.400 | 0.667 |

### Not run

- **baseline-opencode_deepseek-v4-flash-free-r1** (0): none
- **baseline-opencode_deepseek-v4-flash-free-r1** (31): ARC-01, ARC-02, ARC-03, CON-01, CON-02, CON-03, CON-04, DI-01, DI-02, DI-03, DEP-02, DEP-03, FP-04, FP-05, INT-01, INT-02, INT-04, LIF-01, LIF-02, MAI-01, MAI-02, MAI-03, REL-01, REL-02, REL-04, SEC-01, SEC-04, SEC-06, SR-01, SR-02, SR-03

## Per-category

| Category | Cases | baseline-opencode_deepseek-v4-flash-free-r1 mean | baseline-opencode_deepseek-v4-flash-free-r1 mean |
|---|---|---|---|
| architecture | 3 | 39.333 | n/a |
| concurrency | 4 | 39.500 | n/a |
| data-integrity | 3 | 38.667 | n/a |
| dependencies | 3 | 34.333 | 40.000 |
| false-positives | 5 | 29.000 | 31.667 |
| intent | 4 | 40.000 | 40.000 |
| lifecycle | 2 | 40.000 | n/a |
| maintainability | 3 | 37.333 | n/a |
| reliability | 4 | 36.500 | 40.000 |
| security | 6 | 37.500 | 34.333 |
| self-review | 4 | 34.750 | 40.000 |

## Per-case delta (baseline-opencode_deepseek-v4-flash-free-r1 → baseline-opencode_deepseek-v4-flash-free-r1)

| Case | Expected | baseline-opencode_deepseek-v4-flash-free-r1 | baseline-opencode_deepseek-v4-flash-free-r1 | Δ |
|---|---|---:|---:|---:|
| ARC-01 | BLOCKING | 40.0 | n/a | — |
| ARC-02 | WORTH-FIXING | 40.0 | n/a | — |
| ARC-03 | WORTH-FIXING | 38.0 | n/a | — |
| CON-01 | BLOCKING | 38.0 | n/a | — |
| CON-02 | BLOCKING | 40.0 | n/a | — |
| CON-03 | WORTH-FIXING | 40.0 | n/a | — |
| CON-04 | BLOCKING | 40.0 | n/a | — |
| DEP-01 | NO-ISSUE | 25.0 | 40.0 | +15.0 |
| DEP-02 | WORTH-FIXING | 38.0 | n/a | — |
| DEP-03 | WORTH-FIXING | 40.0 | n/a | — |
| DI-01 | BLOCKING | 40.0 | n/a | — |
| DI-02 | BLOCKING | 38.0 | n/a | — |
| DI-03 | BLOCKING | 38.0 | n/a | — |
| FP-01 | NO-ISSUE | 25.0 | 35.0 | +10.0 |
| FP-02 | NO-ISSUE | 25.0 | 25.0 | +0.0 |
| FP-03 | NO-ISSUE | 25.0 | 35.0 | +10.0 |
| FP-04 | NO-ISSUE | 35.0 | n/a | — |
| FP-05 | NO-ISSUE | 35.0 | n/a | — |
| INT-01 | BLOCKING | 40.0 | n/a | — |
| INT-02 | BLOCKING | 40.0 | n/a | — |
| INT-03 | WORTH-FIXING | 40.0 | 40.0 | +0.0 |
| INT-04 | BLOCKING | 40.0 | n/a | — |
| LIF-01 | NO-ISSUE | 40.0 | n/a | — |
| LIF-02 | BLOCKING | 40.0 | n/a | — |
| MAI-01 | NITPICK | 38.0 | n/a | — |
| MAI-02 | NITPICK | 38.0 | n/a | — |
| MAI-03 | NITPICK | 36.0 | n/a | — |
| REL-01 | WORTH-FIXING | 35.0 | n/a | — |
| REL-02 | WORTH-FIXING | 38.0 | n/a | — |
| REL-03 | WORTH-FIXING | 38.0 | 40.0 | +2.0 |
| REL-04 | NO-ISSUE | 35.0 | n/a | — |
| SEC-01 | BLOCKING | 40.0 | n/a | — |
| SEC-02 | NO-ISSUE | 25.0 | 25.0 | +0.0 |
| SEC-03 | BLOCKING | 40.0 | 38.0 | -2.0 |
| SEC-04 | BLOCKING | 40.0 | n/a | — |
| SEC-05 | BLOCKING | 40.0 | 40.0 | +0.0 |
| SEC-06 | BLOCKING | 40.0 | n/a | — |
| SR-01 | WORTH-FIXING | 38.0 | n/a | — |
| SR-02 | WORTH-FIXING | 38.0 | n/a | — |
| SR-03 | WORTH-FIXING | 38.0 | n/a | — |
| SR-04 | NO-ISSUE | 25.0 | 40.0 | +15.0 |
