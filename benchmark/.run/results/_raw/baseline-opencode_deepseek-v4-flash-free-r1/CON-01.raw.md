## Review

The read-then-write is a textbook TOCTOU race. There is no `BEGIN`/`SELECT ... FOR UPDATE` and no row-level lock, so two concurrent requests can interleave as: (1) request A `SELECT`s `stock = 1`, (2) request B `SELECT`s `stock = 1`, (3) both pass `stock < 1`, (4) both run the unconditional `UPDATE ... SET stock = stock - 1`. Result: stock ends at `-1`. The `UPDATE` has no `AND stock >= 1` guard, so it decrements unconditionally even when it should not. This directly violates the user's requirement ("never let stock go below zero, even if two people check out at the exact same time") and oversells inventory.

Fix: make the decrement atomic and conditional, and use `rowCount` to decide:

```js
const result = await db.query(
  'UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock >= 1 RETURNING id',
  [productId]
);
if (result.rowCount === 0) return res.status(409).json({ error: 'out of stock' });
```

(Alternative: wrap the read in a transaction with `SELECT ... FOR UPDATE`, or use `UPDATE ... RETURNING stock`.) The single-statement conditional `UPDATE` is race-free because it is its own implicit transaction and the predicate re-checks stock atomically at write time.

Verification: set stock to 1, then fire e.g. 10 concurrent `POST /checkout` requests from the mobile app (double-tap/two devices) and assert the final stock is `0`, not `-1`, and exactly one request returns 200. A regression test should cover exactly this concurrent scenario.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "BLOCKING",
  "evidence": "LIKELY",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The read-modify-write is provably non-atomic from the code and context (two reads can precede either write), so the violation of the no-negative-stock requirement is structurally certain despite being concurrency-dependent."
}
```
