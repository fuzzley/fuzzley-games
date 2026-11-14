# Work log: acting on the CI performance audit

The log of the work that acts on [report.md](report.md), the audit of
Nov 14, 2026 at `main` 3af8a55f: each recommendation built, each commit,
what each review found and how it was answered, what was measured, and what
was left. It is written as the work goes, so a session that picks it up
starts from the last entry.

- **Branch:** `ci-speedup`, from `main` at b870830e. It merges into `main`
  as a fast-forward once every recommendation is built and the audit is run
  again (the `merge-to-main` skill).
- **Commits:** each through the `commit-review-process` skill.
- **Measuring:** the audit's scripts and data are on the devbox in
  `/home/dev/Projects/personal/ci-audit-2026-11-14/`, outside the
  repository. The 4-core stand-in for the runner is
  `CI=true CHROME_PATH=<swiftshader wrapper> taskset -c 0-3 scripts/local-bench.sh <label>`.
  The new pipeline is timed on GitHub by dispatching the Verify workflow on
  the branch (`gh workflow run verify.yml --ref ci-speedup`), which
  `promote` ignores, since it moves `live` only from `main`.

## Plan

The recommendations, as the report numbers them, in the order they are
built:

| Step | #   | Change                                                                | Status  |
| ---- | --- | --------------------------------------------------------------------- | ------- |
| 1    | 3   | Margins for the specs nearest Vitest's 5 s                            | done    |
| 2    | 4   | Chrome's launch limit raised                                          | pending |
| 3    | 9   | No HTML coverage report on CI                                         | pending |
| 4    | 2   | The test phase starts the slowest suites first                        | pending |
| 5    | 8   | `tsc --incremental` for the spec, Node and scripts passes             | pending |
| 6    | 5   | Prettier's experimental CLI with its cache                            | pending |
| 7    | 6   | Yarn and its packages cached on CI                                    | pending |
| 8    | 1   | `verify` split into parallel jobs, the layout check in one of its own | pending |
| 9    | 7   | Lint alone for a push that changes only Markdown and `docs/`          | pending |
| 10   | 10  | Dependabot's pull requests deduped and grouped                        | pending |
| 11   | —   | The audit run again, and its report                                   | pending |
| 12   | —   | Merged into `main` and pushed                                         | pending |

## Log

### 2026-11-14: the near-limit specs (#3)

What CI's logs say, in the green runs since Nov 11 (after 523c959b), of
the specs that run without a timeout of their own:

- Brick Breaker's `autopilot.spec` "aims only at a brick it can see": up to
  3,808 ms, and 5,297 ms in 9c84dc18's red run.
- Sudoku's `bank.spec` "holds only puzzles whose hints all agree with the
  solution": up to 3,795 ms, and 5,492 ms in b6f74baf's red run.
- `@fz/dev`'s `eslint.spec` "keeps a library's testing helpers out of what
  isn't a test": up to 3,453 ms, and 4,639 ms in 9c84dc18's red run, after
  523c959b.

The report's fourth, Asteroid Breaker's "brings most of the strays that
cross home", has had a 20 s timeout of its own since Nov 3; the report
missed it. Brick Fuzz Pop's `cast.spec`, at 3,953 ms on Nov 14, was split
into four batches since.

`test(dev, sudoku, brick-breaker): give the specs nearest Vitest's 5 s on CI a margin, the eslint spec's first lint run before its tests`
(step 1):

- `@fz/dev`'s `eslint.spec.ts`: a `beforeAll` lints a file once, under
  `FIRST_LINT_TIMEOUT_MS` (30 s), so loading TypeScript's libraries and
  typescript-eslint's rules no longer lands in the first test. On one core
  with `CI=true`, the first test took 2,095 ms, and with the warm-up the
  slowest takes 117 ms.
- Brick Breaker's "aims only at a brick it can see" takes
  `BEHIND_STEEL_TIMEOUT_MS` (20 s), as Asteroid Breaker's strays spec takes
  20 s. Its twenty seeds are judged by their sum, so batching them would
  change what the test holds.
- Sudoku's hint test runs a level's hundred puzzles a quarter at a time,
  as Brick Fuzz Pop's `cast.spec` batches its walls, rather than raising
  the limit, which would hide a slower hint. On one core without coverage,
  the expert level's hundred took 963 ms.

The cost is spread, not cut: the bank's spec takes as long as before, and
the warm-up adds one lint of about 0.1 s. What changes is that no single
test comes near the limit, so step 11 should look for fewer red runs, not
a shorter test phase.

The review, and the answers:

1. `HIDDEN_BRICK_TIMEOUT_MS` read as the ghost brick, the trait Brick
   Breaker calls hidden, while the test's brick sits in plain view behind
   steel. Fixed: `BEHIND_STEEL_TIMEOUT_MS`, its doc saying so.
2. The log said the eslint spec's first test reached 4,729 ms "before",
   as if 523c959b had brought it down; it reached 4,639 ms in 9c84dc18's
   red run, after that fix. Fixed above.
3. The plan's table and the entry's subject were left as placeholders.
   Fixed, with the note above on spreading the cost.
