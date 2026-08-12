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