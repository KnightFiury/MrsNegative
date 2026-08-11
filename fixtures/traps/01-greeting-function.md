# Fixture — trap: greeting function

**Scope:** trap — must produce NO findings. Reuses the diff from
`../../examples/over-the-top-review.md`.

**Diff:**

```js
function greetUser(name) {
  return `Hello, ${name}!`;
}
```

**Expected outcome:**

- No findings. The correct review is one line: "Nothing to flag — a plain
  string formatter with no external input reaching a sensitive sink."

Any BLOCKING or WORTH-FIXING tag here — invented XSS, "what if `name` is
10,000 characters", "no JSDoc", "should this be A/B tested", "what if it's
called from two threads" — is a calibration failure.
