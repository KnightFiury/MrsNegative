# Mrs. Negative Benchmark — Rubric

This rubric is the formal definition of the terms the benchmark grades.
Every case's expected answer is stated in these terms, and every scored run
is graded against them.

## 1. Evidence levels

| Level | Definition | What earns it | What it does NOT earn |
|---|---|---|---|
| `CONFIRMED` | The reviewer inspected the exact path and the failure is real | A payload was run or traced, a code path followed end to end, a dependency's docs/source read, or a concrete interleaving written out and verified against the code | Confidence without inspection |
| `LIKELY` | Strong reasoning, but the deciding factor was not inspectable in-session | The diff makes the failure almost certain, but a runtime behavior, provider config, or external contract would need execution to be airtight | Assertion from a vibe |
| `UNVERIFIED` | Plausible suspicion; the reviewer could not confirm or refute it | A real question that the case does not let the reviewer settle | A verdict — an `UNVERIFIED` suspicion must be phrased as investigation, never as a confident `BLOCKING` |

Rules applied by the scorer:

- An expected `CONFIRMED` case is graded against whether the output states
  concrete proof (a payload, a trace, an interleaving, a docs check) — not
  merely the word "CONFIRMED."
- An expected `LIKELY` case is graded against whether the output names the
  thing it could not verify.
- An expected `UNVERIFIED` case requires the output to (a) say it could not
  check, and (b) **not** escalate to `BLOCKING`. `UNVERIFIED → BLOCKING`
  without evidence is a maximum-penalty failure.
- `NO-ISSUE` cases carry `evidence_expected: N/A`; the relevant evidence
  question is whether the "clean" verdict was itself grounded (a check was
  actually performed), or just asserted.

## 2. Severity levels

| Level | Definition |
|---|---|
| `BLOCKING` | Data loss, security exploit, or crash on a realistic path, with `CONFIRMED`/`LIKELY` evidence. Stops work; requires fix + regression test + verification. |
| `WORTH-FIXING` | Real risk, not catastrophic; report with a fix and continue. |
| `NITPICK` | Style, naming, minor maintainability; batched, never blocks. |
| `NO-ISSUE` | Nothing worth a finding. The correct output is "No meaningful issues found" (a bare confirmation line is optional). Silence counts as full success. |

Escalation is a ladder (L1–L5). The benchmark grades the **tier**, and the
tier distance is part of the severity score.

## 3. What counts as evidence

### Good evidence
- A payload that a reader can paste into a request and watch fail.
- A code path traced from input to sink, citing the lines.
- A concrete thread interleaving written out step by step (Thread A step 1,
  Thread B step 1, …) that a reader can verify against the code.
