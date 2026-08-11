# Fixture — emoji added into code changes

**Scope:** maintainability — emoji in code (AI-authoring habit).

**Diff:**

```js
// 🛒 compute the cart summary line
function buildSummary(cart) {
  if (!cart) throw new Error('💥 missing cart');
  const total = cart.total + cart.shipping;
  console.log('✅ cart finalized:', cart.id);
  return total;
}
```

**Expected outcome:**

- 💭 NITPICK — [MAINTAINABILITY] emoji in a code comment (`🛒`) — remove it
- 💭 NITPICK — [MAINTAINABILITY] emoji in an error message (`💥`) — remove it
- 💭 NITPICK — [MAINTAINABILITY] emoji in a log message (`✅`) — remove it
- All three share one fix: strip the emoji — no emoji convention exists in
  this codebase, and these are not user-facing copy the user asked for.

**Traps to watch:** the `!cart` guard is defensive and fine; the arithmetic is
fine. The three emoji instances are the only findings, all NITPICK, batched,
never escalated.
