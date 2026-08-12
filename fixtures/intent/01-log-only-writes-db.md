# Fixture — intent mismatch: "log-only" writes to the database

**Scope:** intent preservation — behavior contradicts stated intent.

**Diff:**

```js
// Called from the checkout flow — logging the attempt only.
async function logAttempt(userId) {
  await db.query(
    'INSERT INTO attempts (user_id, at) VALUES ($1, now())',
    [userId],
  );
  console.log('attempt logged', userId);
}
```

**Expected outcome:**

- ⚠️ WORTH-FIXING (or higher) — [INTENT] `CONFIRMED` — the comment and the
  stated purpose ("logging only") contradict the code, which writes a row to
  `attempts`. Either the write is intended and the comment/naming lie, or the
  write is a bug.
- The finding must include the fix for whichever side is true: correct the
  comment (and rename if needed) to match the write, or drop the write to
  match the stated intent.
- The INSERT itself is parameterized — do not invent a SQL-injection
  finding; the failure here is intent, not injection.

**Traps to watch:** flagging the parameterized INSERT as Security; missing
the intent mismatch entirely and calling the diff "clean" because the SQL is
safe.
