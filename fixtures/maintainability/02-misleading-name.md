# Fixture — misleading name

**Scope:** maintainability.

**Diff:**

```js
function calc(a, b) {
  // shipping cost from weight (a) and rate (b)
  return a * b + a;
}
```

**Expected outcome:**

- 💭 NITPICK — [MAINTAINABILITY] `calc` doesn't say what it computes, and the
  params are unhelpfully named — rename to `calculateShippingCost(weight, rate)`

**Traps to watch:** no security/reliability issues exist in this code — any
WORTH-FIXING+ tag is over-tagging.
