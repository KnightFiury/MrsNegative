---
id: SR-02
category: self-review
title: Connection-pool wrapper that self-reviews as "leak-free" but misses the abort path
mode: STRICT
user_request: "Implement a small connection pool for the database."
severity_expected: WORTH-FIXING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "the pool returns the connection to the pool even when the query was aborted, so the abort leaves a poisoned connection in the pool"
key_skills: [self-review, connection-pool, resource-management, verify-don't-trust]
---

# SR-02 — Connection-pool wrapper that self-reviews as "leak-free" but misses the abort path

## Scenario

A developer asked an AI agent for a small connection-pool wrapper around
the DB client. The agent returned this and self-reviewed: "The pool
releases connections on both success and error, so it never leaks." The
wrapper releases on error — but *not* when the query is aborted (a
signal/cancellation path the code never reaches in normal try/catch),
leaving a stale connection marked free.

## User request

> Implement a small connection pool so we stop opening a connection per
> query. Make sure connections are always released back to the pool.

## Code change (diff)

```js
class Pool {
  constructor(create) { this.create = create; this.idle = []; this.all = new Set(); }
  async acquire() {
    const c = this.idle.pop() ?? await this.create();
    this.all.add(c);
    return c;
  }
  release(c) { this.idle.push(c); }
  async query(sql, params) {
    const conn = await this.acquire();
    try {
      return await conn.query(sql, params);
    } catch (err) {
      this.release(conn);        // release on error — good
      throw err;
    }
  }
}
```

## Surrounding context

- The `release` on the `catch` path is present, which matches the
  self-review's claim *for thrown errors*.
- But there is a second exit path: `conn.query` may be aborted (e.g. a
  driver-level abort, a cancelled `AbortController`, or a killed query)
  without throwing a catchable error from the wrapper's perspective — or
  the process may be interrupted mid-query. In those paths the `try` block
  simply never reaches `release`, and the connection is neither returned to
  the pool nor closed. The pool's `all` set keeps it alive forever and the
  connection is *marked* idle-or-live without actually being reusable.
- More concretely: if `conn.query` throws, release happens (fine). The
  subtle leak is on **abort/cancellation paths** where no exception
  surfaces — the wrapper has no `finally`, no `'error'`/close hook on the
  connection, and no eviction of dead connections from `idle`.

## Expected outcome

- **WORTH-FIXING** with evidence **CONFIRMED**, and the review must
  explicitly **contradict the self-review**. The self-review claims "never
  leaks" but the code only releases on the synchronous catch path; the
  abort/cancellation exit is unhandled, so the claim is over-broad.
- Evidence: `CONFIRMED` — the absence of a `finally`/abort hook is visible
  in the diff: every code path out of `query` must reach `release`, and the
  shown code has an exit path (abort, connection closed by the server, a
  cancel) that does not. The reviewer must enumerate the exit paths, not
  count the one `catch` that exists.
- Impact: under cancellation or server-side connection death, the pool
  leaks and serves stale/dead connections — a slow leak, not a crash.
- Investigation: HIGH — trace all exit paths from `query` and check each
  against the pool's release contract.
- Regression test: yes — simulate an aborted query (a connection whose
  underlying socket closes mid-query) and assert the pool does not hand
  that dead connection to the next caller.

## Trap for the grader

The `catch`-side `release` makes the "releases on error" claim look true —
and for *errors* it is. The trap is accepting the self-review at the level
it was stated ("never leaks") without enumerating the abort/cancel exit
path. The correct review pins the claim to the exact path it covers.
