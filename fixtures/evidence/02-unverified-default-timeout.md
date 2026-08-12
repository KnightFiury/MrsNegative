# Fixture — unverified timeout claim must downgrade

**Scope:** evidence + dependency trust — a finding about a missing timeout
where the default behavior was never checked.

**Diff:**

```js
async function getUserProfile(id) {
  const res = await fetch(`https://api.accounts.dev/users/${id}`);
  return res.json();
}
```

**Expected outcome:**

- ⚠️ WORTH-FIXING — [RELIABILITY] or [DEPENDENCY TRUST] with an `UNVERIFIED`
  or `ASSUMED` evidence tag — "the call has no explicit timeout; assumed not
  verified whether the underlying client/library applies a default."
- It must NOT be 🛑 BLOCKING. The library's default timeout behavior was not
  inspected, so `BLOCKING` cannot be earned — the finding must name the
  verification step that would confirm or refute it (check the fetch client's
  docs/defaults, then decide).
- 💭 NITPICK — `res.json()` unguarded against non-JSON responses is
  acceptable as a batched WORTH-FIXING/NITPICK, but must not be escalated.

**Traps to watch:** asserting "this hangs forever" as `CONFIRMED` without
checking the library; tagging BLOCKING off a suspicion. This fixture is the
anti-inflation pair to `escalation/02-destructive-operation-no-guard.md`.
