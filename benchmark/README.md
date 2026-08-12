# Mrs. Negative Benchmark

> *Do not make Mrs. Negative more negative. Make her more accurate.*

This directory is a **formal evaluation layer** for Mrs. Negative. It is
deliberately distinct from the lightweight calibration suite in
[`../fixtures/`](../fixtures/README.md):

| | `fixtures/` (calibration) | `benchmark/` (evaluation) |
|---|---|---|
| Purpose | Sanity-check severity calibration after a persona change | Measure capability: detection, precision, evidence, intent, silence |
| Case shape | small diff + expected tags | full scenario + user request + context + expected answers on 8 dimensions |
| Grading | loose, by tier, per-run | formal, 40 points/case, versioned expected answers |
| Where it sits | fast feedback loop | rigorous measurement, run periodically |

## Why it exists

The calibration fixtures tell you whether Mrs. Negative still *roughly*
tags the same way after an edit. They cannot tell you whether she is a
**trustworthy verifier** — whether she finds real bugs, tells suspicion
from proof, refuses to inflate, respects intent, and knows when to say
nothing.

The benchmark exists to measure the ten questions the persona claims to
answer:

1. Can she detect real bugs?
2. Can she distinguish severe bugs from minor issues?
3. Can she avoid false positives?
4. Can she distinguish "suspicious" from "proven"?
5. Can she preserve user intent?
6. Can she handle concurrency/security/reliability correctly?
7. Can she verify fixes rather than trusting the agent's claim?
8. Can she stay useful without being verbose?
9. Can she resist AI self-review bias?
10. Can she stay silent when the code is actually correct?

**The benchmark measures model behavior; it does not mathematically prove
that Mrs. Negative is correct.** A high score means the tested model + this
persona produced calibrated output on these cases — not that the persona is
sound, and not that an untested model will behave the same.

## Categories and case counts (v1.0.0, 38 cases)

| Category | Directory | Cases | What it measures |
|---|---|---|---|
| Security | `cases/security/` | 6 | injection, authz, path traversal, SSRF, secret exposure, and one parameterized-safe case |
| Concurrency | `cases/concurrency/` | 4 | check-then-act, lost update, shared mutable state, idempotency under concurrency |
| Reliability | `cases/reliability/` | 4 | timeout omission, retry storm, resource leak, and one suspicious-but-safe case |
| Data integrity | `cases/data-integrity/` | 3 | transaction boundaries, stale-state overwrite, duplicate processing |
| User intent | `cases/intent/` | 4 | semantic violations of the user's actual request |
| Dependencies | `cases/dependencies/` | 3 | VERIFIED / ASSUMED / UNKNOWN external behavior |
| Architecture | `cases/architecture/` | 3 | small diffs with seam-level consequences |
| False positives | `cases/false-positives/` | 5 | suspicious-but-correct code that must stay silent |
| Self-review bias | `cases/self-review/` | 4 | subtle flaws behind plausible AI-generated implementations |
| Lifecycle | `cases/lifecycle/` | 2 | fix-verified closure, and the "fixed ≠ verified" negative case |

~26% of cases are expected to be silent (`NO-ISSUE`). Silence is graded as
success, never penalized.

## Case file format

Each case is one Markdown file with YAML frontmatter (the machine-readable
expected answer) and a body (the human-readable case):

```yaml
---
id: SEC-01
category: security
title: SQL injection via concatenated search term
mode: STRICT
user_request: "Add an admin endpoint that exports products matching a search term to CSV."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "user-supplied `term` concatenated into the WHERE clause"
key_skills: [security, tracing, proof-payload]
---
```

The body then carries, in order:

- **Scenario** — the real-world setup (who is calling, what the product is).
- **User request** — the request the coding agent received, verbatim.
- **Code change (diff)** — the code under review.
- **Surrounding context** — everything needed for correct judgment
  (callers, framework behavior, dependency docs, existing conventions).
- **Expected outcome** — the answer key in human terms.

The frontmatter is the source of truth for scoring; the body is for humans
and LLM judges.

## Scoring

See [`rubric.md`](./rubric.md) for the full definitions. Summary:

