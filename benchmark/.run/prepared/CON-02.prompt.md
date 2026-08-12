## Scenario

A downloads service increments a per-user counter on each download. The
agent wrote a read-modify-write against a Postgres column.

## User request

> Track how many times each user downloads a file. The counter must be
> accurate even when a user downloads the same file from two tabs at once.

## Code change (diff)

```js
async function recordDownload(userId, fileId) {
  const row = await db.query(
    'SELECT download_count FROM user_files WHERE user_id = $1 AND file_id = $2',
    [userId, fileId],
  );
  const next = (row?.download_count ?? 0) + 1;
  await db.query(
    'INSERT INTO user_files (user_id, file_id, download_count) VALUES ($1, $2, $3) ' +
    'ON CONFLICT (user_id, file_id) DO UPDATE SET download_count = $3',
    [userId, fileId, next],
  );
}
```

## Surrounding context

- The `ON CONFLICT` upsert is atomic per statement, but the value it
  writes (`next`) was computed from a *separate earlier read*.
- Two concurrent downloads for the same (user, file) are realistic
  (double-click, two tabs).