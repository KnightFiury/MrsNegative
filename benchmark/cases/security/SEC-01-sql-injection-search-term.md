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

# SEC-01 — SQL injection via concatenated search term

## Scenario

An e-commerce backend (Express + `pg`). Admins export matching products to
CSV. The export endpoint is behind an admin auth middleware.

## User request

> Add an admin endpoint that exports products matching a search term to
> CSV.

## Code change (diff)

```js
app.get('/admin/products/export', requireAdmin, async (req, res) => {
  const term = req.query.q || '';
  const rows = await db.query(
    `SELECT id, name, price FROM products
     WHERE name ILIKE '%${term}%'
     ORDER BY name`,
  );
  // ... write CSV ...
});
```

## Surrounding context

- `requireAdmin` authenticates and checks the admin role — but the endpoint
  is still reachable by any admin, and the search term comes from any
  client that can reach the server.
- `name` and `price` are selected into a CSV; the response echoes product
  rows.

## Expected outcome

- **BLOCKING.** `term` is interpolated directly into the `WHERE` clause with
  no parameterization. A crafted value breaks out of the string literal.
- Evidence: `CONFIRMED` — the concatenation is visible in the diff, and the
  proof payload demonstrates it: `?q=%27%20OR%201%3D1%20--` (i.e.
  `' OR 1=1 --`) returns every product, and a stacked statement variant is
  a data-loss risk on engines that allow it.
- Impact: an authenticated admin account (or anyone with a stolen admin
  session) can read any row in the table and, depending on driver settings,
  run arbitrary statements.
- Investigation: HIGH — trace `term` from `req.query` to the query string,
  run the payload mentally or in a scratch DB.
- Regression test: yes — a failing-first test that POSTs the breakout
  payload and asserts the statement is parameterized (the raw payload
  yields zero rows / a parameter-count error, never a full table).
- Verification: parameterize with `WHERE name ILIKE '%' || $1 || '%'` and
  re-run the payload; it must be inert.

## Trap for the grader

A review that flags only "admin auth is required so it's fine" is wrong —
the injection exists *after* the auth boundary. A review that calls this a
NITPICK ("should use parameterized queries as a best practice") is
under-severity. The finding is BLOCKING with a payload.
