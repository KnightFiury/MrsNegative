# Future Work — Evidence Engine (design, not built)

> Status: **design only**. This document is deliberately not implemented.

## The problem it solves

Today Mrs. Negative's evidence is **self-reported**. She writes
`[CONFIRMED]` and the reader must trust that she inspected what she says
she inspected. The whole evidence model rests on that honesty, which is why
the persona's bias-resistance rules exist — but "the model says it looked"
is not the same as "a tool looked."

The future evidence engine closes that gap: instead of *saying* "I
inspected X," the system can *prove* "Tool X inspected X and returned Y."

## Architecture

```
         Mrs. Negative
               │
               ▼
         Evidence Request
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
   grep       tests     runtime
    │          │          │
    └──────────┼──────────┘
               ▼
         Evidence Result
               │
               ▼
         Severity Engine
               │
               ▼
            Finding
```

### Evidence Request

A structured demand from the persona layer, e.g.:

```json
{
  "kind": "sink_reachability",
  "input": "req.body.url",
  "sink": "fetch",
  "file": "src/proxy.ts",
  "because": "possible SSRF; need CONFIRMED before BLOCKING"
}
```

Kinds the design anticipates (non-exhaustive):

- `sink_reachability` — does input X reach sink Y?
- `callers_of` — who calls symbol S, and does the change break them?
- `dependency_default` — what is library L's default for behavior B?
- `interleaving_race` — can A and B interleave to produce state S?
- `repro_payload` — does payload P fail on the current code?
- `clean_verdict` — is there any path from X to Y at all? (for NO-ISSUE)

### Evidence Result

A tool response that is **machine-attributable**:

```json
{
  "request": { "...": "as above" },
  "tool": "rg",
  "command": "rg -n 'fetch\\(' src/proxy.ts",
  "exit": 0,
  "output": ["src/proxy.ts:41:  const res = await fetch(url)"],
  "verdict": "input_to_sink_confirmed",
  "confidence": "direct"
}
```

The key property: the finding can now cite the **command** and the
**tool's output**, not the model's claim.

### Severity Engine

A deterministic layer that maps `(severity candidate, evidence result,
rules from PERSONA.md)` to the final finding. The persona still decides
what to ask; the engine decides what a result proves. This is the boundary
that would make `UNVERIFIED → BLOCKING` mechanically impossible: the
engine refuses to emit `BLOCKING` when the evidence result says
`unverified`.

## What it does NOT do

- It does not replace Mrs. Negative's judgment — severity, calibration,
  intent, and tone remain the persona's job.
- It does not search the whole repo on every diff. The persona's
  diff-scoping and conditional architecture review still govern *when*
  evidence is requested.
- It is not a static analysis product. It is a thin, honest accounting
  layer for the checks the persona already tells the agent to run.

## How it would be integrated

- The Output contract's `Evidence` field would cite an `Evidence Result`
  id instead of (or alongside) prose.
- `[CONFIRMED]` would require at least one machine-attributable result;
  `[LIKELY]` would permit reasoning-only; `[UNVERIFIED]` would record that
  the request was made and nothing conclusive returned.
- The benchmark's `evidence_expected` answers would map 1:1 onto the
  `Evidence Request` kinds, making scoring deterministic instead of
  judge-approximated.

## Why it is not built now

- The repository is instruction-only; there is no agent harness or tool
  runtime to attach it to. Building the engine here would mean shipping
  dead code.
- The benchmark (this directory) exists first precisely so that when the
  engine is built, its effect on measured accuracy — not just its existence
  — can be verified.
- Precedent: the persona already encodes the behaviors the engine would
  make auditable (verify dependency defaults, trace sinks, write
  interleavings). The engine adds proof, not new policy.
