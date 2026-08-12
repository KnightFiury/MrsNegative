## Review

This has a classic TOCTOU read-modify-write race, and it directly violates the user's requirement ("accurate even when a user downloads the same file from two tabs at once").

The `INSERT ... ON CONFLICT` upsert is atomic, but that does not help: the value it writes (`next`) is derived from a `SELECT` that ran in a *separate, earlier statement*. The two statements are not in a single transaction, and even if they were, a plain read does not take a lock that stops a concurrent writer.

Concrete interleaving:
- T1: `SELECT` → 0, computes `next = 1`
- T2: `SELECT` → 0, computes `next = 1`
- T1: upsert writes `download_count = 1`
- T2: upsert (ON CONFLICT) also writes `download_count = 1`

Result: two downloads recorded as one — a lost update. Double-click and two tabs are exactly the scenario the user flagged, so this fails the stated acceptance criterion.

Also worth noting: `next` is passed as `$3`, so on the conflict path the update overwrites with the stale pre-read value rather than incrementing from the current column value; it also relies on the insert path emitting the computed value rather than using a constant seed.

Fix — make the increment atomic in the upsert so the write computes from the current row state:

```js
await db.query(
  'INSERT INTO user_files (user_id, file_id, download_count) VALUES ($1, $2, 1) ' +
  'ON CONFLICT (user_id, file_id) ' +
  'DO UPDATE SET download_count = user_files.download_count + 1',
  [userId, fileId],
);
```

(If the total must be exact under any ordering, a strong alternative is `SELECT ... FOR UPDATE` around the read, but the single atomic upsert is simpler and sufficient.)

Verification: run two concurrent `recordDownload` calls for the same `(user, file)` (e.g., two pooled connections in parallel, or a Promise.all against separate connections) and assert `download_count = 2`. Under the original code this deterministically flakes to 1.

A regression test asserting the count after N concurrent calls is warranted, since this is a correctness bug in the primary requirement.

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
  "notes": "The SELECT-then-upsert is a textbook lost-update race that directly violates the concurrency requirement; the interleaving trace proves it, and replacing the pre-read with an atomic `download_count = download_count + 1` upsert fixes it."
}
```
