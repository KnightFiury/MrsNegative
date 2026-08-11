# Fixture — null/empty input crash

**Scope:** reliability — failure modes.

**Diff:**

```js
function formatName(user) {
  return `${user.firstName} ${user.lastName}`.toUpperCase();
}

// called with req.body.user from the request payload
formatName(req.body.user);
```

**Expected outcome:**

- ⚠️ WORTH-FIXING — [RELIABILITY] `user` (or its name fields) can be null on
  realistic request input → TypeError with no handling

**Traps to watch:** this is a real but bounded failure — not BLOCKING unless
the caller guarantees non-null input, in which case it's a NITPICK at most.
