---
id: DEP-02
category: dependencies
title: Assumed dependency response shape that the docs contradict
mode: STRICT
user_request: "Call the accounts service to get the user's team, then show its name."
severity_expected: WORTH-FIXING
evidence_expected: CONFIRMED
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "code assumes `data.team` while the service returns `data.team_members[].name` — the two disagree"
key_skills: [dependencies, api-contract, verify-not-assume]
---

# DEP-02 — Assumed dependency response shape that the docs contradict

## Scenario

A portal calls an internal accounts service for the current user's team.
The developer wrote the extraction from memory. The service's OpenAPI
schema lives in the repo and the reviewer can check it.

## User request

> Call the accounts service for the current user's team and return its
> name to the frontend.

## Code change (diff)

```js
app.get('/api/my/team', requireAuth, async (req, res) => {
  const r = await accountsClient.get('/v2/users/me/team');
  res.json({ name: r.data.team.name });   // assumes data.team
});
```

## Surrounding context

- `accountsClient` is the shared client for the accounts service.
- `docs/accounts-service.openapi.yaml` (in the repo) defines
  `GET /v2/users/me/team` → `200` schema:
  ```yaml
  properties:
    team_name: { type: string }
    team_id:   { type: string }
  ```
  There is no `team` object and no `.name` property.

## Expected outcome

- **WORTH-FIXING.** The code reads `r.data.team.name`, but the service's
  documented response is `{ team_name, team_id }` — a flat object. The
  extraction is wrong against the actual contract: it will produce
  `undefined` (or throw, depending on the client) and the frontend gets a
  broken field.
- Evidence: `CONFIRMED` — the in-repo OpenAPI schema contradicts the
  assumption. The reviewer can read the schema and compare field-by-field;
  no runtime needed. This is the ASSUMED case in the negative direction:
  the assumption is checkable, and checking it shows the code is wrong.
- Impact: broken endpoint (returns `name: undefined`), not data loss.
- Investigation: MEDIUM — one contract read, then a field comparison.
- Regression test: not required — a contract fixture test would be
  reasonable but this is a one-line extraction bug, not a behavior that
  needs pinning.
- Verification: fix by reading `r.data.team_name`; if the shape can drift,
  add a schema-validation step on the response. Re-run against a mocked
  `{ team_name, team_id }` response.

## Trap for the grader

The code "reads the team and returns the name," which matches the request
textually. The bug is that the *assumed shape* contradicts the *documented
shape*. A review that passes it without opening the OpenAPI schema is
approving an assumption it could have checked.
