---
id: FP-02
category: false-positives
title: Lock acquired and released correctly around the critical section
mode: STRICT
user_request: "Serialize coupon redemption so the same code can't be redeemed twice."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "none — the lock correctly covers the check-and-consume"
key_skills: [false-positive, concurrency, locking]
---

# FP-02 — Lock acquired and released correctly around the critical section

## Scenario

A coupon redemption endpoint. The developer added a per-code mutex so the
check (is it already redeemed?) and the consume (mark redeemed) are
serialized. The lock is acquired before the check and released after the
consume, with a `finally`.

## User request

> The same coupon code must only ever be redeemed once, even if two
> requests arrive at the same time.

## Code change (diff)

```js
import { mutex } from '../lib/mutex';

app.post('/api/redeem', requireAuth, async (req, res) => {
  const code = req.body.code;
  const release = await mutex.acquire(`coupon:${code}`);
  try {
    const row = await db.query('SELECT redeemed FROM coupons WHERE code = $1', [code]);
    if (row?.redeemed) return res.status(409).json({ error: 'already redeemed' });
    await db.query('UPDATE coupons SET redeemed = true WHERE code = $1', [code]);
    res.json({ ok: true });
  } finally {
    release();
  }
});
```

## Surrounding context

- `lib/mutex.js` (in the repo) provides a promise-based mutex whose
  `acquire` serializes on the key; `release` is idempotent and safe to call
  once.
- The check and the update both sit inside the acquired section. The
  `SELECT ... FOR UPDATE` alternative is one option; here the mutex is the
  chosen mechanism and it covers both statements.

## Expected outcome

- **NO-ISSUE.** The critical section — check plus consume — is fully
  inside the mutex, and the release is guaranteed by `finally`. Two
  concurrent requests serialize on `coupon:<code>`; the second sees
  `redeemed = true`. This satisfies the requirement.
- Any finding that claims a race between the check and the consume is a
  false positive: the lock covers both. (A NITPICK about using the DB's
  atomic `UPDATE ... WHERE redeemed = false` instead of an app-level mutex
  is *style*, not a defect — the correct review stays silent or one line.)
- Investigation: MEDIUM — the case expects the reviewer to verify the lock
  boundaries (acquire before check, release after consume) rather than
  assume a race exists.

## Trap for the grader

Concurrency findings are a high-value false-positive zone. The trap here
is flagging "TOCTOU between the check and the update" when the lock provably
covers both. The reviewer must trace the lock's coverage before claiming a
race — same discipline as FP-01, applied to synchronization.
