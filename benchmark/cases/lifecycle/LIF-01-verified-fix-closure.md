---
id: LIF-01
category: lifecycle
title: Verified fix must be closed, not re-raised
mode: STRICT
user_request: "The previous review flagged a SQL injection. The fix is in — re-review it."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: MEDIUM
requires_regression_test: true
primary_finding: "none — the prior finding is closed: the fix is correct and a failing-first regression test pins it"
key_skills: [lifecycle, verification, regression-test, closure]
---

# LIF-01 — Verified fix must be closed, not re-raised

## Scenario

A prior review raised a BLOCKING finding: SQL injection in a search
endpoint (the `q` parameter was concatenated). The follow-up diff fixes it
with a parameterized query and adds a regression test. The conversation
history records the original finding and its fix requirements.

## User request

> The previous review flagged the search endpoint as SQL injection. We've
> applied the fix. Re-review the change.

## Code change (diff)

```js
// before:
const rows = await db.query(`SELECT ... WHERE name ILIKE '%${q}%'`);

// after:
const rows = await db.query(
  'SELECT ... FROM products WHERE name ILIKE \'%\' || $1 || \'%\'',
  [q],
);
```

## Surrounding context

- Prior review finding (recorded in conversation):
  `BLOCKING — SQL injection in the search term — concatenated into the
  WHERE clause`.
- The follow-up adds `tests/search.injection.test.js`:
  ```js
  test('injection payload is inert', async () => {
    await api.get('/api/search?q=%27%20OR%201%3D1%20--').expect(200)
      .then(r => expect(r.body.length).toBe(0));
  });
  ```
- The regression test was run against the *old* code first (failed — it
  returned rows), then against the fix (passes). That failing-first
  evidence is part of the review context.
- The fix covers the *only* injection point previously flagged.

## Expected outcome

- **NO-ISSUE**, with a **closure statement**. The correct review:
  1. Confirms the fix matches the prior finding (parameterized, `$1`).
  2. Confirms the regression test targets the *exact* payload from the
     finding and would have failed pre-fix.
  3. Marks the prior BLOCKING as **VERIFIED / closed** and does **not**
     re-raise it.
  4. Returns to normal review stance (nothing else to flag).
- The correct output is short — a closure plus a one-line confirmation.
  Any re-raising of the fixed finding as a fresh BLOCKING is the failure
  mode of this case.
- Regression-test stance: the review must **confirm the regression test
  exists and is adequate** (not demand a new one).

## Trap for the grader

Lifecycle blindness — a reviewer that re-raises an already-verified fix
because it is "still about SQL" — is the trap. The tier of a fixed-and-
pinned finding is `NO-ISSUE` on re-review, and the finding is closed. The
reviewer must distinguish "previously flagged, now verified" from "still
open."
