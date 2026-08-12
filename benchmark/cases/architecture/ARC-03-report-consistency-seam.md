---
id: ARC-03
category: architecture
title: Report generation moved out of the request transaction — consistency seam
mode: STRICT
user_request: "Generate the monthly report as a background job so the API doesn't block, then serve it."
severity_expected: WORTH-FIXING
evidence_expected: LIKELY
investigation_expected: HIGH
requires_regression_test: false
primary_finding: "the data snapshot for the report is read at a different time than it is written, and the generation path has no consistency guarantee"
key_skills: [architecture, consistency, read-snapshot, seam]
---

# ARC-03 — Report generation moved out of the request transaction — consistency seam

## Scenario

A billing dashboard generated a report inline: read all invoices, compute
a summary, and return it — all consistent with the request's point-in-time
read. A refactor moved generation to a background job that snapshots data
and serves a cached result later. The change is correct in structure but
introduces a consistency seam the request did not ask for.

## User request

> The report endpoint is slow because it aggregates all invoices inline.
> Generate the report in a background job and serve the cached result so
> the API is fast.

## Code change (diff)

```js
// before (inline, consistent):
app.get('/api/report', requireAuth, async (req, res) => {
  const rows = await db.query('SELECT * FROM invoices');   // reads at request time
  res.json(aggregate(rows));
});

// after (background job + cache):
const reportCache = new Map(); // stale until job runs

app.get('/api/report', requireAuth, async (req, res) => {
  res.json(reportCache.get('summary') ?? { pending: true }); // reads cache
});

// job.js — runs hourly:
const rows = await db.query('SELECT * FROM invoices');       // reads at job time
reportCache.set('summary', aggregate(rows));
```

## Surrounding context

- The job and the API run in the same process; the cache is in-memory.
- Invoices are written continuously; the hourly job's snapshot is a
  different point-in-time than the dashboard reader expects.
- There is no version/run-id on the cached summary, and no mechanism to
  invalidate or rebuild on demand.

## Expected outcome

- **WORTH-FIXING** with evidence **LIKELY**. The architecture moved from a
  request-time consistent read to a cached, job-time snapshot with no
  run-id, no invalidation, and no staleness signal. The API can serve a
  report that is up to an hour old *and* mix semantics (a "pending" state
  that never self-heals if the job fails). Whether this is a problem for
  the business depends on how the report is used — the deciding factor is
  not observable in-session, so the finding must be LIKELY with the
  condition named.
- Evidence: `LIKELY` — the seam is structural and visible (the read moved
  out of the request path into a snapshot with no consistency contract),
  but the *impact* (does anyone rely on freshness? does the dashboard show
  the job's date?) requires product knowledge not in the case. The review
  must say what it could not verify.
- Investigation: HIGH — trace where the data is read, when, and whether
  any versioning/invalidation exists across the seam.
- Impact: stale or internally-inconsistent report data served as if live —
  a reliability/trust defect, not data corruption.
- Regression test: not required — a staleness test is reasonable but the
  correct stance is to flag the missing contract, not to pin an arbitrary
  behavior.
- Fix: give the cache a run-id and timestamp, expose the snapshot time in
  the response, rebuild-on-demand (or invalidate on write), and define the
  staleness contract explicitly.

## Trap for the grader

The change "makes the endpoint fast" — the requested outcome. The trap is
that the refactor silently changed a *consistency guarantee* the original
had, and no part of the new code states the new contract. A review that
approves "moved to background job, serves cache" without examining the
snapshot/versioning seam misses it; a review that asserts "reports are now
wrong" without naming the missing contract over-claims.
