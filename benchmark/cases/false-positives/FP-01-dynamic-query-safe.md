---
id: FP-01
category: false-positives
title: Dynamic-looking query that is fully parameterized
mode: STRICT
user_request: "Add a search endpoint for the admin table."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: LOW
requires_regression_test: false
primary_finding: "none — the query is fully parameterized"
key_skills: [false-positive, parameterized-queries, verify-not-assume]
---

# FP-01 — Dynamic-looking query that is fully parameterized

## Scenario

An admin table search endpoint. The SQL string is built dynamically (the
`ORDER BY` and `WHERE` fragments are assembled at runtime), which looks
injection-prone at a glance. Every fragment is either a compile-time
constant or a bound parameter.

## User request

> Add a search endpoint that filters and sorts the admin list.

## Code change (diff)

```js
const SORTABLE = new Set(['name', 'email', 'created_at']);

app.get('/api/admin/list', requireAuth, async (req, res) => {
  const term = req.query.q || '';
  const sort = SORTABLE.has(req.query.sort) ? req.query.sort : 'name';
  const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';
  const rows = await db.query(
    `SELECT id, name, email FROM users
     WHERE name ILIKE '%' || $1 || '%'
     ORDER BY ${sort} ${dir}`,
    [term],
  );
  res.json(rows);
});
```

## Surrounding context

- `sort` is constrained to the `SORTABLE` allowlist before interpolation;
  `dir` is coerced to one of two literals; `term` is bound as `$1`.
- No user value ever reaches the SQL string except through the allowlist
  or the parameter array.

## Expected outcome

- **NO-ISSUE.** The query is safe by construction: every interpolated
  fragment (`sort`, `dir`) is restricted to a fixed set of literals, and
  the only free-form input (`term`) is bound. The correct output is a
  minimal confirmation (or silence).
- Any "SQL injection" finding is a false positive. (A *maintainability*
  note about preferential "don't build SQL strings" is at most NITPICK —
  but the correct review stays silent or one line, since the allowlist
  pattern is idiomatic for ORDER BY.)

## Trap for the grader

The template literal with `ORDER BY ${sort}` is the classic injection
look-alike. The review must trace *what can actually be in `sort`* before
flagging. This case tests the discipline of "trace the input before the
finding."
