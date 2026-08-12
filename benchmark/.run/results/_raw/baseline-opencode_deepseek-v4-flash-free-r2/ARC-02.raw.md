## Review

The refactor moves the exactly-once guarantee entirely off-diff, which is precisely the problem. The user asked to "keep the exactly-once guarantee," but the diff alone cannot demonstrate it — nothing in the new call sites shows how a retried checkout is prevented from double-charging.

Two concrete observations follow directly from the diff:

1. The original mechanism is gone. The `INSERT INTO processed_orders` inside `db.transaction` — which durably recorded the order as `processing` before the external charge — is removed from the checkout path. The entire guarantee now reduces to "chargeOnce in `lib/payments.js` handles idempotency," which is invisible here. Whether that client durably persists an idempotency key (e.g., a unique constraint on `orderId`) atomically with the charge is the crux of the refactor and must be read in `lib/payments.js`.

2. Even granting `chargeOnce` is idempotent, the remaining steps are non-atomic. `await db.query('UPDATE orders SET status = $1...')` runs after the charge with no transaction linking them. A crash between the charge and the update leaves the order unmarked while the card was already charged; retry correctness then depends solely on `chargeOnce` recognizing the order as already processed. The old code never had this window because the record and the charge shared one transaction.

This is not a confirmed defect from the diff alone — it is a moved, unverifiable invariant. So: verify `chargeOnce` (durable idempotency record atomically with the charge, returning the pre-existing result on retry), tie the `orders.status` update to that same idempotency record or restore the transactional write, and protect it with a double-invocation test asserting exactly one external charge plus a fault-injection test for the charge-then-crash window. Do not merge this on the diff alone.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
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
  "notes": "Finding is grounded in confirmed structural changes from the diff (transactional mechanism removed, non-atomic charge/status update), but the crux—chargeOnce's idempotency in lib/payments.js—is off-diff and unverifiable from the provided context, so WORTH-FIXING rather than BLOCKING."
}
```
