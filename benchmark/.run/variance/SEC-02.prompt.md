## Scenario

An Express + `pg` backend. A new endpoint lists orders filtered by status.
The code uses a `pg` parameterized query, but the string literal uses
`$1` placeholders and reads like it might be string interpolation.

## User request

> Add an endpoint that lists orders by status, e.g. `?status=shipped`.

## Code change (diff)

```js
app.get('/api/orders', async (req, res) => {
  const status = req.query.status || 'pending';
  const allowed = new Set(['pending', 'shipped', 'cancelled']);
  if (!allowed.has(status)) return res.status(400).end();
  const rows = await db.query(
    `SELECT id, status FROM orders WHERE status = $1 ORDER BY id`,
    [status],
  );
  res.json(rows);
});
```

## Surrounding context

- `db` is a `pg` client; the second argument is the bound-parameter array.
- `status` is validated against an allowlist *and* bound as `$1`.