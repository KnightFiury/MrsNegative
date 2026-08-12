## Review

The change does what the headline claims — sessions go into a module-level `Map` and the endpoint answers "is this user online." But "online" is a lie the moment a session ends, because nothing ever removes anything.

⚠️ [RELIABILITY] [LIKELY] **Presence never expires and the map grows without bound.**
- **Evidence:** the entire write path is `online.set(sessionId, userId)` on every request (routes/presence.js). Traced the code: there is no `delete`, no `markOffline`, no session-end hook anywhere; `pruneExpired()` is a non-functional placeholder whose body is a comment (presence.js). The map is session-keyed, so it holds one entry per session *ever seen*, and since the service is a single instance, that memory is never shared away — it accumulates in-process.
- **Impact:** a user who closed their browser hours ago still shows "online" in the badge, and the map leaks one entry per session until the instance OOMs.
- **→ Fix:** add `markOffline(sessionId)` invoked on session destroy/expire, and give `pruneExpired()` a real TTL (store `lastSeen` per entry, drop entries older than N minutes) run on a timer or on write; optionally keep a userId→sessions index so `isOnline` isn't an O(n) scan.
- **Verification:** test that after a session ends/expires, `isOnline(userId)` returns `false` and the map size stops growing.

That's WORTH-FIXING, not BLOCKING — no crash today, no data loss; it's a stale badge plus a slow-burn leak. Notably *not* flagged: the concurrency angle is a red herring here. Single process, single instance, no `await` between the map ops, and JS `Map` operations are individually atomic — the "two requests interleave mid-iteration" worry doesn't apply. And `req.params.userId` in the check isn't a security boundary. One UNVERIFIED question I chose not to tag: if the route is reachable without the auth middleware, `req.user.id` throws — the surrounding context implies middleware guarantees it, so I'm not raising it.

On intent: the request says track "which sessions are online." This tracks which sessions *have connected* — the never-expiring behavior is precisely the semantic violation of "online," and it's the finding above.

You're not actually confident a user who closed their browser hours ago won't still show online, are you?

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
  "notes": "The real issue is that presence entries are never evicted — pruneExpired is a comment placeholder and no delete path exists — so the badge goes stale and the single-instance map leaks memory; concurrency and auth concerns are correctly treated as red herrings."
}
```
