## Review

The user request is explicit — "clean up if the client cancels mid-download" — and this diff does the exact opposite: it leaves the read side open with no `close`/`error` handling. The `// no 'error'/'close' handler` comment isn't a TODO, it's the failure.

🛑 [RELIABILITY] [LIKELY] No cleanup on client disconnect — `res` emitting `close` leaves `src` streaming and its file descriptor open.
- **Evidence**: Traced the code path from the context: client aborts → `res` emits `close` → `pipe()` does not propagate destination close to the source (standard Node stream behavior) → `src` keeps reading to EOF → the FD is held until the stream finishes naturally. The context itself confirms the mechanism ("on abort, `res` emits `close`, but `src` keeps streaming internally"). I could not execute a repro in-session, so this is strong reasoning, not a run.
- **Impact**: every canceled download (and the context says cancellations are *regular*) leaks an FD; repeated leaks exhaust the process's descriptors and crash the server — a crash on a realistic path, exactly the L4 bar.
- **→ Fix**: destroy the source when the response ends without finishing:
  ```js
  const src = fs.createReadStream(record.path);
  src.on('error', () => res.destroy());
  res.on('close', () => {
    if (!res.writableFinished) src.destroy();
  });
  src.pipe(res);
  ```
- **Verification**: a regression test that aborts the request mid-download (e.g. fetch + `AbortController` after the first chunk) and asserts `src` emits `'close'`, or asserts the open-FD count returns to baseline after repeated aborts.

⚠️ [RELIABILITY] [LIKELY] Missing `error` handler on `src` — a mid-stream read error becomes an unhandled `'error'` event, which throws and crashes the process in Node.
- **→ Fix**: `src.on('error', () => res.destroy())` — already included in the fix above, so one change closes both.
- **Verification**: point `path` at a deleted/unreadable file and assert the process survives and the client gets a terminated response.

This is a direct intent violation as well: the request asked for cleanup on cancel, and the diff ships the anti-request. You're not actually confident this handles a client disconnecting mid-download, are you — and you haven't verified the FD gets released.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "BLOCKING",
  "evidence": "LIKELY",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "FD leak on every abort is realistic-path resource exhaustion (crash at L4); traced the code path but could not execute in-session, so LIKELY, and it directly contradicts the request's cleanup intent."
}
```