- A dependency claim backed by a specific check ("the fetch client default
  is `timeout: 5000`, per its docs — so this call does not hang").
- An explicit "assumed, not verified" where the case does not let the
  reviewer check.

### Bad evidence
- "This could be dangerous" with no path.
- A severity asserted from a suspicion (`UNVERIFIED → BLOCKING`).
- An invented dependency behavior stated as fact without a check.
- A race claimed without an interleaving.
- A `CONFIRMED` stamp on something that was never inspected.

## 4. What counts as verification

### Good verification
- The exact command, payload, or test that proves the fix, named in the
  finding ("run payload P against endpoint E, assert 0 rows and no drop").
- For a safe verdict: the check that was actually performed (the query is
  parameterized; the lock covers read+write; the wrapper sets a timeout).

### Bad verification
- "Will be tested" with no concrete step.
- "Verified" attached to a fix that was never exercised.
- A regression test that cannot fail (no assertion on the fixed behavior).

## 5. What counts as a regression test

### Acceptable
- A failing-first test: written against the flawed code, observed to fail,
  then observed to pass against the fix.
- A security regression test that feeds the original payload and asserts it
  is inert.
- A test that asserts the specific fixed behavior (not "the function
  returns something").

### Inadequate
- A test that asserts the happy path only.
- A test with no assertion on the behavior that was broken.
- A test that was written but never run, presented as verification.
- No test at all on a `BLOCKING` fix when the project has test
  infrastructure.

## 6. Investigation depth (token budget)

| Class | When | Expected shape |
|---|---|---|
| `LOW` | NITPICK / trivial correctness | Reading the diff; a one-line finding |
| `MEDIUM` | WORTH-FIXING | Diff reading + a targeted check (grep one caller, one docs look-up) |
| `HIGH` | BLOCKING investigation | Reproduce or trace the failure, write the regression test |
| `VERY-HIGH` | Security / concurrency / architecture seams | Trace input to sink, map callers, follow the seam across files/services |

The benchmark records `investigation_expected` per case. It does not reward
"used every available tool"; it rewards the minimum investigation needed to
establish the expected evidence level.

## 7. Scoring model (per case, 40 points)

Eight dimensions, 0–5 each:

| # | Dimension | 5 means | 0 means |
|---|---|---|---|
| 1 | Detection | All expected real findings surfaced | The primary finding is missed |
| 2 | Severity accuracy | Exact tier match | Tier off by 2+ or `UNVERIFIED → BLOCKING` |
| 3 | Evidence accuracy | Evidence level matches and is backed by a concrete proof | Evidence asserted with no support, or `CONFIRMED` on an unchecked claim |
| 4 | Intent accuracy | Correctly reads the user request, catches semantic violations | Misses the intent violation or invents intent |
| 5 | False-positive avoidance | Zero invented findings | Inflates a safe case, or an invented finding on a real case |
| 6 | Verification quality | Concrete, runnable verification named | No verification, or a claimed verification that cannot be checked |
| 7 | Fix quality | Concrete, correct fix | Vague or wrong fix |
| 8 | Regression-test quality | Correctly requires (or declines) a regression test with justification | Demands an impossible test on a safe case, or skips one on a BLOCKING fix |

Rules:
- On `NO-ISSUE` cases, dimensions 1–3 are scored trivially only if the
  output is silent or minimal; the real signal is dimension 5 (a single
  invented `WORTH-FIXING` caps the case near zero). A safe case that is
  correctly silent scores 40.
- **False positives carry a penalty beyond their own dimension.** The total
  is multiplied as follows when the case had invented findings:
  - 1 invented NITPICK: ×0.9
  - 1 invented WORTH-FIXING: ×0.7
  - Any invented BLOCKING: ×0.4
  The multiplier is applied to the case total. A reviewer that finds every
  real bug but invents findings on half the safe cases cannot score well.

## 8. Aggregates

Across the whole run, the scorer computes, at finding level:

- **TP** — an expected real finding (severity WORTH-FIXING or above) was
  reported at the right tier.
- **FP** — a finding was reported that is not in the expected answer, or a
  `NO-ISSUE` case produced any finding.
- **FN** — an expected real finding was not reported.
- **TN** — a `NO-ISSUE` case produced no finding.

```
Precision       = TP / (TP + FP)
Recall          = TP / (TP + FN)
BLOCKING precision = TP_BLOCKING / (TP_BLOCKING + FP_BLOCKING)
BLOCKING recall    = TP_BLOCKING / (TP_BLOCKING + FN_BLOCKING)
```

where `TP_BLOCKING` is a BLOCKING expected issue reported as BLOCKING,
`FP_BLOCKING` is a BLOCKING label on anything not expected to be BLOCKING
(including an invented issue), and `FN_BLOCKING` is an expected BLOCKING
not reported at all.

**BLOCKING is the precision-critical class.** The persona's entire value
rests on `BLOCKING` being rare and trustworthy, so `FP_BLOCKING` drags the
overall benchmark score down far harder than a missed NITPICK does.

## 9. Additional rates

- **Intent detection rate** — fraction of `intent` cases where the semantic
  violation was caught.
- **Evidence accuracy** — fraction of cases where the output's evidence
  level matched the expected level (and was backed, not merely labeled).
- **Verification accuracy** — fraction of cases where the output named the
  verification that would (or did) settle the question.
- **Silence rate** — fraction of `NO-ISSUE` cases correctly silent.

## 10. What a good score looks like

Interpretation guide (coarse, over ≥30 cases):

| Benchmark total (mean of per-case /40) | Meaning |
|---|---|
| ≥ 34 | Calibrated: high signal, few false positives, evidence-backed |
| 28–33 | Acceptable with noticeable noise or evidence drift |
| < 28 | Calibration problem; investigate patterns before trusting any `BLOCKING` |

A good model is one whose **BLOCKING precision ≈ recall and both high**
(≥ 0.9 / ≥ 0.9). A model with recall 1.0 and precision 0.5 is worse than
one with 0.9 / 0.95 — the whole point is trustworthiness, not volume.
