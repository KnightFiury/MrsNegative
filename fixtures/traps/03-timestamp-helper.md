# Fixture — trap: tiny pure helper

**Scope:** trap — must produce NO findings.

**Diff:**

```js
function timestamp() {
  return new Date().toISOString();
}
```

**Expected outcome:**

- No findings.

**Traps to watch:** this is the quiet case — any finding at all is
over-tagging. The value of this fixture is that it stays silent.
