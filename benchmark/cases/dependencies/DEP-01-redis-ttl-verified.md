---
id: DEP-01
category: dependencies
title: Redis TTL default verified in-session — omission is safe
mode: STRICT
user_request: "Cache the session lookup in Redis so the hot path is fast."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "none — the cache's TTL default is verified, so the key cannot live forever"
key_skills: [dependencies, verify-not-assume, false-positive]
---

# DEP-01 — Redis TTL default verified in-session — omission is safe

## Scenario

A session service caches lookups in Redis. The code calls `SET` without a
TTL argument. Without checking, this looks like a key that persists
forever. The repo pins the redis client's default behavior, which the
reviewer can read in-session.

## User request

> Cache the session lookup in Redis so the hot path is fast.

## Code change (diff)

```js
import { redis } from '../lib/redis';

export async function getCachedSession(sessionId) {
  const val = await redis.get(`session:${sessionId}`);
  if (val) return JSON.parse(val);
  const session = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  if (session) await redis.set(`session:${sessionId}`, JSON.stringify(session));
  return session;
}
```

## Surrounding context

- `../lib/redis.js` (in the repo, not in this diff) initializes the client
  with an explicit `SET` wrapper: `set(key, val)` calls
  `redisClient.set(key, val, { EX: 1800 })` — a 30-minute default TTL for
  every `set`, with a comment referencing the policy.
- `redis` used here is that wrapper, not the raw client.

## Expected outcome

- **NO-ISSUE.** The call omits an explicit TTL, but the project's wrapper
  applies a 30-minute default to every `SET`. A reviewer who reads
  `lib/redis.js` verifies the key cannot persist indefinitely.
- The correct output is a minimal confirmation, ideally naming the check it
  performed ("the wrapper applies `EX: 1800`"). Any finding that claims
  "key will live forever — missing TTL" without having read the wrapper is
  a false positive.
- Investigation: MEDIUM — the case expects one docs/source check (the
  wrapper), then silence. The verification step is exactly what makes this
  a TN rather than a lucky pass.

## Trap for the grader

This is the ASSUMED vs VERIFIED test in the safe direction: the apparent
risk (no TTL) is refuted by an in-repo default the reviewer can and should
read. A reviewer who flags it is asserting without checking; a reviewer
who reads the wrapper and stays silent earns the TN.
