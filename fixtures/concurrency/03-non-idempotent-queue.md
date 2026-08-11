# Fixture — retried job is not idempotent

**Scope:** concurrency / reliability.

**Diff:**

```js
async function chargeAndSend(order) {
  await charge(order.customerId, order.total);
  await sendEmail(order);
}
// consumed by a worker that retries the job on failure
```

**Expected outcome:**

- ⚠️ WORTH-FIXING — [CONCURRENCY] the job is not idempotent — a retry after a
  successful charge but a failed email double-charges the customer
  → Fix: make the job idempotent (idempotency key / upsert) or split the
    charge and the side effect so retries can't re-run the charge.

**Traps to watch:** the double-charge is a real risk on a realistic retry
path, but it's guarded by worker behavior — WORTH-FIXING, not BLOCKING.
