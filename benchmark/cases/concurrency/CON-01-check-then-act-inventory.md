---
id: CON-01
category: concurrency
title: Check-then-act on inventory — oversell under concurrency
mode: STRICT
user_request: "Deduct stock only when available; never sell below zero."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "separate SELECT-then-UPDATE allows two requests to both pass the stock check"
key_skills: [concurrency, check-then-act, interleaving]
---

# CON-01 — Check-then-act on inventory — oversell under concurrency

## Scenario

A storefront API decrements inventory in a checkout flow. The code reads
the current stock, decides whether the purchase is allowed, then updates.
The read and the write are two separate statements.

## User request

> Deduct stock only when there is stock available. Never let stock go
> below zero, even if two people check out at the exact same time.

## Code change (diff)

```js
app.post('/checkout', requireAuth, async (req, res) => {
  const { productId } = req.body;
  const row = await db.query('SELECT stock FROM products WHERE id = $1', [productId]);
  if (row.stock < 1) return res.status(409).json({ error: 'out of stock' });
  await db.query('UPDATE products SET stock = stock - 1 WHERE id = $1', [productId]);
  // ... create order ...
});
```

## Surrounding context

- `db` is Postgres; each `db.query` is its own implicit transaction —
  there is no surrounding `BEGIN`/lock.
- The checkout is exercised by a mobile app that can fire concurrent
  requests (double-tap, two devices, retries).

## Expected outcome

- **BLOCKING.** The stock check (`SELECT`) and the decrement (`UPDATE`)
  are not atomic. Two concurrent checkouts can both read `stock = 1`, both
  pass `if (row.stock < 1)`, and both decrement — stock goes to `-1` and
  two orders are created for one unit.
- Evidence: `CONFIRMED` — the interleaving is fully determined by the
  code:
  1. Request A: `SELECT stock` → 1
  2. Request B: `SELECT stock` → 1
  3. Request A: `stock < 1`? No → `UPDATE` → 0
  4. Request B: `stock < 1`? No → `UPDATE` → -1
  No external factor is needed; the race is structural in the two-statement
  sequence. (A reviewer may cite the `SELECT ... FOR UPDATE` / atomic
  `UPDATE ... WHERE stock > 0` fix.)
- Impact: oversell and negative inventory — money-critical, realistic
  concurrency.
- Investigation: HIGH — a concurrency finding without a written
  interleaving is not `CONFIRMED`; the interleaving is required evidence.
- Regression test: yes — fire N concurrent checkouts at a product with
  stock 1 and assert exactly one succeeds and stock never goes below 0.
- Verification: fix with an atomic conditional update
  `UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0`
  and assert `rowCount === 1`; re-run the concurrent test.

## Trap for the grader

Sequential reading of the code shows correct behavior — the bug only
appears in the interleaving. A review that says "this looks fine
sequentially" without producing the interleaving misses the finding; a
review that says "it *could* race" without writing the steps does not earn
`CONFIRMED`.
