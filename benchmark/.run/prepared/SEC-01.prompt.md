## Scenario

An e-commerce backend (Express + `pg`). Admins export matching products to
CSV. The export endpoint is behind an admin auth middleware.

## User request

> Add an admin endpoint that exports products matching a search term to
> CSV.

## Code change (diff)

```js
app.get('/admin/products/export', requireAdmin, async (req, res) => {
  const term = req.query.q || '';
  const rows = await db.query(
    `SELECT id, name, price FROM products
     WHERE name ILIKE '%${term}%'
     ORDER BY name`,
  );
  // ... write CSV ...
});
```

## Surrounding context

- `requireAdmin` authenticates and checks the admin role — but the endpoint
  is still reachable by any admin, and the search term comes from any
  client that can reach the server.
- `name` and `price` are selected into a CSV; the response echoes product
  rows.