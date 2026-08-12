## Review

The movement is the finding. The old flow enforced exactly-once inside the checkout service itself: the `processed_orders` insert and the `chargeApi.charge` sat in one DB transaction, so the dedup record and the money movement were atomic and visible right there in the diff. After the refactor, nothing in the changed lines guarantees exactly-once. The checkout flow now does `chargeOnce(...)` and then a bare, non-transactional `UPDATE orders` — and the entire guarantee has been delegated to `lib/payments.js`, which is not in this diff.

That is a real contract change, not a stylistic one, and it lands on a seam (shared client consumed by every service). The risk trace is straightforward:

1. `chargeOnce({ orderId, ... })` returns.
2. Process dies (or the DB write fails) before the `UPDATE orders` runs.
3. Retry re-invokes `chargeOnce({ orderId, ... })` with the same `orderId`.
4. The only thing preventing a second charge is whether `chargeOnce` dedups on `orderId` — a fact invisible at this call site.

Separately, even with a perfectly idempotent client, the charge and the status write are no longer atomic: a crash between them leaves money moved and the order still `processing`, permanently. And the `processed_orders` dedup row is gone entirely — so the dedup store (if any) has to live inside the client or at the provider.

So the review hinges on evidence I do not have in this diff. I have not read `lib/payments.js`. Until I do, this cannot be `BLOCKING` — the client may genuinely be idempotent on `orderId`, in which case the exactly-once guarantee survives and the residual issue is just the non-atomic status update. But the guarantee is now unverifiable at the call site, which is exactly what the user asked to keep, so it cannot pass silently either.

⚠️ [RELIABILITY] [LIKELY] The exactly-once guarantee has moved entirely into `chargeOnce`, which is invisible in this diff — a crash/retry between the charge and the `orders` UPDATE re-invokes it with the same `orderId`, and nothing in the changed lines prevents a second charge.
   Evidence: diff trace — no transactional dedup remains; `UPDATE orders` is outside any transaction; the only guard is the client's idempotency, which I could not inspect in-session (file exists in-repo but is outside the diff). The client's actual behavior is assumed, not verified.
   Impact: a retry after a partial failure double-charges the customer if the client isn't keyed on `orderId`.
   → Fix: read `lib/payments.js` and confirm `chargeOnce` dedups on `orderId` against a durable store (provider idempotency key or DB record). If it does not, restore a transactional guard at the call site (insert the dedup row in the same transaction as the charge, or make the client's dedup keyed and atomic). Also decide what recovers the gap between charge completion and the status update — either make them atomic or define the reconciliation path.
   Verification: read `chargeOnce`; then call it twice with the same `orderId` and assert exactly one charge is recorded; kill the process between the charge and the status update, resume, and assert the order is not charged twice.

⚠️ [RELIABILITY] [CONFIRMED] The status write is no longer atomic with the charge — a crash between them leaves money moved and the order `processing`.
   Evidence: the two statements are now sequential and untransacted in the diff.
   Impact: permanent state inconsistency on the crash path.
   → Fix: fold the status update into the same transaction/store as the dedup record, or add a reconciliation job keyed on `orderId`.
   Verification: crash-injection test between the two statements; assert the order resolves to a single consistent terminal state.

Regression stance: the fix for the first finding is a real-risk fix — require a test that replays `chargeOnce` with a duplicate `orderId` and asserts a single charge, plus the crash-window test.

You're not actually confident this handles the process dying between the charge and the status update without charging twice — are you, and you haven't read `chargeOnce` to prove otherwise?

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
  "notes": "The guarantee demonstrably moved off the call site, but whether it actually fails depends on chargeOnce's idempotency, which is outside the diff — so it caps at WORTH-FIXING pending that client read, escalating to BLOCKING if the client isn't keyed on orderId."
}
```
