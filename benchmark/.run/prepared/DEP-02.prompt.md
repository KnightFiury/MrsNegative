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