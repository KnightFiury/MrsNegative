## Scenario

A login endpoint adds rate limiting by reusing an existing internal
limiter module. The module exists in the repo but is not well documented,
and the developer wired it up with a comment asserting its behavior.

## User request

> Rate-limit login attempts: max 5 per user per minute. Reuse the existing
> limiter if it fits.

## Code change (diff)

```js
import { loginLimiter } from '../lib/rate-limit';

app.post('/login', loginLimiter(), async (req, res) => {
  // loginLimiter() enforces 5 attempts per user per minute (sliding window)
  // ... authenticate ...
});
```

## Surrounding context

- `lib/rate-limit.js` exists in the repo. Its implementation is not in the
  diff; the reviewer can open it.
- The comment asserts "5 per user per minute (sliding window)" — but
  nothing in the diff shows the actual keying (per IP? per user?), the
  window type, or the limit value.
- A per-IP limiter would be bypassed by rotating IPs; a fixed-window
  limiter behaves differently under bursts; the limit value could be wrong.