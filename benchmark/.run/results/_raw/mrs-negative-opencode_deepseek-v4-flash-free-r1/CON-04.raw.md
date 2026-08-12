## Review

🛑 [CONCURRENCY] [CONFIRMED] The "claimed" guard is check-then-set, and the check and the set are two separate transactions — so the guard doesn't guard.

   **Evidence:** the diff itself proves it. Each `db.query` runs in its own transaction (given context), so there is no locking and no atomicity between the `SELECT` and the `UPDATE`. Interleaving, which the broker's at-least-once redelivery makes an ordinary event: worker A `SELECT`s → `claimed=false`; worker B `SELECT`s (before A's `UPDATE` commits) → also `claimed=false`; A `UPDATE`s and sends; B `UPDATE`s and sends. Two emails for one `job.id`. This is the exact scenario the user named.

   **Impact:** same email sent twice on concurrent redelivery — the precise failure the request was intended to prevent (semantic intent violation, not just a code smell).

   **→ Fix:** make the claim atomic — `UPDATE jobs SET claimed = true WHERE id = $1 AND claimed = false`, then `if (rowCount === 0) return;` before `sendEmail`. The conditional update loses the race exactly once, and only the winner reaches the side effect. (Alternative: `SELECT ... FOR UPDATE` inside a single transaction, but the conditional UPDATE is simpler and needs no surrounding transaction.)

   **Verification:** a test that fires two `processJob` calls at the same `job.id` concurrently (or a serialized interleaving that forces B's `SELECT` between A's `SELECT` and A's `UPDATE`) and asserts exactly one `sendEmail` invocation. Regression test required: the fix is a BLOCKING-class correctness fix.

You're not actually confident that two redeliveries of the same `job.id` can't both pass the `SELECT` before either commits the `UPDATE`, are you?

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
  "notes": "Check-then-set across two transactions is a provable TOCTOU race under the broker's concurrent redelivery; the trace is concrete, so BLOCKING with CONFIRMED evidence is earned."
}
```
