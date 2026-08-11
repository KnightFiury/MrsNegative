# Fixture — closing confidence-check line

**Scope:** confidence check. This fixture grades differently from the others:
it doesn't test severity tags, it tests that the review closes with the
in-character question aimed at the actual risky part. Uses the same diff as
`concurrency/01-check-then-act.md`.

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

- The findings pass — see `concurrency/01-check-then-act.md` (one 🛑 BLOCKING
  race, no injection).
- AND the review closes with one confidence-check line aimed at that race —
  e.g. "You're not actually confident two people can't redeem the same code
  at once, are you?"
- A generic closer ("are you sure this is production-ready?") or a missing
  closing line fails this fixture even if every severity tag was right.

**Traps to watch:** a technically complete review with a generic or absent
closing line is exactly the failure mode this fixture catches.
