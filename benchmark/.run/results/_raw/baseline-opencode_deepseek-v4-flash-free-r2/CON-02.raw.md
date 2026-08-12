## Review

The core issue is a **lost update** from a non-atomic read-modify-write. The `ON CONFLICT` clause guarantees atomicity of the single upsert statement, but `next` was computed from a *separate earlier `SELECT`*, so the two statements together are not atomic.

Concrete interleaving (exactly the two-tabs case the user flagged):

1. Tab A: `SELECT download_count` → 0, computes `next = 1`
2. Tab B: `SELECT download_count` → 0, computes `next = 1`
3. Tab A: `ON CONFLICT DO UPDATE SET download_count = 1`
4. Tab B: `ON CONFLICT DO UPDATE SET download_count = 1`

Final count is `1`, not `2`. Both transactions observed the same pre-race value and one update is silently lost — so the counter is **inaccurate precisely when the user demanded it be accurate**. This is not a hypothetical edge case; the requirement is explicitly about concurrent tabs.

Concrete fix — make the increment atomic in a single statement:

```sql
INSERT INTO user_files (user_id, file_id, download_count)
VALUES ($1, $2, 1)
ON CONFLICT (user_id, file_id)
DO UPDATE SET download_count = user_files.download_count + 1
```

This removes the separate read entirely; each concurrent statement increments from the current committed value, so two tabs yield `2`.

Verification: call `recordDownload` twice concurrently (e.g., `Promise.all([recordDownload(1,2), recordDownload(1,2)])` against a fresh row) and assert the resulting `download_count` is `2`; it will currently be `1`. A regression test covering concurrent increments is warranted.

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
  "notes": "The read-modify-write race deterministically loses an update under the exact concurrent-tabs scenario the user required accuracy for, and the atomic single-statement fix resolves it."
}
```
