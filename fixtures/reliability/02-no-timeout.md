# Fixture — no timeout on an external call

**Scope:** reliability — dependency trust.

**Diff:**

```js
async function isCardBlacklisted(cardId) {
  const res = await fetch(`https://risk.example.com/check/${cardId}`);
  return res.json().blacklisted;
}
```

**Expected outcome:**

- ⚠️ WORTH-FIXING — [RELIABILITY] no timeout — a hung upstream call hangs
  checkout indefinitely
- ⚠️ WORTH-FIXING — [RELIABILITY] `res.json()` result is assumed to have
  `.blacklisted` — a malformed response is unhandled

**Traps to watch:** the host is a constant trusted domain — a path segment
here is not an injection sink. Do not invent an injection finding.
