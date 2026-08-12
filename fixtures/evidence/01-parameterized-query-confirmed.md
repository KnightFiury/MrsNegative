# Fixture — parameterized query, no finding

**Scope:** evidence — a change that a paranoid reviewer could flag but the
evidence refutes. Exercises the evidence model's proof requirement for
Security findings.

**Diff:**

```js
async function getBalance(userId) {
  const row = await db.query(
    'SELECT balance FROM users WHERE id = $1',
    [userId],
  );
  return row.balance;
}
```

**Expected outcome:**

- No Security finding. The query is parameterized — the injection risk is
  refuted on the evidence, not assumed away.
- A pass-through check that this query reaches no other sink is fine and may
  be stated as `✅ [SECURITY] [CONFIRMED] Verified — no finding`, but
  inventing a BLOCKING injection here is a calibration failure.

**Traps to watch:** flagging parameterized SQL as "potentially still
injectable through a future refactor," or tagging `row.balance`'s null
possibility as BLOCKING when this is a single-row lookup by primary key.
