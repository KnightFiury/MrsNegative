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