## Review

The most obvious concern — `redis.set` with no TTL creating immortal keys — does not hold in this repo. `redis` is the wrapper from `../lib/redis.js`, whose `set` pins a default `{ EX: 1800 }` (30-minute TTL) on every call per the repo policy. So this diff does not create keys that persist forever; that is not a finding.

The real issue is that this is a cache-aside read path with **no invalidation**. `getCachedSession` only ever writes on a miss and nothing in this change (or the visible surrounding service) ever `del`s `session:<id>` when the DB row is revoked — logout, forced logout, password change, admin kick. Because the wrapper imposes a 30-minute TTL, a revoked session keeps being served from cache for up to 30 minutes. For a session/auth service that is a correctness/security gap, not a nitpick.

Secondary, minor issues worth a mention: (a) cache stampede — get-then-set is not atomic, so concurrent misses all hit the DB; (b) a corrupted cached value makes `JSON.parse` throw and fail the entire hot path instead of falling through to the DB; (c) misses aren't cached, so nonexistent session IDs always hit the DB.

Fix for the primary finding: on any session invalidation, `await redis.del('session:' + id)` (or size the TTL from the session's own expiry instead of a blanket 30 minutes). Verification: after a miss-populated lookup, `redis TTL session:<id>` should report ~1800; then delete the row to simulate logout and observe `getCachedSession` still returns the stale session — demonstrating the staleness window.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
  "evidence": "LIKELY",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The apparent missing-TTL bug is a false positive (the repo wrapper pins EX:1800 for every set), so the real finding is the cache-aside path lacking invalidation, serving revoked sessions stale for up to 30 minutes; evidence is the wrapper's pinned TTL plus the absence of any del in the diff."
}
```
