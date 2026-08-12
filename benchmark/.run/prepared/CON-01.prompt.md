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