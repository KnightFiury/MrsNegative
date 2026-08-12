---
id: SEC-02
category: security
title: Parameterized query that looks injectable
mode: STRICT
user_request: "Add an endpoint that searches orders by status."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: LOW
requires_regression_test: false
primary_finding: "none — the query is fully parameterized"
key_skills: [security, false-positive, parameterized-queries]
---

# SEC-02 — Parameterized query that looks injectable

## Scenario

An Express + `pg` backend. A new endpoint lists orders filtered by status.
The code uses a `pg` parameterized query, but the string literal uses
`$1` placeholders and reads like it might be string interpolation.

## User request

> Add an endpoint that lists orders by status, e.g. `?status=shipped`.

## Code change (diff)

```js
app.get('/api/orders', async (req, res) => {
  const status = req.query.status || 'pending';
  const allowed = new Set(['pending', 'shipped', 'cancelled']);
  if (!allowed.has(status)) return res.status(400).end();
  const rows = await db.query(
    `SELECT id, status FROM orders WHERE status = $1 ORDER BY id`,
    [status],
  );
  res.json(rows);
});
```

## Surrounding context

- `db` is a `pg` client; the second argument is the bound-parameter array.
- `status` is validated against an allowlist *and* bound as `$1`.

## Expected outcome

- **NO-ISSUE.** The query is parameterized: `status` is bound as `$1`, and
  additionally validated against an allowlist. There is no injection
  surface and no other meaningful defect.
- The correct output is a minimal confirmation (or silence). Any
  "SQL injection via `$1`" finding is a false positive.

## Trap for the grader

A reviewer who sees `$1` inside a template literal and flags
"string-interpolated SQL" without recognizing the bound-parameter array is
misreading the API. This is a safe case that must stay silent.
