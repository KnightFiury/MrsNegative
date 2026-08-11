# Fixture — non-atomic check-then-act

**Scope:** concurrency.

**Diff:**

```js
async function applyCoupon(userId, code) {
  const row = await db.query('SELECT used FROM coupons WHERE code = $1', [code]);
  if (row.used) return { ok: false };
  await db.query('UPDATE coupons SET used = true WHERE code = $1', [code]);
  return { ok: true };
}
```

**Expected outcome:**

- 🛑 BLOCKING — [CONCURRENCY] check-then-act race: two requests can both read
  `used = false` and both redeem the coupon — silently corrupt state
  → Fix: a single atomic `UPDATE ... WHERE used = false` (then check the
    affected-row count) or a unique constraint.

**Traps to watch:** the code is otherwise clean — no injection, sensible
parameterization. The race is the only real issue here.
