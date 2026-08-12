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