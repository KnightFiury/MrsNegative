## Scenario

A Node/Express app tracks "who is online" in a module-level `Map`. The
handlers read and write the map on every request.

## User request

> Track which sessions are online in a module-level cache so the status
> badge can show presence.

## Code change (diff)

```js
// presence.js
const online = new Map();

export function markOnline(sessionId, userId) {
  online.set(sessionId, userId);
}
export function isOnline(userId) {
  for (const id of online.values()) if (id === userId) return true;
  return false;
}
export function pruneExpired() {
  const now = Date.now();
  // per-entry lastSeen would be checked here; placeholder for brevity
}

// routes/presence.js
app.get('/api/presence/:userId', (req, res) => {
  markOnline(req.session.id, req.user.id);
  res.json({ online: isOnline(req.params.userId) });
});
```

## Surrounding context

- Node runs a single process/event loop for this service. The code never
  awaits between the map operations, so within a single request the
  operations are effectively serialized on the event loop.
- Under concurrency, `online.set` and the `for..of` iteration interleave
  only across requests, and `Map` operations are individually atomic in JS
  — a concurrent `set` cannot corrupt the map structure, but a snapshot
  during iteration is still consistent.
- The service is deployed with a **single instance** (no cluster, no
  multi-replica sharing this memory).