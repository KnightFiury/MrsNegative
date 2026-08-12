---
id: CON-04
category: concurrency
title: Non-idempotent side effect without a claim guard (queue worker)
mode: STRICT
user_request: "Make the email-sending worker at-least-once safe so an email is never sent twice for the same job."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "job claimed and side effect run as separate steps with no atomicity between them"
key_skills: [concurrency, idempotency, distributed-systems, interleaving]
---

# CON-04 — Non-idempotent side effect without a claim guard (queue worker)

## Scenario

A background worker pulls jobs from a queue with **at-least-once**
delivery (documented by the broker). Each job sends an email. The agent
added a "claimed" flag to avoid double-sending, implemented as
check-then-set.

## User request

> The queue can redeliver jobs. Make sure we never send the same email
> twice — claim the job before sending.

## Code change (diff)

```js
async function processJob(job) {
  const row = await db.query('SELECT claimed FROM jobs WHERE id = $1', [job.id]);
  if (row.claimed) return;                       // already handled
  await db.query('UPDATE jobs SET claimed = true WHERE id = $1', [job.id]);
  await sendEmail(job.emailPayload);             // side effect: not idempotent
}
```

## Surrounding context

- The broker redelivers on consumer crash/timeout (at-least-once), so the
  same `job.id` can arrive in two workers concurrently.
- `sendEmail` is a real SMTP send — not idempotent.
- Postgres: each `db.query` is its own transaction.

## Expected outcome

- **BLOCKING.** Claim-then-send is a check-then-act: two workers can both
  read `claimed = false` and both proceed to send before either UPDATE
  lands. The email is sent twice.
- Evidence: `CONFIRMED` — interleaving:
  1. Worker A: `SELECT claimed` → false
  2. Worker B: `SELECT claimed` → false
  3. Worker A: `UPDATE claimed = true`
  4. Worker B: `UPDATE claimed = true`
  5. Worker A: `sendEmail(...)`  ← email #1
  6. Worker B: `sendEmail(...)`  ← email #2 — duplicate
  With at-least-once redelivery this is reachable, not theoretical.
- Impact: duplicate transactional email to customers (double charge
  notifications, double passwords) — a real-world incident class.
- Investigation: HIGH — write the interleaving; cite the broker's
  at-least-once contract.
- Regression test: yes — run two `processJob` calls concurrently on the
  same job id and assert `sendEmail` is invoked exactly once (spy/mock).
- Verification: fix with an atomic claim —
  `UPDATE jobs SET claimed = true WHERE id = $1 AND claimed = false` and
  only send when `rowCount === 1`; re-run the concurrent test.

## Trap for the grader

The `if (row.claimed) return` reads as a working dedup guard — but the
guard and the side effect are not atomic, so the guard is illusory under
concurrency. The same lesson as CON-01 but with a distributed side effect;
a review that approves the claim flag without producing the interleaving
misses the finding.
