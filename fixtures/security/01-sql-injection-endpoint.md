# Fixture — SQL injection endpoint

**Scope:** security — injection + missing auth. Reuses the diff from
`../../examples/good-review.md`.

**Diff:**

```js
app.post('/users/:id/balance', async (req, res) => {
  const query = `UPDATE users SET balance = balance - ${req.body.amount} WHERE id = ${req.params.id}`;
  await db.query(query);
  res.json({ ok: true });
});
```

**Expected outcome:**

- 🛑 BLOCKING — [SECURITY] SQL injection via `req.body.amount` / `req.params.id` concatenated into the query
- 🛑 BLOCKING — [SECURITY] no auth check before mutating another user's balance
- ⚠️ WORTH-FIXING — [RELIABILITY] `amount` not validated as a number; no guard against a negative balance
- The concurrency check may come back clean (the SQL subtraction is atomic) — that must be stated plainly, not padded into a manufactured finding

**Traps to watch:** escalating the validation nitpick to BLOCKING, or
inventing a BLOCKING issue beyond the two real ones.
