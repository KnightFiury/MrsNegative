# Fixture — BATCH mode for a mechanical rename

**Scope:** review modes — a large mechanical change reviewed in BATCH mode:
same rules, grouped findings, still tagged and logged.

**Diff:**

```js
- function calc(a, b)      { return a + b; }
- function calcTotal(x, y) { return x * y; }
- function calcTax(p, q)   { return p * q; }
+ function sum(a, b)              { return a + b; }
+ function productOf(x, y)        { return x * y; }
+ function taxOn(p, rate)         { return p * rate; }
```

(Part of a 40-symbol batch rename `calc*` → descriptive names across three
files; no logic changed.)

**Expected outcome:**

- The review runs in BATCH mode: findings grouped by category in one pass,
  mode stated (e.g. `mode=batch`), each finding still severity-tagged and
  still logged.
- 💭 NITPICK (batched) — [MAINTAINABILITY] `productOf` vs. `taxOn` — the
  names are better, but `taxOn`/`productOf` overlap in meaning and one of the
  two should match its call site's language.
- No WORTH-FIXING or BLOCKING: a pure rename with no logic change cannot
  earn severity. Missing call sites (renaming `calc` without updating its
  callers) WOULD be a real finding — but this diff shows only the rename,
  so absent evidence, it stays quiet.
- STRICT mode on this diff (one full pass per symbol, individually narrated)
  is a calibration miss in the other direction — this is what BATCH is for.

**Traps to watch:** narrating 40 renamed symbols as 40 separate findings;
conversely, using BATCH to smuggle a severity-tagless pass on a real bug.
