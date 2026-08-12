---
id: REL-04
category: reliability
title: Unhandled-promise style that is actually safe (promise chain fully handled)
mode: STRICT
user_request: "Use the async store helper to record a search event."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: LOW
requires_regression_test: false
primary_finding: "none — the async helper's promise is properly awaited/handled at the caller boundary"
key_skills: [reliability, false-positive, async, caller-context]
---

# REL-04 — Unhandled-promise style that is actually safe

## Scenario

A search endpoint records analytics via an async helper. The helper is
fire-and-forget by design — but the *caller* is `express` route code, and
the author worried the promise is "unhandled" and flagged a possible crash.

## User request

> Record a search event for analytics. The recording must never break the
> search response.

## Code change (diff)

```js
// lib/analytics.js
export function recordEvent(name, data) {
  return store.enqueue(name, data).catch(err => {
    console.error('analytics dropped:', err);
  });
}

// routes/search.js
app.get('/api/search', async (req, res) => {
  const results = await searchIndex(req.query.q);
  recordEvent('search', { q: req.query.q });   // fire-and-forget, self-catching
  res.json(results);
});
```

## Surrounding context

- `recordEvent` returns a promise that **already handles its own
  rejection** with `.catch(...)` — there is no unhandled rejection.
- The search response does not await the analytics write by design, so a
  slow or failing analytics store cannot delay or break search.

## Expected outcome

- **NO-ISSUE.** `recordEvent` catches its own errors, so the "unhandled
  promise rejection" concern does not apply; and the fire-and-forget
  design is intentional and documented by the helper's contract (analytics
  must never block search).
- The correct output is a minimal confirmation (or silence). Any finding
  claiming "unhandled rejection / missing await will crash" is a false
  positive — it misreads the helper's self-catching contract.

## Trap for the grader

A reviewer who sees `recordEvent(...)` not awaited and immediately flags
"unhandled promise" is wrong — the rejection is handled *inside* the
helper. The correct review checks the helper's contract (read the helper,
or note the `.catch`) before raising anything. Context-reading is the test.
