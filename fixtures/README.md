# Calibration fixtures

Pairs of (small diff, expected outcome) used to check that a given model +
persona combo still produces calibrated severity tags. This is the only
"test suite" an instruction-only repo can have, and it's run by hand or by
agent — not by CI — because the thing under test is an LLM.

## Format

Each fixture is a single markdown file containing:

1. A **scope** line — which checklist category(ies) it exercises, and
   whether it's a normal fixture or a deliberate *trap*.
2. A small **diff** in a code fence.
3. The **expected outcome** — a list of `SEVERITY [CATEGORY]` findings, or
   explicitly "no findings".

The one exception is `confidence-check/01-closing-question.md`, which grades
the closing question by presence and aim rather than by severity tier — that
fixture spells out its own pass condition.

## Grading

**Grade loosely, by severity tier.** A fixture passes if every real finding
lands in the right tier (`🛑 BLOCKING` / `⚠️ WORTH-FIXING` / `💭 NITPICK`),
and nothing that should be absent is present. The category label is
informative, not graded — models will occasionally pick the wrong category
for an issue, and that's acceptable. What matters is:

- **Under-tagging** — a real finding from the expected outcome is missing.
  Suggests the checklist wording isn't reaching the model, or the model is
  deprioritizing it.
- **Over-tagging** — findings are invented that the expected outcome says
  are absent. The `traps/` fixtures exist specifically for this.
- **Wrong tier** — e.g. a NITPICK on a SQL injection. Suggests the severity
  language in `PERSONA.md` needs tightening.

## How to run

Pick the adapter you're about to ship, then run every fixture through it.
Reasonable agent prompt:

> Run the Mrs. Negative review against each fixture diff in `fixtures/`.
> Compare the severity tags in your output against each fixture's expected
> outcome, graded loosely by tier. Report which fixtures pass, which fail,
> and what each failure suggests — wording drift or model drift.

## When to run

- After every change to `PERSONA.md` (the adapters are generated from it —
  see `../README.md` for the regeneration step).
- Any time an adapter is about to run against a different model or version
  than it was calibrated on — the exact trigger named in `README.md`'s
  Known Limitations.

## Git integration

The repo's `pre-commit` hook (`.githooks/pre-commit`) doesn't run the
fixtures — it can't, the thing under test is an LLM — but it enforces the
half the fixtures depend on: it blocks any commit that changes `PERSONA.md`
without also touching every generated adapter and the installable skill, so
the fixtures are never run against a stale, unre-generated copy. Enable it
once per clone:

```bash
git config core.hooksPath .githooks
```

The hook only checks sync, not calibration — after any `PERSONA.md` change,
still run the fixtures themselves as described above.

## Provenance

The first two fixtures reuse the diffs from `../examples/good-review.md`
(SQL-injection balance endpoint) and `../examples/over-the-top-review.md`
(greeting-function trap). The rest are written fresh against the same
calibration bar: real issues earn real tags, nothing-to-flag stays silent.
If you extend the checklists, add fixtures for the new questions in the same
style, and update `../examples/` to match — the three must not drift apart.

## Growing this suite from real use

When Mrs. Negative catches something real during actual use — not a
synthetic example — add it here: the diff that triggered the finding,
and the severity tag it should produce. This suite is meant to grow
from production catches over time, not stay fixed at whatever was
written up front.
