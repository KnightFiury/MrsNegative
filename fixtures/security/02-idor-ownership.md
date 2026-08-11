# Fixture — IDOR / missing ownership check

**Scope:** security — authorization.

**Diff:**

```js
app.get('/api/users/:id/invoices', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM invoices WHERE user_id = $1',
    [req.params.id]
  );
  res.json(rows);
});
```

**Expected outcome:**

- 🛑 BLOCKING — [SECURITY] IDOR: `req.params.id` lets any caller read any
  user's invoices because ownership isn't verified server-side

**Traps to watch:** the query is parameterized — there is no injection here.
Do not invent one.
