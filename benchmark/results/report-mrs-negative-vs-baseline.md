# How Does the Mrs. Negative Persona Change Code-Review Behavior?

**Benchmark:** v1.1.0, 41 cases, 12 categories · **Model:** `opencode/deepseek-v4-flash-free`
**Conditions:** `baseline` (stock) vs `mrs-negative` (persona AGENTS.md injected via harness)
**Runs:** full 41-case run 1 for both conditions; 10-case variance subset run 2 for both.
**Data:** `.run/results/…` (extracted verdicts + raw transcripts), scored with `scripts/score-lib.mjs` (identical to `score.mjs`/`compare.mjs`).

---

## 1. Headline — run 1 (41 cases)

| Metric | baseline | mrs-negative | Δ |
|---|---|---:|---:|---:|
| Mean total (/40) | 36.63 | 37.80 | **+1.17** |
| Precision | 0.786 | 0.958 | +0.172 |
| Recall | 1.000 | 1.000 | 0 |
| BLOCKING precision | 0.552 | 0.696 | +0.144 |
| BLOCKING recall | 1.000 | 1.000 | 0 |
| FP / FN / TP / TN | 6 / 0 / 22 / 4 | 1 / 0 / 23 / 9 | — |
| Silence rate (NO-ISSUE) | 0.400 | 0.900 | +0.500 |
| Detection (/5) | 4.27 | 4.88 | +0.61 |
| Severity accuracy (/5) | 3.78 | 4.49 | +0.71 |
| Evidence accuracy (/5) | 3.95 | 4.42 | +0.46 |
| Intent accuracy (/5) | 5.00 | 5.00 | 0 |
| False-positive avoidance (/5) | 5.00 | 5.00 | 0 |
| Verification quality (/5) | 4.63 | 4.02 | −0.61 |
| Fix quality / Regression quality (/5) | 5.00 | 5.00 | 0 |

**Category means (/40):** gains in dependencies (+3.3), false-positives (+4.0), self-review (+2.5); losses/ties in intent (−0.5, one case), security (−0.2 net from evidence under-claiming), concurrency/data-integrity/reliability (tie).

## 2. What the persona changed (per-case, run 1)

- **False positives killed — the dominant effect.** Baseline invented findings on 6 of 10 NO-ISSUE cases (DEP-01, FP-01, FP-02, FP-03, SEC-02, SR-04). Mrs. Negative stayed silent on 9 of 10 (all but FP-02): +25 pts across those cases. Baseline's findings were almost all *defensible* NITPICKs (e.g., DEP-01: missing `try/catch` around `JSON.parse`), i.e. not hallucinations — but the rubric counts any finding on safe code as an FP, and the persona's "only report what you can prove" bias suppresses them.
- **Evidence honesty, both directions.** Mrs. Negative **under-claimed** CONFIRMED→LIKELY on 5 genuinely-confirmable security cases (SEC-03/05/06, INT-03, REL-03, −2 each) because it refused to claim CONFIRMED without running the app. Baseline "won" those points by self-reporting CONFIRMED it could not have executed.
- **Shared, unfixed over-claim bias.** Both conditions over-claimed CONFIRMED on cases the answer key marks LIKELY/UNVERIFIED (CON-01, DI-02, DI-03, REL-01). The persona does not fix the model's optimistic self-reporting.
- **Always-correct:** intent preservation, fix quality, regression stance — 5.0 in both. Not a discriminator.

## 3. Repeatability (10-case variance subset, run 2)

| Condition | Subset run 1 | Subset run 2 | Note |
|---|---|---:|---:|---|
| baseline | 30.8 | 35.8 | r1 invented 6 safe findings, r2 only 2 |
| mrs-negative | 35.0 | 32.1 | r1 invented 1 safe finding, r2 3 |

- Safe-case discrimination is **coin-flippy in both conditions**: the same NO-ISSUE cases flip between "silent" and "invented finding" across runs. Across both runs the persona suppressed safe findings 4 vs 8 for baseline — **directional but not conclusive at n=10**.
- **FP-02 (lock correctly covers the critical section) fails both conditions in all 4 runs** — both invent a speculative "cross-replica double-redemption" race, the exact trap the case defines. This is the single most robust remaining weakness.
- **SEC-02 (expected NO-ISSUE) is the most robust persona win**: baseline invents a finding in both runs, mrs-negative stays silent in both.
- The evidence down/up-leveling deltas (SEC-03/05, REL-03) flip between runs too — the ±2s on individual cases are within noise.

## 4. Adjudication (manual review of raw transcripts vs extracted verdicts)

Extraction is faithful — verdict JSONs match the prose. Three measurement artifacts surfaced:

1. **The rubric rewards over-claiming CONFIRMED.** On SEC-03 (a traceable IDOR), Mrs. Negative wrote an excellent analysis but tagged `evidence: LIKELY` ("couldn't execute it in-session") → 38. Baseline said CONFIRMED → 40. Since evidence level is self-reported and prose-level *path tracing* is treated the same as runtime reproduction, the honest reviewer is penalized. Worth a rubric note: CONFIRMED-by-trace should be a distinct, permitted level for structural findings.
2. **Verification is under-scored when the prose proves it.** mrs-negative DEP-01's notes literally say "Checked the pinned wrapper in ../lib/redis.js" yet `verificationConcrete: false` → 35 not 40. The persona's "silent + checked" verdicts systematically leave the flag unset even when the check is named.
3. **Model self-reports contradict its own prose.** baseline DEP-01's prose concludes "nothing worth reporting … not even a nitpick" while its JSON sets `hasFinding: true, severity: NITPICK` → scored as an FP. A finding the reviewer argues against in the same breath is a real reliability bug in the *extraction target*, not just a persona effect.

## 5. Verdict

- **Mrs. Negative improves code-review output on net** (mean +1.17/40 in run 1) by suppressing speculative findings on safe code — the behavior it was designed for — **without any loss of recall** (all 31 real bugs found in both conditions, both runs).
- **The effect is smaller and noisier than the run-1 numbers suggest.** The FP-control advantage is directional but flips across runs; the mean-gain is concentrated in a handful of NO-ISSUE cases.
- **The persona does not fix the shared weaknesses:** both conditions still invent the FP-02 lock trap, both over-claim CONFIRMED on unverifiable evidence, and both set verification flags inconsistently with their own prose.
- **Two benchmark improvements would sharpen this experiment:** (a) permit CONFIRMED-by-trace for structural findings so honesty isn't penalized; (b) post-process/extract verification grounding from the prose (or ask the model to echo the exact check) so silent-but-checked verdicts stop losing 5 points to a flag toggle.

## Artifacts

- `scripts/run.mjs` — prepare/run/extract harness (uses `opencode run -m`, injects AGENTS.md only for `mrs-negative`).
- `scripts/score.mjs`, `scripts/compare.mjs` — scoring and comparison (v1.1.0 rubric).
- `.run/results/{baseline,mrs-negative}-opencode_deepseek-v4-flash-free-r1/` — verdict JSONs + `_raw/` transcripts.
- `.run/results-v/…` — run-2 variance subset.
- `.run/reports/` — score + compare outputs (markdown reports and console logs).
