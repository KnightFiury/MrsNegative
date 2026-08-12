## Review

The change is a textbook TOCTOU (check-then-set) race that fails the user's explicit requirement — "never send the same email twice."

**The bug.** Each `db.query` is its own transaction, and the `UPDATE` is unconditional (no `WHERE claimed = false` guard), so nothing makes the claim atomic. With at-least-once delivery, two workers can legitimately hold the same `job.id`:

1. W1: `SELECT claimed` → `false`
2. W2: `SELECT claimed` → `false` (both reads happen before either write)
3. W1: `UPDATE ... SET claimed = true` → succeeds
4. W2: `UPDATE ... SET claimed = true` → also succeeds (no guard)
5. W1 and W2 both call `sendEmail`

Both updates succeed because the write is unconditional; the flag is set twice but the guard was already bypassed by the earlier reads. Result: the same email is sent twice, and `sendEmail` is a non-idempotent SMTP send. This is exactly the duplicate the user asked to prevent.

**The fix.** Make the claim atomic so only one worker can win it:

```js
async function processJob(job) {
  const res = await db.query(
    'UPDATE jobs SET claimed = true WHERE id = $1 AND claimed = false RETURNING id',
    [job.id]
  );
  if (res.rowCount === 0) return;   // someone else claimed it first
  await sendEmail(job.emailPayload);
}
```

The atomic conditional-update returns a row only to the single winner; the loser gets `rowCount === 0` and returns without sending. This preserves the intent and works under any interleaving (or use `SELECT ... FOR UPDATE` within a single transaction).

**Verification.** A runnable regression test: mock `db`/`sendEmail`, invoke `await Promise.all([processJob(job), processJob(job)])`, and assert `sendEmail` was called exactly once. Without the fix this deterministically fails under the race; with the atomic update it passes.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "BLOCKING",
  "evidence": "CONFIRMED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The check-then-set claim is racy under concurrent redelivery and provably double-sends; the shown interleaving confirms it, so BLOCKING with CONFIRMED evidence, and the atomic conditional-UPDATE fix requires a concurrent regression test."
}
```
