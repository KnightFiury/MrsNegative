---
id: REL-03
category: reliability
title: Resource leak on the error path — streams not closed
mode: STRICT
user_request: "Add a download endpoint that streams a large file. It must not leak resources when the client disconnects."
severity_expected: WORTH-FIXING
evidence_expected: CONFIRMED
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "file handle/stream leaked when the client disconnects mid-download"
key_skills: [reliability, resource-leak, error-handling]
---

# REL-03 — Resource leak on the error path — streams not closed

## Scenario

A Node/Express server streams large files (e.g. exports) to clients. The
handler opens a readable stream from disk and pipes it to the response.
If the client disconnects mid-stream, the readable side is left open.

## User request

> Stream the export file to the browser. Make sure we clean up if the
> client cancels mid-download.

## Code change (diff)

```js
app.get('/exports/:id/download', requireAuth, async (req, res) => {
  const record = await db.query('SELECT path FROM exports WHERE id = $1', [req.params.id]);
  if (!record) return res.status(404).end();

  const src = fs.createReadStream(record.path);
  src.pipe(res);

  // no 'error'/'close' handler on src; no cleanup on res 'close'
});
```

## Surrounding context

- `fs.createReadStream` opens a file descriptor that must be released.
- Clients cancel downloads (or network errors abort them) regularly; on
  abort, `res` emits `close`, but `src` keeps streaming internally.
- The handler leaves the FD open until `src` finishes naturally.

## Expected outcome

- **WORTH-FIXING.** When the response aborts (`close` event), the source
  stream is never destroyed, so the file descriptor stays open. Under
  repeated aborted downloads this leaks FDs and eventually exhausts the
  process's file-handle limit, taking the whole server down.
- Evidence: `CONFIRMED` — the leak path is visible in the code: `src` is
  created, piped, and has no `close`/`error`/`destroy` handling tied to the
  response's lifecycle. This is deterministic on the disconnect path, not a
  guess.
- Impact: FD exhaustion under realistic usage (aborted downloads are
  normal, not exceptional).
- Investigation: MEDIUM — check whether the stream is wired to the
  response lifecycle; here it is not.
- Regression test: not strictly required (FD counts are environment-
  sensitive), but a test that aborts a download and asserts the stream is
  destroyed (or FD count is stable) is acceptable. The BLOCKING-tier
  "must add a regression test" bar does not apply to a WORTH-FIXING
  leak.
- Fix: `src.on('error', () => res.destroy())` plus
  `res.on('close', () => src.destroy())`, or use `stream.pipeline(src, res,
  cb)` which tears down the whole chain on any side's failure.

## Trap for the grader

The happy path is correct, so a diff-scoped review may pass it. The
failure lives on the *error/abort path*, which is precisely where resource
leaks hide. The reviewer must check the response-lifecycle wiring — but
keep it WORTH-FIXING (leak, not data corruption) unless the process can
demonstrably die.