- **8 dimensions × 5 points = 40 points per case** (detection, severity
  accuracy, evidence accuracy, intent accuracy, false-positive avoidance,
  verification quality, fix quality, regression-test quality).
- **False positives are multiply penalized** — invented `BLOCKING` cuts the
  case score to 40% of its raw value. Finding every bug while crying wolf
  on half the safe code scores badly.
- **BLOCKING precision is measured separately** from overall precision.
- **Precision / recall / TP / FP / FN / TN** are computed at finding level
  and reported per run.

## How to run

There is no LLM harness in this repository — it is an instruction repo, so
the benchmark runs in two phases.

### Phase 1 — infrastructure (deterministic)

```bash
# validate case structure + metadata, regenerate expected/answers.json
node scripts/validate.mjs

# validate the scoring logic itself (synthetic data, deterministic)
node scripts/score.self-test.mjs
```

Both must pass before any results can be trusted.

### Phase 2 — model execution (requires an external model)

1. Run every case through the adapter/model you are shipping — same
   workflow as the calibration fixtures, but against `benchmark/cases/`.
   Give the model the case **without** the "Expected outcome" section.
2. For each case, save the model's review to
   `results/<CASE_ID>.json` in the result format documented in
   `results/README.md` (severity, evidence, findings, verification,
   regression-test stance, verbosity).
3. Score:

```bash
node scripts/score.mjs results/   # writes results/latest-report.md
```

For cases where output is prose, an LLM judge may translate the output into
the result format; the rubric is the adjudication standard.

### Grading rules of engagement

- Never change an expected answer to make a model look better. If a case is
  genuinely wrong, fix the case, bump the benchmark version
  ([`version.md`](./version.md)), and re-run.
- Do not modify `PERSONA.md` because of a single case failure. Look for
  patterns; a pattern that maps to a general reasoning deficiency is the
  only justification for a persona change.

## How to interpret results

The report gives you: benchmark version, model/agent, mode, case totals,
TP/FP/FN/TN, precision/recall, BLOCKING precision/recall, intent detection
rate, evidence accuracy, verification accuracy, silence rate, and a
per-failure list.

- **High detection + low false positives** → calibrated, trustworthy.
- **High detection + high false positives** → the persona is being read as
  "find more problems"; the evidence model and tone calibration are not
  landing.
- **Low detection** → the checklist isn't reaching the model, or the case
  context is being ignored.
- **`UNVERIFIED → BLOCKING` clusters** → the evidence model is broken and
  everything else is secondary.

## What constitutes a good score

| Benchmark total | Meaning |
|---|---|
| ≥ 34 / 40 mean | Calibrated — usable |
| 28–33 | Acceptable with noise |
| < 28 | Do not trust `BLOCKING` output until the pattern is found |

The single most important number is **BLOCKING precision** — it should be
≥ 0.9, because a `BLOCKING` label is what stops work.

## Adding a case

1. Copy an existing case in the matching category as a template.
2. Write the scenario, user request, diff, and context. The context must be
   sufficient for the correct judgment *and* for a wrong judgment to be
   distinguishable from it.
3. Set the frontmatter: severity, evidence, investigation depth,
   regression-test requirement, primary finding, key skills.
4. Run `node scripts/validate.mjs` — it checks every field, category
   minimums, the ≥25% silence ratio, and ID uniqueness.
5. If you added cases, bump the minor version in [`version.md`](./version.md).

## Known limitations

- **No in-repo LLM harness.** This repository cannot execute a model.
  Until results are produced by an actual run, the "no fabricated model
  results" rule stands: the infrastructure is validated, the model is not.
- Cases are written by the same authoring process as the persona; they are
  not a ground-truth audit of reality. They are a *consistency contract*
  with the calibration bar.
- Long multi-turn lifecycle cases (self-review, lifecycle) are graded as a
  conversation, which the single-shot scorer approximates through the
  per-case result format. Interpret those categories with that in mind.
- Scores are model-specific, not persona-absolute. Different models
  exercise the persona differently.

## Future work

See [`docs/future-evidence-engine.md`](./docs/future-evidence-engine.md)
for the designed (not built) evidence engine that would let a run say
"Tool X inspected X and returned Y" instead of "the model says it
inspected X."
