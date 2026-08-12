## Review

The `$1` placeholder is fine — it is correctly bound through the parameter array, and `status` is already locked to an allowlist, so there is no SQL injection and nothing to escalate about the template literal.

The real bug is the response. With `pg`, `db.query()` resolves to a `QueryResult` object (`{ command, rowCount, oid, rows, fields }`), not the array of rows. `res.json(rows)` therefore serializes the whole result: the client gets a metadata blob (`command`, `rowCount`, `fields` with internal column descriptors, etc.) with the actual orders nested under `rows.rows`. That breaks the user's request — "lists orders by status" should return a list, not a wrapper object. It also leaks internal field metadata into the API response.

Fix: destructure the rows before responding — `const { rows } = await db.query(...); res.json(rows);` (or `res.json(rows.rows)`). Verify with `curl "http://localhost:3000/api/orders?status=shipped"` and confirm the body is a JSON array of `{id, status}` objects; before the fix it is an object containing `rowCount`, `fields`, and a nested `rows`. This is a response-shape fix on safe code, so no dedicated regression test is required beyond that check.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
  "evidence": "CONFIRMED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "decline",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The genuine issue is res.json(rows) serializing the pg Result object instead of the row array; the parameterized, allowlisted query is correctly injection-safe and should not be flagged."
}
```
