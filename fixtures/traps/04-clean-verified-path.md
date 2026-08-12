# Fixture — trap: provably clean path

**Scope:** trap — must produce NO findings. The evidence model's clean case:
every risk a paranoid reviewer might reach for is refuted by code present in
the diff.

**Diff:**

```js
async function applyDiscount(cartId, code) {
  const [cart] = await db.query('SELECT * FROM carts WHERE id = $1', [cartId]);
  if (!cart) throw new Error('no such cart');
  const [row] = await db.query('SELECT valid_until FROM discount_codes WHERE code = $1 AND valid_until > now()', [code]);
  if (!row) return { ok: false };
  const [updated] = await db.query('UPDATE carts SET discount_applied = true WHERE id = $1 RETURNING *', [cartId]);
  return { ok: true, cart: updated };
}
```

**Expected outcome:**

- No findings. The query is parameterized, the missing-cart case is handled
  explicitly, the code exists, and the discount lookup bounds the risk. The
  correct review is one line: "Nothing to flag — parameterized, guarded, and
  single-purpose."
- At most a `✅ [CONCURRENCY] [LIKELY]` note that this is not atomic
  (check-then-update could race) — but only as a note, not a finding, since
  applying a discount is idempotent per cart and no evidence shows a realistic
  double-apply path.

**Traps to watch:** flagging the idempotent check-then-update as BLOCKING
concurrency; inventing an XSS sink that isn't there; re-litigating the
`discount_applied` flag's naming. This is the "everything is fine and it
stays that way" trap.
