---
id: ARC-02
category: architecture
title: Idempotency moved to the client — the architecture no longer guarantees exactly-once
mode: STRICT
user_request: "Move the exactly-once guarantee into the payment client so the checkout service can call it idempotently."
severity_expected: WORTH-FIXING
evidence_expected: LIKELY
investigation_expected: HIGH
requires_regression_test: false
primary_finding: "idempotency moved out of the transaction boundary; a retry can still double-charge if the client path is not truly idempotent"
key_skills: [architecture, idempotency, boundary-movement, seam]
---

# ARC-02 — Idempotency moved to the client — the architecture no longer guarantees exactly-once

## Scenario

A checkout flow previously guaranteed exactly-once by storing
`processed_orders` inside the same DB transaction as the charge. A
refactor moves that guarantee into a shared payment client, which is
supposed to be idempotent. The movement itself is the risk: idempotency
now lives at a different layer, and the architecture's guarantee depends
on the client honoring it — which is not visible in the changed call
sites.

## User request

> Extract the payment charge into a shared client so every service calls
> it the same way, and keep the exactly-once guarantee.

## Code change (diff)

```js
// before (checkout service):
await db.transaction(async tx => {
  await tx.query('INSERT INTO processed_orders (id, status) VALUES ($1, $2)', [orderId, 'processing']);
  await chargeApi.charge({ amount, source: paymentSource });
  await tx.query('UPDATE processed_orders SET status = $1 WHERE id = $2', ['charged', orderId]);
});

// after (refactor):
import { chargeOnce } from '../lib/payments'; // "handles idempotency"
await chargeOnce({ orderId, amount, source: paymentSource });
await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['charged', orderId]);
```

## Surrounding context

- `lib/payments.js` (in the repo, not in the diff) implements `chargeOnce`
  — the reviewer can read whether it is truly idempotent.
- The `processed_orders` insert inside the DB transaction was the original
  exactly-once mechanism; the refactor removes it from the checkout flow.

## Expected outcome

- **WORTH-FIXING** with evidence **LIKELY**. The architecture changed
  where the exactly-once guarantee lives: it moved from an in-transaction
  record (provable, atomic with the charge) to a *client-side* promise
  (`chargeOnce`). The guarantee now holds only if `chargeOnce` is
  genuinely idempotent across process restarts and network retries. The
  diff removes the old mechanism from the flow; whether the new one fully
  replaces it requires reading `lib/payments.js`.
- Evidence: `LIKELY` — the seam is visible (the old in-transaction guard
  is gone from the checkout path), and reading `lib/payments.js` would
  settle it — but the case presents the module boundary, not the
  implementation, so the reviewer must either read it or mark it
  unverified-in-session. Correct calibration: flag the boundary change,
  and if the module was not opened, tag the finding UNVERIFIED/LIKELY and
  name the check.
- Investigation: HIGH — architecture cases require reading across the
  module boundary, not just the diff.
- Impact: a double-charge regression on retry if the client is not truly
  idempotent — but the failure is *conditional* on an unread module, so
  the severity is WORTH-FIXING with a required verification, not an
  asserted BLOCKING.
- Regression test: not required by the case; the verification is reading
  the client and confirming the retry path.

## Trap for the grader

The refactor "extracts a client" — the most conventional kind of change.
The trap is approving the movement of a hard guarantee (exactly-once)
without verifying the new owner actually provides it. A review that says
"chargeOnce handles it" is trusting a function name; the correct review
checks the boundary change and reads (or flags unread) the module.
