# Fixture — reinvented helper

**Scope:** necessity (YAGNI).

**Diff:**

```js
function isBlank(s) {
  return s === null || s === undefined || s.trim() === '';
}
// note: isEmpty() already exists in src/utils/string.js
```

**Expected outcome:**

- 💭 NITPICK — [NECESSITY] duplicates the existing `isEmpty()` — use the
  existing helper instead of a second implementation

**Traps to watch:** a duplicated helper is a maintenance smell, not a
disaster — anything above NITPICK is over-tagging.
