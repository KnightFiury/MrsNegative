---
id: CON-02
category: concurrency
title: Lost update on a shared counter
mode: STRICT
user_request: "Track per-user download counts and expose the total."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "read-modify-write on the counter is not atomic — concurrent increments are lost"
key_skills: [concurrency, lost-update, interleaving]
---

# CON-02 — Lost update on a shared counter

## Scenario

A downloads service increments a per-user counter on each download. The
agent wrote a read-modify-write against a Postgres column.

## User request

> Track how many times each user downloads a file. The counter must be
> accurate even when a user downloads the same file from two tabs at once.

## Code change (diff)

```js
async function recordDownload(userId, fileId) {
  const row = await db.query(
    'SELECT download_count FROM user_files WHERE user_id = $1 AND file_id = $2',
    [userId, fileId],
  );
  const next = (row?.download_count ?? 0) + 1;
  await db.query(
    'INSERT INTO user_files (user_id, file_id, download_count) VALUES ($1, $2, $3) ' +
    'ON CONFLICT (user_id, file_id) DO UPDATE SET download_count = $3',
    [userId, fileId, next],
  );
}
```

## Surrounding context

- The `ON CONFLICT` upsert is atomic per statement, but the value it
  writes (`next`) was computed from a *separate earlier read*.
- Two concurrent downloads for the same (user, file) are realistic
  (double-click, two tabs).

## Expected outcome

- **BLOCKING.** The read and the write are separate: both requests can
  read `download_count = 5`, both compute `next = 6`, and both upsert
  `6` — one increment is lost.
- Evidence: `CONFIRMED` — interleaving:
  1. Request A: `SELECT download_count` → 5
  2. Request B: `SELECT download_count` → 5
  3. Request A: upsert `download_count = 6`
  4. Request B: upsert `download_count = 6`  ← 7 is lost
  The counter undercounts by one per collision. Structure is entirely
  visible in the code.
- Impact: incorrect billing/reporting data that silently degrades over
  time (an unbounded drift, worse than a crash).
- Investigation: HIGH — the interleaving is the proof.
- Regression test: yes — run N concurrent `recordDownload` calls for the
  same (user, file) and assert the final count equals N.
- Verification: fix by making the increment atomic —
  `... DO UPDATE SET download_count = user_files.download_count + 1`
  (and `VALUES (..., 1)` on insert) so the write does not depend on the
  pre-read value; re-run the concurrency test.

## Trap for the grader

The upsert makes the code look race-safe, but the race is in the
*read-then-compute*, not in the single upsert statement. A review that
says "it uses `ON CONFLICT` so it's atomic" misses the point.
