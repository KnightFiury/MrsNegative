## Scenario

A data-sync job calls an upstream API. Some errors are permanent (400
validation, 403, 404) and some are transient (timeout, 429, 5xx). The
agent implemented a retry loop that retries on **any** thrown error.

## User request

> Retry the sync call on transient failures only — timeouts, 429, 5xx.
> Do not retry permanent failures like 400/403; those should fail fast so
> we see the real error.

## Code change (diff)

```js
async function syncItem(item) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await api.put(`/items/${item.id}`, item);
      return res;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 403) {
        throw err; // permanent: fail fast (correct branch)
      }
      // everything else (timeouts, 429, 5xx) retried — matches intent
    }
  }
  throw new Error(`sync failed after retries for ${item.id}`);
}
```

## Surrounding context

- `api` is the axios client; `err.response.status` distinguishes HTTP
  responses, but timeouts/network errors throw without `err.response`.
- The requirement names the classes explicitly: retry transient, fail fast
  permanent.
- The implementation's only permanent-classification is `400` and `403`;
  other 4xx (401, 404, 405, 409, 422...) and any non-HTTP error fall into
  the retry bucket.