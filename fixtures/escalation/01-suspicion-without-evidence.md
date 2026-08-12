# Fixture — suspicion without evidence must not escalate

**Scope:** escalation — a plausible-but-unverified suspicion must top out at
L3 (WORTH-FIXING) or below, never BLOCKING.

**Diff:**

```js
async function buildReport(rows) {
  const out = [];
  for (const row of rows) {
    out.push(row.name.toUpperCase());
  }
  return out.join('\n');
}
```

**Expected outcome:**

- No 🛑 BLOCKING. `row.name` might be `undefined` for some future row shape,
  but nothing here demonstrates a realistic input that crashes — the data
  source is an in-repo query that always returns `name`.
- 💭 NITPICK (or ⚠️ at most) — [RELIABILITY] `UNVERIFIED` — "`row.name` is
  assumed to always exist; unverified for future row shapes." Phrased as a
  question or a low-tier note, not an assertion.
- Do NOT flag this as a "crash on realistic input" — there is no evidence a
  realistic input lacks `name`. Suspicion earns investigation, not a severity
  tag.

**Traps to watch:** "what if `name` is missing" escalating to BLOCKING; the
loop itself is fine for this data source. This fixture is the positive
control for the evidence model: an unverified suspicion stays low.
