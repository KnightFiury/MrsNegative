## Scenario

An image-resize endpoint calls a third-party resize service. It sometimes
fails, so the agent wrapped it in a retry loop — retrying immediately up
to 4 times.

## User request

> The resize service is flaky — retry it a few times before returning an
> error to the user.

## Code change (diff)

```js
async function resizeImage(key) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${RESIZE_SVC}/resize`, {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      // retry immediately — no delay, no backoff, no jitter
    } else {
      break; // 4xx client error: don't retry
    }
  }
  throw new Error('resize failed');
}
```

## Surrounding context

- The resize service returns 429/503 when it is overloaded (per its docs).
- The endpoint is called by many users; during an incident, many requests
  hit the retry loop at once.
- The call is idempotent (resize by key), so duplicates are not a
  correctness bug — the problem is load.