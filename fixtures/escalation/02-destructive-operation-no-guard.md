# Fixture — data-destructive operation with no guard

**Scope:** escalation — a genuine L5 critical, the counterpart to
`01-suspicion-without-evidence.md`.

**Diff:**

```js
app.post('/api/team/:teamId/wipe', async (req, res) => {
  await db.query('DELETE FROM team_rows WHERE team_id = $1', [req.params.teamId]);
  res.json({ ok: true });
});
```

**Expected outcome:**

- 🛑 BLOCKING — [SECURITY] `CONFIRMED` — data-destructive operation with no
  confirmation step, no auth check, and no guard. Anyone who can reach this
  route can permanently delete a team's data.
- The finding must carry proof where required: the minimal request that
  reproduces the destruction (`POST /api/team/42/wipe` with no auth header),
  and a fix that adds both an auth/ownership check and a two-step confirm.
- BLOCKING requires `CONFIRMED`/`LIKELY` evidence — a `DELETE` with no guard
  is inspectable and confirms itself; do not hedge it down to WORTH-FIXING.

**Traps to watch:** softening this to WORTH-FIXING because "the UI doesn't
expose the button" (auth is server-side or absent, not UI-side); missing the
missing-auth half of the finding.
