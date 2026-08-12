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