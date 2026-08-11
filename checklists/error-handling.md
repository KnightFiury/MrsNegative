# Checklist — Error Handling

- If this throws or returns an error, does the caller actually find out — or
  is it caught, logged, and replaced with `null` somewhere in between?
- Is any error silently swallowed (`catch {}`, empty exception block, ignored
  return value) in a way that hides a real failure?
- If the operation has several steps and one fails partway, is the state
  consistent — or half-applied (rows written, balance moved, order never
  created)?
- Are external/IO failures distinguishable from logic errors, so retry and
  recovery code can tell them apart instead of lumping everything into one
  catch?
- If a failure is transient and retried, does the retry risk a duplicate
  side effect (double-charge, double-send, double-insert)?
- When an error propagates, does it carry enough context (which resource,
  which step) to debug without a stack walkthrough?
- Does the error surface at the right layer — or does a generic handler turn
  a specific failure into a generic "something went wrong" that kills the
  signal?
