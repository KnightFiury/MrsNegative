## Review

The primary finding is a SQL injection. `term` originates from the client-controlled `req.query.q` and is string-interpolated directly into the ILIKE pattern (`'%${term}%'`), so the parameter is never separated from the SQL text. The input-to-sink trace is fully visible in the diff: `req.query.q` → `term` → `db.query` string. `requireAdmin` only restricts *who* can call the endpoint; it does nothing to sanitize the parameter, so any authenticated admin (or a session/CSRF-driven request) can inject. A payload such as `?q=' OR 1=1--` returns every row instead of a filtered set, and `?q='; DROP TABLE products;--` (node-postgres allows stacked statements via the simple query protocol) escalates to arbitrary statement execution.

The fix is a parameterized query, which preserves the requested behavior:

```js
app.get('/admin/products/export', requireAdmin, async (req, res) => {
  const term = req.query.q || '';
  const rows = await db.query(
    `SELECT id, name, price FROM products
     WHERE name ILIKE $1
     ORDER BY name`,
    [`%${term}%`],
  );
  // ... write CSV ...
});
```

Verification is concrete and runnable: `curl "http://localhost:3000/admin/products/export?q=%27%20OR%201=1--"` should return all products (and a non-injected `?q=zzz` should return none); adding a `?q='` alone should produce an SQL error. Because injection is confirmed by static inspection of the code, no runtime proof is required to establish the finding. A regression test asserting that a malicious `q` returns no error and no widened result set is appropriate given the severity.

Secondary (lower-tier) consideration: since the response writes product-controlled data into CSV, product names beginning with `=`, `+`, `-`, or `@` can trigger spreadsheet formula injection when the CSV is opened in Excel. Worth noting, but the SQL injection is the dominant issue.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "BLOCKING",
  "evidence": "CONFIRMED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "SQL injection is directly visible in the diff (raw term interpolated into the ILIKE pattern), so BLOCKING/CONFIRMED is warranted; the parameterized $1 fix preserves the endpoint's intent."
}
```
