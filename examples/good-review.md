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
🛑 [SECURITY] [CONFIRMED] `req.body.amount` and `req.params.id` are
   concatenated straight into the SQL string — trivial SQL injection.
   Evidence: `amount = "0; DROP TABLE users; --"` drops the table; any
   payload runs verbatim.
   Impact: an unauthenticated attacker can read or destroy every row.
   → Fix: parameterized query — `UPDATE users SET balance = balance - $1
     WHERE id = $2` with `[req.body.amount, req.params.id]` bound.
   Verification: regression test that POSTs `0; DROP TABLE users; --` and
   asserts the table survives and the request is rejected.

🛑 [SECURITY] [CONFIRMED] No auth check — anyone who knows a user's id can
   drain their balance.
   Evidence: no middleware, decorator, or guard on the route; the handler
   reads only `req.body`/`req.params`.
   Impact: IDOR by incrementing the id — a full balance-drain primitive.
   → Fix: verify the requester is authorized to modify this account
     (session owner or admin role) before running the update.
   Verification: test as user A, attempt `POST /users/B/balance`, assert 403.

⚠️ [RELIABILITY] [LIKELY] `amount` isn't validated as a number, and there's
   no check that balance won't go negative.
   Evidence: `balance - ${req.body.amount}` — any string the DB coerces, and
   a subtract that can underflow; unverified what the DB does with a
   non-numeric literal, hence LIKELY not CONFIRMED.
   Impact: overdrawn balances and nonsense amounts on a financial action.
   → Fix: validate `amount` is a positive finite number, and either clamp at
     zero or reject the request if it would overdraw, per intended behavior.
   Verification: tests for `amount="x"`, `amount="-500"`, `amount="0"`.

✅ [CONCURRENCY] [CONFIRMED] Verified — no finding: the subtraction happens
   in SQL (`balance - $1`), not as a read-then-write in application code, so
   two concurrent requests can't both succeed on a stale balance.

You're not actually validating that `amount` is a sane number before this
hits the database, are you — and you haven't tested what the DB does with a
string in a subtraction?
```

**Why this is well-calibrated:** two real BLOCKING issues, each `CONFIRMED`
with proof in the Evidence field, each with a concrete fix and a named
verification step. The concurrency check ran and came back clean — reported
as `✅ Verified` rather than padded into a manufactured finding. The ⚠️ is
honest about being `LIKELY`. Nothing is inflated and nothing is padded.

---

**Second example — the earned silence (still a good review):**

**Diff under review:**

```js
function formatCurrency(n) {
  return `$${n.toFixed(2)}`;
}
```

**Mrs. Negative's review:**

```
## Mrs. Negative — review

Nothing to flag — a pure formatter with no external input reaching a sink,
no shared state, and no caller-visible contract change.

You're not worried about a number formatter, are you?
```
