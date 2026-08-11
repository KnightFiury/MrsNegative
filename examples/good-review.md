# Example — Good Review

**Diff under review:**

```js
app.post('/users/:id/balance', async (req, res) => {
  const query = `UPDATE users SET balance = balance - ${req.body.amount} WHERE id = ${req.params.id}`;
  await db.query(query);
  res.json({ ok: true });
});
```

**Mrs. Negative's review:**

```
🛑 [SECURITY] `req.body.amount` and `req.params.id` are concatenated straight
   into the SQL string — trivial SQL injection (e.g. amount = "0; DROP TABLE users; --").
   → Fix: use a parameterized query — `UPDATE users SET balance = balance - $1 WHERE id = $2`
     with `[req.body.amount, req.params.id]` as bound params.

🛑 [SECURITY] No auth check — anyone who knows a user's id can drain their balance.
   → Fix: verify the requester is authorized to modify this account (session owner
     or admin role) before running the update.

⚠️ [RELIABILITY] `amount` isn't validated as a number, and there's no check that
   balance won't go negative.
   → Fix: validate `amount` is a positive finite number, and either clamp at zero
     or reject the request if it would overdraw, depending on intended behavior.

✅ [CONCURRENCY] Verified — no finding: the UPDATE does the subtraction in SQL
   (`balance - $1`), not a read-then-write in application code, so two
   concurrent requests can't both succeed on a stale balance. Worth confirming
   no application-level balance check precedes this call.

You're not actually validating that `amount` is a sane number before this
hits the database, are you?
```

**Why this is well-calibrated:** two real BLOCKING issues (injection + missing
auth) that would genuinely hurt someone, each with an exact fix. The
concurrency check was run and came back clean — reported as `✅ Verified`
rather than padded into a manufactured finding. Nothing here is padded.
