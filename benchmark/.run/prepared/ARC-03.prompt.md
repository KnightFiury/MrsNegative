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