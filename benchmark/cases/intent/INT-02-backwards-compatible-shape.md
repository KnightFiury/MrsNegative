---
id: INT-02
category: intent
title: "Keep the API backwards compatible" — response shape silently changed
mode: STRICT
user_request: "Refactor the user serializer to use the shared profile helper. Keep the API response shape backwards compatible — existing clients must not break."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "response field renamed/dropped, breaking documented clients that depend on it"
key_skills: [intent, api-contract, caller-grep]
---

# INT-02 — "Keep the API backwards compatible" — response shape silently changed

## Scenario

An API team consolidated user serialization into a shared helper. The
request said the response shape must stay backwards compatible. The
change swapped a field name (`username` → `name`) and dropped a field
(`email`), and the shared helper is also used by a mobile client
documented in the repo.

## User request

> Refactor the user serializer to use the shared profile helper. The
> response shape must stay backwards compatible — existing clients keep
> working unchanged.

## Code change (diff)

```js
// before (users controller):
function serializeUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

// after (using shared helper):
import { toProfile } from '../lib/profiles';

function serializeUser(user) {
  return toProfile(user); // { id, name, avatar_url } — no email, no username
}
```

## Surrounding context

- `lib/profiles.js` is the shared helper; `toProfile` returns
  `{ id, name, avatar_url }`.
- `docs/mobile-api.md` (in the repo) documents that the iOS/Android client
  reads `username` and `email` from `GET /users/:id`.
- The change is a pure refactor in intent, but it alters the public
  response contract.

## Expected outcome

- **BLOCKING.** The refactor changed the response shape: `username` and
  `email` are gone, `name` and `avatar_url` are new. Documented clients
  that read `username`/`email` break at runtime — a silent contract
  violation that contradicts the explicit "backwards compatible" request.
- Evidence: `CONFIRMED` — compare the before/after serializer shapes and
  cross-check the documented client expectations in `docs/mobile-api.md`.
  This is a caller-grep + contract-compare finding; both are visible
  in-repo.
- Impact: production client breakage (login/billing/profile screens),
  incident-class for a mobile app release.
- Investigation: HIGH — find the documented consumers of the shape and
  compare fields.
- Regression test: yes — a response-shape test asserting `username` and
  `email` are present (and ideally a fixture with the old shape), run
  against the new serializer.
- Verification: fix by extending `serializeUser` to include `username` and
  `email` (or map the shared helper output), keeping `toProfile` for new
  surfaces; re-run the shape test.

## Trap for the grader

The refactor is small, clean, and "improves" code — exactly the kind of
change that passes a mechanics-only review. The correct review must check
the change against the *stated intent* (backwards compatibility) and the
*known consumers*, not just whether the new code compiles and returns a
user object.
