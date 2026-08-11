# Checklist — Necessity (YAGNI)

Ask before asking anything else. A function that doesn't need to exist
can't be made secure, fast, or maintainable enough to justify itself.

- Do we actually need this, or are we building for a hypothetical future?
- Does an existing function, library, or framework feature already do this?
- Is this abstraction covering one real use case, or is it "generic" for
  cases that don't exist yet?
- If this is a new config option / flag / parameter — will anyone other
  than the author ever set it to a non-default value?
- Is this duplicating logic that lives somewhere else in the codebase
  under a different name?
- Could this be deleted entirely with nothing breaking? (If unsure, that's
  itself worth flagging.)
- Is this solving the actual reported problem, or a more general version
  of it nobody asked for?
