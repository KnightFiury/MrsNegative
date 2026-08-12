## Review

The core problem is that this refactor relocates the exactly-once mechanism to a layer whose inner workings never appear in the diff.

**What the original guaranteed.** The `processed_orders` INSERT ran inside the same DB transaction as the charge, so the idempotency record, the external charge dispatch, and the status transition were one atomic unit. A retry that re-inserted the same `orderId` would hit the idempotency key and skip re-charging; a failure before commit rolled the whole thing back cleanly. That ordering — record exists → charge → record confirms "charged" → commit — is what made "exactly once" true.

**What the refactor actually changes.** In the new code, `chargeOnce(...)` and `UPDATE orders ... SET status='charged'` are two independent top-level statements with no shared transaction. Both the idempotency record write (now inside `chargeOnce`) and the order status update are decoupled:
- There is a new crash window *after* the charge succeeds but *before* the `UPDATE orders` runs: the money is taken, yet the order is left "uncharged". Recovery depends entirely on `chargeOnce` having durably persisted the record before dispatching — and on the checkout being retried.
- The comment `"handles idempotency"` is a claim, not a guarantee. Nothing in the changed call sites demonstrates that `processed_orders` (or an equivalent durable keyed record) is actually written, let alone atomically with respect to the charge. If `chargeOnce` only keeps a volatile/in-memory dedupe, or writes the record *after* dispatching, exactly-once silently becomes at-least-once — precisely the failure mode the user asked to preserve against.

**Needed to preserve the intent.** (1) Read `lib/payments.js`: confirm `chargeOnce` durably inserts the ordered-id idempotency record (e.g., `ON CONFLICT (order_id) DO NOTHING`, checking the existing status) *before* dispatching, and only calls the charge API when the record is newly created or in a retryable state. (2) Make the order-status update recoverable from that record — ideally derive `orders.status` from the idempotency record (or wrap record+status in one transaction in `chargeOnce`) so a crash can't strand a charged-but-unmarked order.

**Note in its favor:** holding the DB transaction open across the external HTTP charge (the original pattern) is itself a long-lock risk, so moving the external call out is the right direction — but the substitution must fully replace the old guarantee, and this diff gives no reason to believe it does.

**Verify:** read `lib/payments.js` for the durable-record + single-dispatch logic; then run an idempotency test (call `chargeOnce` twice with the same `orderId`, assert the mocked charge API fires exactly once, including across a simulated crash between charge and `UPDATE orders`).

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
  "regressionStance": "confirm",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "Exactly-once now hinges on unverified chargeOnce internals plus a new non-atomic gap between the charge and the orders status update, so the guarantee needs confirmation against lib/payments.js before this ships."
}
```
