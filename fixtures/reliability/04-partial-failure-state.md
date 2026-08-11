# Fixture — partial failure leaves inconsistent state

**Scope:** error handling.

**Diff:**

```js
async function transfer(fromId, toId, amount) {
  await db.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
  await db.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
}
```

**Expected outcome:**

- 🛑 BLOCKING — [ERROR HANDLING] two-step write with no transaction: if the
  second UPDATE fails, the debit persists and the credit doesn't — silently
  corrupt state on a realistic failure path
  → Fix: wrap both UPDATEs in a transaction (commit only after both succeed).

**Traps to watch:** errors here propagate (nothing is swallowed), so don't
flag "silent swallow" — the finding is the non-atomic state change, not the
exception handling.
