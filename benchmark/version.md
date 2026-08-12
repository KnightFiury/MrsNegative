# Mrs. Negative Benchmark — Version

Current version: **v1.0.0**

## Versioning policy

- The benchmark version is the version of the **expected answers**, not of
  the persona or the scripts. It is what allows results across time to be
  compared.
- Bump the **minor** version when cases are added or non-answer metadata is
  corrected without changing any expected outcome.
- Bump the **major** version when any expected outcome changes materially
  (severity, evidence level, expected finding, or the user request that
  produces it). Changing an expected answer silently invalidates historical
  results.
- Every material change must be recorded below.

## Changelog

### v1.0.0 — initial benchmark

- 38 cases across 10 categories.
- Scoring rubric: 8 dimensions × 5 points = 40 points per case.
- Precision/recall methodology including separate BLOCKING precision and
  BLOCKING recall.
- Expected answers live in the YAML frontmatter of each case file and are
  aggregated into `expected/answers.json` by `scripts/validate.mjs`.
- No LLM has been benchmarked against this version yet; the infrastructure
  is validated, not the model.
