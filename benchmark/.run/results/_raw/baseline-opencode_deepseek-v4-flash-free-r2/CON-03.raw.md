## Review

The core defect is that the map is write-only: `markOnline` runs on every request and nothing ever calls `online.delete`, so a session is reported "online" forever after its first request and the map grows unboundedly. That's both a stale-presence bug and a memory leak in one. The design clearly anticipated this — `pruneExpired` exists — but it's an empty stub with no caller, so the expiry half of the feature simply doesn't exist and no session-end/logout hook is wired up. The user asked to track *online sessions*; this tracks "was ever seen."

Secondary issues: the route marks the requester online and then answers an arbitrary `req.params.userId` with no ownership check, so any authenticated user can probe anyone's presence (and each probe refreshes/creates an entry). `isOnline` does an O(n) scan over all values on every request, and since the map never shrinks that's O(n) forever. Concurrency is correctly a non-issue given the stated single-process, no-await context, so I raise no race finding.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
  "evidence": "CONFIRMED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": false,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The diff directly shows no online.delete and an uncalled pruneExpired stub, so the never-pruned map is a confirmed WORTH-FIXING stale-presence/memory bug, not a speculative one."
}
```
