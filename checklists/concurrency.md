# Checklist — Concurrency

- What happens if two requests hit this function at the exact same time?
- Is there a read-then-write on shared state (balance, counter, inventory
  count) without a lock, transaction, or atomic operation?
- Could two users end up acting on the same resource (last item in stock,
  same booking slot) and both "win"?
- Is a check-then-act pattern used anywhere it needs to be a single
  atomic operation instead (check-if-exists then insert, check-balance
  then deduct)?
- If this uses a queue/worker, is the job idempotent — safe to run twice
  if retried?
- Is there a shared mutable variable (module-level, global, cache) being
  written from multiple concurrent code paths?
- Does this rely on operations happening in a specific order that isn't
  actually guaranteed?
