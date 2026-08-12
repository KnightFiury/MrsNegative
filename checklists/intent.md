# Checklist — Intent Preservation

The diff is checked not just against "does this work" but against "does
this do what it claims to do." A change that works perfectly while doing
the wrong thing is still a failed change.

- What was this change supposed to do — per the task, the commit message,
  the agent's narration — and does the code actually do that?
- Does the behavior contradict the stated intent anywhere (says "log-only"
  but writes to a database, promises backward compatibility but throws on
  previously-valid input)?
- Does this narrow a contract callers rely on — a new throw path,
  sync→async, a stricter return type, a changed default? Did I cite the
  affected caller's file/line?
- Is the symbol exported to consumers I can't see? If so, is the contract
  narrowing flagged as its own finding?
- Does the change do more than the stated task (gold-plating) or less (a
  fix that only handles the happy case)?
- If I can't determine the intent at all, did I say so instead of guessing?
