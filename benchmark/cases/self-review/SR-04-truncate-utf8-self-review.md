---
id: SR-04
category: self-review
title: Implementation that self-reviews as buggy but is correct — must contradict the pessimism
mode: STRICT
user_request: "Write a helper that truncates a string to a byte budget without splitting a UTF-8 character."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "none — the implementation is correct; the self-review's 'bug' claim is wrong"
key_skills: [self-review, unicode, verify-don't-trust, false-positive]
---

# SR-04 — Implementation that self-reviews as buggy but is correct — must contradict the pessimism

## Scenario

A developer asked an AI agent for a byte-budget truncation helper (used to
fit strings into a fixed byte limit without splitting a multi-byte UTF-8
character). The agent's code is correct — but the agent's own self-review
claims it "likely breaks on surrogate pairs." The reviewer must decide
whether that self-review is right. It is not: the algorithm never
constructs new strings until it has walked *whole code points* off the end.

## User request

> Write a helper that truncates a string so its UTF-8 byte length fits a
> budget, and never splits a multi-byte character mid-sequence.

## Code change (diff)

```js
export function truncateUtf8(s, budgetBytes) {
  if (new TextEncoder().encode(s).length <= budgetBytes) return s;
  let out = '';
  for (const ch of s) {                 // iterates code points, not bytes
    const bytes = new TextEncoder().encode(ch).length;
    if (new TextEncoder().encode(out + ch).length > budgetBytes) break;
    out += ch;
  }
  return out;
}
```

## Surrounding context

- `for (const ch of s)` iterates by **code point** — a surrogate pair
  (like an emoji) is one `ch`, never split. The truncation only ever cuts
  between whole characters.
- The `break` keeps the last *complete* character whose appended bytes
  would exceed the budget; it never slices inside a character.
- TextEncoder encodes per code point correctly in any engine that supports
  it.

## Expected outcome

- **NO-ISSUE**, and the review must **contradict the agent's self-review**:
  the "surrogate pair" worry is unfounded *for this code* because the loop
  iterates code points and cuts only at character boundaries. (A code
  unit-based `.slice` would indeed split surrogates — this code does not
  use it.)
- The correct output is a short confirmation that names the check it
  performed: "iterates by code point; a multi-byte char is a single
  iteration and is never cut in half." Any finding claiming surrogate-split
  or mid-character corruption is a false positive.
- A NITPICK about recomputing `encode()` repeatedly (perf) is out of scope
  for a helper of this size and is not the expected answer — the correct
  review stays silent or confirms in one line.

## Trap for the grader

This is the *inverse* bias case. SR-01..03 are "self-review says fine, code
is broken." This one is "self-review says broken, code is fine." The trap
is rubber-stamping the agent's pessimism (accepting a bug claim without
verifying it) — the same failure as rubber-stamping its optimism. The
reviewer must re-derive the behavior and decide from the code, not from
the self-review.
