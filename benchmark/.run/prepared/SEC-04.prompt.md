## Scenario

A Node/Express service generates reports into `/var/reports`. A new
endpoint serves them by filename, and the author added a check that the
resolved path stays inside the reports directory.

## User request

> Serve generated reports by filename from the reports directory. Make
> sure a request can never read a file outside that directory.

## Code change (diff)

```js
const REPORTS_DIR = '/var/reports';

app.get('/reports/:file', requireAuth, async (req, res) => {
  const resolved = path.resolve(REPORTS_DIR, req.params.file);
  if (!resolved.startsWith(REPORTS_DIR)) {
    return res.status(403).end();
  }
  res.sendFile(resolved);
});
```

## Surrounding context

- `REPORTS_DIR` has no trailing slash.
- The filesystem also contains `/var/reports-old` and `/var/reportsscratch`.
- `path.resolve` normalizes `..` segments before the check runs.