# Fixture — unexplained magic threshold

**Scope:** maintainability.

**Diff:**

```js
function shouldRateLimit(req) {
  return req.tokens > 1000;
}
```

**Expected outcome:**

- 💭 NITPICK — [MAINTAINABILITY] magic threshold `1000` unexplained — name it
  or comment the "why" (e.g. `MAX_TOKENS_PER_SECOND`)

**Traps to watch:** a NITPICK, batched, mentioned once. Never a blocker.
