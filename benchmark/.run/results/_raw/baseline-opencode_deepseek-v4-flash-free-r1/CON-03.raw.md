## Review

The change works mechanically (a module-level `Map`, written on every request, read on demand, no `await` between ops, so the single-process/single-event-loop caveat in the context means there is no real race to flag). The important problems are functional, not concurrent:

1. **Likely type mismatch defeats the feature (primary).** `req.params.userId` is always a string, but `markOnline` stores `req.user.id`, which on most setups is a Number or other native DB type. `isOnline` does a strict `id === userId` against `online.values()`, so for numeric IDs the presence lookup will *never* match and the endpoint will always report `online: false` even when the user is definitely online. That silently breaks the exact thing the user asked for. I can't confirm `req.user.id`'s type from the diff, so this is LIKELY, not verified — but it's a classic footgun worth fixing regardless. Concrete fix: normalize on one side, e.g. `markOnline(req.session.id, String(req.user.id))` or compare with `String(id) === String(userId)`. Concrete verification: log in, then `GET /api/presence/<your own numeric id>` while the session is active; if it returns `online:false`, the mismatch is real.

2. **Confirmed unbounded growth / stale presence.** Every request calls `markOnline`, and nothing ever removes entries. `pruneExpired` is a placeholder and is never invoked anywhere in the shown code, so `online` never goes back to `false` after a session ends and the map grows for the process's lifetime. This is CONFIRMED from the code itself (no eviction path exists). Worth fixing: store a `lastSeen` per entry, and call `pruneExpired` on an interval (e.g. `setInterval`) and on logout/session-destroy.

3. Minor: the presence check endpoint marks the *requester* online as a side effect of checking someone else. Probably intended for the badge feature, but worth a comment.

Both findings sit at WORTH-FIXING: they degrade correctness/memory over time or silently, but neither crashes the service and neither is a concurrency/security blowup, so BLOCKING would be inflation given the id-type is unverified.

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
  "regressionStance": "confirm",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "Primary is a likely string-vs-numeric strict-equality mismatch between the URL param and stored user id that can silently defeat presence, plus a confirmed never-pruned map; worth-fixing for both but not blocking since the id type is unverified."
}
```
