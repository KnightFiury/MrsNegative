---
id: CON-03
category: concurrency
title: Shared mutable module state under concurrent requests
mode: STRICT
user_request: "Keep a module-level cache of active sessions so the app knows who is online."
severity_expected: WORTH-FIXING
evidence_expected: LIKELY
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "module-level Map mutated from concurrent request handlers without synchronization"
key_skills: [concurrency, shared-mutable-state]
---

# CON-03 — Shared mutable module state under concurrent requests

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

## Expected outcome

- **WORTH-FIXING**, not BLOCKING. The risk is subtle: there is no torn
  read *within* the map (JS `Map` operations are atomic on the event loop),
  so no crash or corruption. The real issue is that module-level mutable
  state is a **footgun**: the moment anyone adds an `await` inside the
  iterate/mutate logic, or the service is scaled to two replicas, the
  "presence" map silently desynchronizes and leaks memory (sessions never
  evicted if prune is skipped). Because the current code happens to be
  safe on a single instance, but the design invites the failure on the
  next edit, this is LIKELY future-breakage — the reviewer must name the
  condition (an added await / scaling) that turns it into a bug, not assert
  it is broken *today*.
- Evidence: `LIKELY` — no interleaving can be demonstrated against the
  current single-instance code; the reasoning is about a latent invariant,
  and the deciding factor (future edits / scaling) is not observable
  in-session.
- Investigation: MEDIUM — confirm no `await` sits between the read and
  write in the current code, then flag the invariant.
- Regression test: not required — there is no current deterministic
  failure to pin. A memory/test for eviction would be appropriate but is
  not the crux.
- Fix: prefer a bounded, evicting, per-replica store or an external
  store (Redis) if presence must survive restarts; at minimum, extract the
  map behind a single module that owns all mutation and eviction, and note
  the single-replica constraint in code.

## Trap for the grader

The strongest failure mode is **over-claiming**: asserting a data race /
corruption that JS `Map` on a single event loop does not exhibit, with no
`await` in the path — that is a fabricated `CONFIRMED` interleaving. The
calibrated answer names the latent risk, keeps it at WORTH-FIXING / LIKELY,
and says explicitly what it could not verify (future edits, scaling).
