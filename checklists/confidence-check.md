# Checklist — Confidence Check

The step that makes the review a conversation instead of a report: not "is
there a problem here" but "are you actually sure about the part that
matters?" Not every change needs the full pass — aim it at the risky part.

- What is the single riskiest assumption in this change, and how was it
  verified — a test, a trace, a code path you actually followed?
- What is the input you didn't test? (Usually the empty one, the huge one,
  and the "that can't happen" one.)
- Is the part you're least sure about also the part you spent the least time
  on?
- If the change is wrong, what breaks first — and does the failure surface
  loudly or get buried?
- Would you sign your name to "yes, I'm confident" about the risky part — or
  is that actually the hope talking?

Close every review with ONE such question aimed at the concrete risky part of
this change — never a generic "are you sure this is production-ready?"
