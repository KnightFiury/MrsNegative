## Review

The core issue is straightforward and it's not a theory — the search term is interpolated straight into the SQL string:

```js
const rows = await db.query(
  `SELECT id, name, price FROM products
   WHERE name ILIKE '%${term}%'
   ORDER BY name`,
);
```

**🛑 [SECURITY] [CONFIRMED] Unsanitized `req.query.q` interpolated into a SQL query — SQL injection.**
- **Evidence:** `q=' OR '1'='1' --` turns the predicate into `WHERE name ILIKE '%' OR '1'='1' --%'`, returning every product row. `q='; DROP TABLE products; --` yields `WHERE name ILIKE '%'; DROP TABLE products; --%'` — the statement terminates and the next statement executes. The injection point is visible in the diff itself; no further proof is needed.
- **Impact:** any client that can reach the endpoint (and the auth gate is the only barrier, per the context) can read the entire products table or execute destructive statements.
- **→ Fix:** parameterize the value and keep the wildcards out of the SQL text:
  ```js
  const rows = await db.query(
    `SELECT id, name, price FROM products
     WHERE name ILIKE '%' || $1 || '%'
     ORDER BY name`,
    [term],
  );
  ```
  (Passing `%${term}%` as a bound parameter `$1` against `ILIKE $1` is equivalent; the key is that `term` never touches the query text.)
- **Verification:** hit the endpoint with `q=' OR '1'='1' --` and assert only matching products come back — not all rows — and re-run with the `DROP TABLE` payload and assert the table still exists. Wire that into a regression test that fails against the current code and passes against the fix.

⚠️ [SECURITY] [LIKELY] **CSV formula injection.** Product `name` values that begin with `=`, `+`, `-`, or `@` get written verbatim into the CSV; when a user opens it in a spreadsheet, the cell executes as a formula. The export serves admin-sourced data, so the realistic attacker is a client who can place a product name in the catalog. **→ Fix:** prefix dangerous leading characters with a single quote (or strip them) when emitting the CSV cell. **Verification:** insert a product named `=2+2` and confirm the exported CSV contains `'=2+2`, not the raw formula.

No caller-contract concerns: the endpoint is new, and the response shape (product rows as CSV) matches the request's intent — "export matching products to CSV." The auth check is present; the remaining risk is that *any* admin, and anyone who reaches the server, can drive the injection through `q`. The `term = req.query.q || ''` default handles the missing-query case correctly.

You're not actually confident this handles a crafted `q` without letting it run as SQL, are you — and the diff doesn't verify that anywhere.

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
  "notes": "The string-interpolated ILIKE clause is a direct, visible SQL injection sink — BLOCKING is earned by inspection of the diff itself, with a runnable payload as proof."
}
```
