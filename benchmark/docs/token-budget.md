# Mrs. Negative Benchmark — Token / Investigation Budget

Mrs. Negative should spend effort in proportion to what a finding deserves,
never in proportion to how many tools exist. This document defines the
classes, what each case expects, and how the benchmark records depth.

## Investigation classes

| Class | Typical cost | When it applies | Expected shape |
|---|---|---|---|
| `LOW` | ~0–50 lines of review | NITPICK, trivial correctness, NO-ISSUE verdicts | Read the diff, one-line finding, or "no meaningful issues" |
| `MEDIUM` | ~50–150 | WORTH-FIXING | Diff + one targeted check (one caller grep, one docs look-up) |
| `HIGH` | ~150–400 | BLOCKING investigation | Reproduce or trace the failure, write/pin the regression test |
| `VERY-HIGH` | > 400 | Security/concurrency/architecture seams | Trace input to sink, map the seam's callers across files/services |

## The rule

> Use the minimum investigation necessary to establish the expected
> evidence level.

- A `WORTH-FIXING` timeout omission does **not** require a full trace — it
  requires one docs check (or an honest "assumed, not verified").
- A `BLOCKING` SSRF finding **does** require tracing the user input to the
  network sink, and a `CONFIRMED` claim must show the trace.
- A `NO-ISSUE` verdict costs the least — but a safe verdict still has to
  rest on at least one actual check (parameterization seen, lock coverage
  verified), otherwise it is asserted, not earned.

The benchmark does not score "number of tools used." A run that greps
eight places to reach a NITPICK is scored down on proportionality, the same
as a run that asserts BLOCKING without any check.

## Per-case recording

Every case carries `investigation_expected: LOW | MEDIUM | HIGH |
VERY-HIGH` in its frontmatter, and the report compares actual investigation
signaled in the output against it. A `VERY-HIGH` case answered with a
single paragraph is under-investigated; a `LOW` case answered with a
thousand-word essay is over-investigated. Both are recorded.

## Costs by finding type (informational)

| Finding type | Class | Notes |
|---|---|---|
| NITPICK (naming, emoji, magic number) | LOW | Batch, one line each |
| WORTH-FIXING (validation, missing timeout) | MEDIUM | One targeted check |
| BLOCKING reliability (crash on realistic input) | HIGH | Trace + regression test |
| BLOCKING security (injection, authz, SSRF, secrets) | VERY-HIGH | Input-to-sink trace + proof payload |
| BLOCKING concurrency (race, lost update) | HIGH | Interleaving + regression test |
| Architecture seam | VERY-HIGH | Caller map + seam analysis |
| NO-ISSUE | LOW | One-line verdict, one grounding check |

This is a budget, not a ceiling — a security finding that needs an
extra grep to confirm a sink is verified is worth the grep. The point is
proportionality, not parsimony.
