## Review

This is a textbook check-then-act race (TOCTOU). `SELECT stock` and `UPDATE ... SET stock = stock - 1` are executed as two independent statements, each in its own implicit transaction with no lock between them. The user's requirement — "never let stock go below zero, even if two people check out at the exact same time" — is exactly the case that breaks here.

Concrete interleaving: product has `stock = 1`. Two concurrent `POST /checkout` requests both run the `SELECT`, both read `stock = 1`, both pass the `row.stock < 1` guard, and both execute `stock = stock - 1`. Result: both orders succeed, `stock` ends at `-1`. The guard checked stale data, so the invariant is violated precisely in the concurrent scenario the user called out. The row-count isn't inspected either, so a failed update would silently proceed to order creation.

The fix is to make the check and decrement a single atomic statement and gate on the affected rows:

```js
app.post('/checkout', requireAuth, async (req, res) => {
  const { productId } = req.body;
  const result = await db.query(
    'UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0',
    [productId]
  );
  if (result.rowCount === 0) return res.status(409).json({ error: 'out of stock' });
  // ... create order ...
});
```

Since Postgres row updates take row locks, two concurrent `UPDATE ... WHERE stock > 0` statements serialize: only one matches, the other affects 0 rows and gets the 409. This preserves the intent (no overselling, no negative stock) while staying a single round-trip.

A regression test should exercise the concurrency directly: seed a product with `stock = 1`, fire two `POST /checkout` requests concurrently (e.g., `Promise.all`), assert exactly one succeeds + the other returns 409, and assert `stock = 0` afterwards.

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
  "notes": "Verified interleaving of two independent statements proves double-decrement to -1 with stock=1; atomic UPDATE ... WHERE stock > 0 plus rowCount check fixes it, backed by a concrete concurrent-request test."
}
```
