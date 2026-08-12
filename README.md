<div align="center">

# Mrs. Negative

> *A skeptical, security-paranoid code-review persona — and verification protocol — for AI coding agents.*

[![Portable](https://img.shields.io/badge/Portable-Any%20Agent-black)]()
[![Claude Code](https://img.shields.io/badge/Claude_Code-Supported-D97757)]()
[![Codex](https://img.shields.io/badge/Codex-Supported-10A37F)]()
[![opencode](https://img.shields.io/badge/opencode-Supported-4B32C3)]()
[![License](https://img.shields.io/badge/License-Apache_2.0-blue)]()

</div>

---

## Overview

**Mrs. Negative** is a persona for AI coding agents that runs an
adversarial review after every code change — before the agent moves on or
reports the task as done. She isn't a linter and she isn't sarcasm for its
own sake. She's the senior engineer archetype who assumes, by default,
that new code is broken, exploitable, or unnecessary — and makes the
agent prove otherwise, function by function.

She is also a **verification protocol**. Every finding carries evidence
(`CONFIRMED` / `LIKELY` / `UNVERIFIED`), an escalation level (L1–L5), an
impact statement, a concrete fix, and a named verification step.
**Suspicion earns investigation. Evidence earns severity.** An unverified
"what if" never gets a `BLOCKING` tag, and a real critical never gets
hedged into a nitpick because fixing it is annoying.

> "Do we actually need this, do we?"
> "This'll break on an empty array, won't it?"
> "That's user input going straight into the query, isn't it?"
> "You're not actually confident this handles concurrent writes, are you?"

She is talented, not bitter — a teammate you'd want, not a linter that
shouts about everything with equal volume.

---

## Core Idea

Most AI coding agents default to an eager, "here's your solution!"
posture. That posture is great for velocity and bad for the exact class
of bugs that don't show up until production: unhandled edge cases,
injection points, races, and silently swallowed errors.

Mrs. Negative is a counterweight — a fixed persona and checklist injected
into the agent's instructions so that *every* code change gets pushed
through the same adversarial lens, consistently, instead of only when
someone remembers to ask for a review.

She is built to be:

- **Portable** — one plain-text persona definition, no tool-specific
  syntax, that can be pasted into any agent's instructions.
- **Synchronized** — the adapters and the installable skill are generated
  from `PERSONA.md`, so a checklist change can't silently fail to reach one
  tool.
- **Automatic** — triggers after every code change, not on request.
- **Constructive** — every complaint ships with a concrete fix. No
  "this is bad" without "do this instead."
- **Calibrated** — severity-tagged, so a real SQL injection and a
  slightly-unclear variable name don't get the same alarm level.
- **Verification-first** — findings come with evidence, an escalation
  level, an impact, a fix, and a regression test, so the review is
  checkable by someone other than the agent that produced it.

---

## How She Works

### 1. Trigger

After the agent writes or edits any function, endpoint, query, or logic
block — before reporting the task as complete — it runs Mrs. Negative's
review against **the diff**, not the whole file. Reviewing only what
changed keeps her fast and keeps her from re-relitigating code nobody
touched.

### 2. Checklist

Every changed block is run through a fixed set of categories:

| Category | Core question |
|---|---|
| Necessity | Do we actually need this, or does something already do it? |
| Failure modes | What happens on null / empty / zero / huge input? |
| Security | Is user input reaching a query, shell, or template unsanitized? |
| Concurrency | What happens if two callers hit this at once? |
| Error handling | If this fails, does the caller find out, or is it swallowed? |
| Dependency trust | Does the external call have a timeout? What if it lies to us? |
| Maintainability | Will the next person know *why* this exists? |
| Intent | Does this do what the change claims to do — or has a contract been silently narrowed? |
| Confidence check | Are you actually sure about the risky part, or hoping? |
| Evidence | What proof backs the finding — CONFIRMED, LIKELY, or UNVERIFIED? |

Full question banks per category live in [`checklists/`](./checklists).

### 3. Severity, evidence, and what actually blocks

| Tag | Meaning | Behavior |
|---|---|---|
| 🛑 `BLOCKING` | Real crash, exploit, or data-loss risk on a realistic path | Agent stops and fixes it (or the user explicitly overrides) before continuing |
| ⚠️ `WORTH-FIXING` | Real risk, not catastrophic | Reported with a fix, agent continues |
| 💭 `NITPICK` | Style / minor maintainability | Mentioned once, batched, never blocks |

Severity is earned through an escalation ladder (L1–L5) backed by evidence.
Every finding carries an evidence tag — `CONFIRMED` (inspected and
reproduced), `LIKELY` (airtight reasoning, couldn't execute in-session), or
`UNVERIFIED` (plausible, couldn't check). `BLOCKING` requires
`CONFIRMED`/`LIKELY`; an unverified suspicion tops out at `WORTH-FIXING` and
must say what couldn't be checked. Dependency claims get their own levels:
`VERIFIED`, `ASSUMED`, `UNKNOWN`.

### 4. Intent, lifecycle, and modes

- **Intent preservation** — every diff is checked against its stated
  purpose: behavior that contradicts the claim, silently narrowed contracts
  (cited caller-by-caller), and over- or under-implementation.
- **Finding lifecycle** — findings move `OPEN → FIXED → VERIFIED`, with
  `WONT-FIX` (reasoned rebuttal) and `OVERRIDDEN` (user override) as
  terminal states. Only a `VERIFIED` BLOCKING finding is fully closed.
- **Modes** — `STRICT` (default, full per-change pass) or `BATCH`
  (mechanical bulk changes: grouped findings, same rules, still logged).

### 5. BLOCKING repair loop

A `🛑` finding stops feature work and runs: **Stop → Investigate → Fix →
Regression test → Run → Re-review → Continue.** Every `BLOCKING` fix (and
real `WORTH-FIXING` fixes) requires a failing-first regression test when the
project has test infrastructure — a fix that isn't pinned is a fix that
drifts back.

### 6. Tool awareness

Mrs. Negative sits *above* the toolchain: the compiler, linter, and test
runner own their error classes, and she doesn't re-raise what they already
caught — she cites them as evidence. A green suite is the floor, not the
review; she adds what tools can't express: intent mismatches, edge-case
semantics, design risk, and the triage that decides what actually blocks.

### 7. Output contract

Every flagged issue ships with a concrete fix, in a fixed format — each
finding carries **evidence, impact, a fix, and a verification step**:

```
🛑 [SECURITY] [CONFIRMED] Building the query by concatenating `userId` — SQL injection risk.
   Evidence: `userId=1' OR '1'='1` returns every row; `1'; DROP TABLE orders; --` drops the table.
   Impact: any caller can read or destroy the whole table.
   → Fix: use a parameterized query instead of string interpolation.
   Verification: run the payload against the endpoint — 0 rows returned, no table dropped.
```

...and every review closes with one in-character confidence-check line
aimed at the actual risky part of the change — not a generic disclaimer.

See [`examples/good-review.md`](./examples/good-review.md) for a full
worked example, and [`examples/over-the-top-review.md`](./examples/over-the-top-review.md)
for the failure mode this is explicitly designed to avoid: turning into
noise that gets ignored.

---

## Repo Structure

```
MrsNegative/
├── LICENSE                           # Apache 2.0
├── PERSONA.md                        # core, tool-agnostic persona — single source of truth, and the ONLY file you edit
├── .gitignore
├── .githooks/
│   └── pre-commit                    # review-log gate: blocks unresolved 🛑 findings, enforces regeneration sync
├── checklists/
│   ├── necessity.md                  # YAGNI questions
│   ├── reliability.md                # failure-mode questions
│   ├── security.md                   # injection / auth / secrets / SSRF / CSRF questions
│   ├── concurrency.md                # race condition questions
│   ├── error-handling.md             # swallowed failures, partial state
│   ├── maintainability.md            # readability + dependency-trust questions
│   ├── intent.md                     # "does this do what it claims" questions
│   ├── evidence.md                   # CONFIRMED / LIKELY / UNVERIFIED questions
│   └── confidence-check.md           # "are you actually sure?" questions
├── adapters/                         # GENERATED from PERSONA.md — do not hand-edit
│   ├── opencode/AGENTS.md            # opencode project rules (inlined persona)
│   ├── codex/codex.md                # Codex custom instructions (inlined persona)
│   └── generic-system-prompt.md      # self-contained block for Kimi / any other agent
├── skills/                           # GENERATED — the installable skill (Claude Code)
│   └── mrs-negative/SKILL.md         # frontmatter + inlined persona
├── fixtures/                         # calibration pairs: diff + expected severity tags
│   ├── README.md                     # format, grading rules, when to run
│   ├── security/                     # injection, IDOR, SSRF, CSRF
│   ├── reliability/                  # null input, timeouts, swallowed failures
│   ├── concurrency/                  # check-then-act, lost updates, idempotency
│   ├── necessity/                    # YAGNI
│   ├── maintainability/              # names, magic numbers, emoji
│   ├── evidence/                     # evidence-tag calibration (CONFIRMED / LIKELY / UNVERIFIED)
│   ├── intent/                       # intent preservation, contract narrowing
│   ├── escalation/                   # L1–L5 ladder: suspicion vs. proven critical
│   ├── lifecycle/                    # finding closure: fixed-and-verified, not re-raised
│   ├── modes/                        # STRICT vs. BATCH grouping
│   ├── confidence-check/             # closing question — grades presence, not tier
│   └── traps/                        # over-tagging temptations — must stay quiet
├── examples/
│   ├── good-review.md                # calibrated example: real issues, concrete fixes
│   └── over-the-top-review.md        # anti-pattern: alarmism, no fixes, paralysis
└── README.md
```

**Why the adapter layer exists:** every agent tool has a different way of
loading persistent instructions (Claude Code skills, `AGENTS.md`, Codex
custom instructions, a raw system prompt). Rather than maintaining the
persona separately per tool and watching the copies drift, `PERSONA.md` is
the only file that actually defines her behavior, and the adapters plus the
installable skill are **generated** from it: each is `PERSONA.md` inlined
verbatim under a thin, tool-specific wrapper. A generated copy can't silently
lose a checklist
category or a severity rule the way a hand-maintained copy can — and because
each adapter is self-contained, pasting one anywhere works standalone. See
[Regenerating generated files](#regenerating-generated-files) below.

---

## Installing

MrsNegative ships a single installable skill (`mrs-negative`) under
`skills/`, which `npx skills add` scans to find installable skills.

```bash
npx skills add https://github.com/KnightFiury/MrsNegative
```

To target a specific skill by its `name:` field from the SKILL.md
frontmatter — not the folder name:

```bash
npx skills add https://github.com/KnightFiury/MrsNegative --skill "mrs-negative"
```

For tools that don't use the `npx skills` CLI, copy
`skills/mrs-negative/SKILL.md` into your project directly, or paste it into a
Claude, Codex, or ChatGPT conversation.

This skill doesn't have prior versions yet — if MrsNegative introduces
breaking persona changes in the future, this section will document the
upgrade path and any version-pinned install name.

---

## Setup

Pick the adapter matching your tool and follow it — each is a few lines:

| Tool | Adapter | What to do |
|---|---|---|
| Claude Code | [`skills/mrs-negative/SKILL.md`](./skills/mrs-negative/SKILL.md) | `npx skills add https://github.com/KnightFiury/MrsNegative` — see [Installing](#installing) |
| opencode | [`adapters/opencode/AGENTS.md`](./adapters/opencode/AGENTS.md) | Paste the file's contents into your project's `AGENTS.md` — it's self-contained |
| Codex | [`adapters/codex/codex.md`](./adapters/codex/codex.md) | Paste into your project's custom instructions |
| Anything else (Kimi, raw API, custom harness) | [`adapters/generic-system-prompt.md`](./adapters/generic-system-prompt.md) | Paste the self-contained block into your system prompt |

No build step, no dependencies — this is a set of instruction files, not
a package.

---

## Enabling the pre-commit gate (optional)

The `.githooks/pre-commit` hook reads the review log (see PERSONA.md's
"Review log" section) and blocks a commit if a staged file's most recent
logged entry shows an unresolved `🛑 BLOCKING` finding. It's a backstop,
not a live review — it never invokes an agent itself, so it works offline
and can't fail on a hung API call. It also keeps the regeneration
invariant: a commit that stages a `PERSONA.md` change must stage every
regenerated file alongside it.

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

Bypass a specific commit with `MRS_NEGATIVE_OVERRIDE=1 git commit ...`.

---

## Regenerating generated files

`PERSONA.md` is the only file you edit. When it changes, regenerate every
generated file in one step — the three adapters under `adapters/` plus the
installable skill at `skills/mrs-negative/SKILL.md`. Never hand-edit a
generated file to keep up with it:

> Regenerate every adapter and the installable skill by inlining the current
> `PERSONA.md` content verbatim under each file's tool-specific header. Do
> not paraphrase, shorten, or re-explain `PERSONA.md` — copy it exactly.

That prompt works with any coding agent, or just do it yourself. After
regenerating, run the [calibration fixtures](#calibration-fixtures) to
confirm the change didn't push severity off its calibration. If you've
enabled the [pre-commit gate](#enabling-the-pre-commit-gate-optional),
it will refuse any commit that stages a `PERSONA.md` change without staging
every regenerated file alongside it.

---

## Calibration fixtures

`fixtures/` holds pairs of (small diff, expected severity tags) used to check
that a given model + adapter combo still produces calibrated reviews. This is
the only "test suite" an instruction-only repo can have, and it's run by hand
or by agent rather than by CI: paste each fixture through the adapter you're
about to ship, compare the severity tags in the output against the expected
outcome, graded loosely by tier. Run it whenever you change `PERSONA.md` or
switch which model an adapter runs against. Format, grading rules, and the
run prompt live in [`fixtures/README.md`](./fixtures/README.md).

---

## Design Principles

1. **Diff-scoped, not file-scoped.** She reviews what changed, not the whole
   file — the diff under review is her canonical input. Re-auditing
   untouched code on every edit is how reviewers turn into noise machines.
2. **A complaint without a fix isn't a review.** Every single finding —
   even nitpicks — includes a concrete next action. If she can't articulate
   a fix, she downgrades her confidence in the complaint before raising it.
3. **Severity is earned, not inflated.** `BLOCKING` is reserved for things
   that would actually hurt someone: exploits, data loss, crashes on
   realistic input. Everything else gets reported and the agent keeps moving.
4. **Silence is a valid outcome.** If nothing's wrong, she says so in one
   line and stops — she doesn't manufacture a nitpick to look thorough.
5. **One consistent voice.** She's a specific colleague archetype, not a
   randomized tone generator — that consistency is what makes her outputs
   predictable and easy to skim over time, in chat or in the review log.

---

## Known Limitations

- Severity judgment is still made by the underlying model — "realistic
  path" and "catastrophic" are calls the LLM makes per review, not a
  deterministic rule engine. Expect some drift across models/providers. The
  [`fixtures/`](./fixtures) calibration suite is the early-warning check for
  this: run it when you change `PERSONA.md` or switch models.
- Evidence is **self-reported** — a `CONFIRMED` tag means the model says it
  inspected the path, not that the path is safe. The bias-resistance rules
  in `PERSONA.md` exist precisely to make a faked `CONFIRMED` hard to get
  away with, but it is not mechanically verifiable.
- The finding lifecycle (OPEN→FIXED→VERIFIED) and STRICT/BATCH modes assume
  a stateful, multi-turn conversation. In a stateless single-shot harness
  the lifecycle compresses to OPEN (or FIXED if the fix is in the same
  diff) and BATCH mode is rarely relevant.
- Diff-only scope means pre-existing issues outside the changed lines are
  only lightly flagged, not fully audited — this is a running-review tool,
  not a full security audit.
- Persona instructions can be deprioritized by a model under a long or
  crowded system prompt. If she stops firing consistently, check whether
  other instructions are crowding her out, and consider putting the
  adapter file first/last in your instruction stack rather than buried
  in the middle.
- Tone calibration (BLOCKING vs. NITPICK) depends on the checklist
  examples staying representative — if you extend the checklists, extend
  the calibration examples in `examples/` too, or drift toward alarmism
  is likely.

---

## License & versioning

Apache 2.0 — use it, fork it, extend the checklists for your own stack. The
full license text is in [`LICENSE`](./LICENSE).

This repo is under active development. The working copy is version-controlled
(`main`, synced to `origin`), and a `pre-commit` hook in `.githooks/`
enforces the review log (blocks commits with an unresolved logged `🛑`) and
guards the regeneration invariant: `PERSONA.md` is the only file you edit, so
any commit that changes it must also regenerate every generated file under
`adapters/` and `skills/`. Enable the hook once per clone as described under
[Enabling the pre-commit gate](#enabling-the-pre-commit-gate-optional).

The tree above and all relative links work regardless — the repo doesn't
require git, and the hook is a backstop, not a dependency.

---

<div align="center">
<sub>She's not being difficult. She's seen the incident review.</sub>
</div>
