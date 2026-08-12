## Review

The check-then-set pattern here is a textbook TOCTOU race. `SELECT ... WHERE id` and `UPDATE ... SET claimed` run as two separate Postgres transactions, so two workers consuming the same redelivered `job.id` can both read `claimed = false` before either commits the UPDATE. Result: both proceed to `sendEmail`, which violates the user's explicit requirement ("never send the same email twice").

This is not a theoretical concern — the context says the broker redelivers on consumer crash/timeout (at-least-once), so the exact interleaving is reachable in normal operation: worker A SELECTs (false), worker B SELECTs (false), A UPDATEs+commits, B UPDATEs+commits, A sends, B sends. Two emails go out. The `claimed` flag adds no protection without atomicity.

Concrete fix: make the claim atomic and branch on the affected row count, so only one worker wins:

```js
async function processJob(job) {
  const res = await db.query(
    'UPDATE jobs SET claimed = true WHERE id = $1 AND claimed = false',
    [job.id]
  );
  if (res.rowCount === 0) return;      // someone else claimed it
  await sendEmail(job.emailPayload);   // only the winning worker sends
}
```

This both prevents the double-send and preserves the intended "claim then send" semantics. A `SELECT ... FOR UPDATE` inside a single transaction would also work, though the conditional UPDATE is simpler and avoids a long-lived lock.

Verification: a runnable regression test should invoke `processJob` twice concurrently on the same `job.id` (e.g., `Promise.all([processJob(job), processJob(job)])` with a mocked `sendEmail` that counts invocations) and assert `sendEmail` is called exactly once. This reproduces the race deterministically.

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
  "notes": "The check-then-set is a confirmed TOCTOU race under the stated at-least-once redelivery, directly breaking the user's no-double-send requirement, so BLOCKING is earned."
}
```
