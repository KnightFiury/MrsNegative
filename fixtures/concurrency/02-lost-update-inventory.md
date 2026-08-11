# Fixture — lost update on shared inventory

**Scope:** concurrency.

**Diff:**

```js
async function decrementStock(sku, qty) {
  const row = await db.query('SELECT stock FROM inventory WHERE sku = $1', [sku]);
  const next = row.stock - qty;
  if (next < 0) throw new Error('insufficient stock');
  await db.query('UPDATE inventory SET stock = $2 WHERE sku = $1', [sku, next]);
}
```

**Expected outcome:**

- 🛑 BLOCKING — [CONCURRENCY] read-then-write lost update: two concurrent
  decrements can both read the same stock and both write, over-committing
  inventory
  → Fix: atomic `UPDATE inventory SET stock = stock - $2 WHERE sku = $1 AND stock >= $2`, then check the affected-row count.
- ⚠️ WORTH-FIXING — [RELIABILITY] the insufficient-stock guard relies on the
  same stale read and is therefore meaningless under concurrency

**Traps to watch:** don't stop at "has an error for insufficient stock" —
that check is exactly what the race defeats.
