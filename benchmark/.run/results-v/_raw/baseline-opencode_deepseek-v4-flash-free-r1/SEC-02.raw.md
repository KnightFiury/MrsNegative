## Review

The SQL is **safe** — this is not string interpolation. `$1` is the standard `pg` placeholder, and `status` is passed as the bound-parameter array plus an allowlist guard, so there is no SQL injection here (an invented injection finding would be a false positive).

The real issue is the response shape. `pg`'s `db.query()` resolves to a `QueryResult` object (`{ rows, rowCount, command, fields, oid, ... }`), **not** the bare rows array. `res.json(rows)` therefore serializes the entire result object (including `command: "SELECT"`, `fields`, `rowCount`, etc.) instead of the expected JSON array, silently breaking the API contract the endpoint is supposed to deliver. Verified via the documented `pg` API and surrounding context that `db` is a `pg` client.

Fix: `const { rows } = await db.query(...); res.json(rows);` (or `res.json(rows.rows)`). No regression test is warranted — the change is one line and covered by the allowlist-parameterization already present.

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
  "notes": "The SQL is properly parameterized (no injection); the real defect is that pg query resolves to a QueryResult, so res.json(rows) returns the whole result object instead of the rows array."
}
```
