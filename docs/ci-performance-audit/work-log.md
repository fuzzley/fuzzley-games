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
| 2    | 4   | Chrome's launch limit raised                                          | done    |
| 3    | 9   | No HTML coverage report on CI                                         | done    |
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

### 2026-11-14: Chrome's launch, and coverage's HTML on CI (#4, #9)

`build(dev, solitaire): give Chrome a minute to start, and write coverage's HTML report only off CI`
(steps 2 and 3, one commit, both in `@fz/dev`'s presets):

- In eb560e1f's red run, both Chromes failed 16 s into the layout step:
  the first two on a fresh runner, started side by side, Asteroid Breaker's
  and Brick Breaker's, while Snake's, Sudoku's and Brick Fuzz Pop's,
  started after them, all held. That is a cold start, not a hang, so
  `LAUNCH_TIMEOUT_MS` goes from 15 s to 60 s. The review's answers below
  add what a longer limit needs beside it: a Chrome that exits, or can't be
  run, fails at once rather than after the minute.
- `coverage()` takes the environment (`process.env` unless given) and
  reports as text alone where `CI` is `true`, as typescript-eslint reads it;
  its spec hands it both. The Solitaire Collection's config wrote text, JSON
  and HTML by hand, and nothing reads the JSON (no script in the repository
  names `coverage-final.json`), so it takes `coverage()` now too. Under
  `CI=true` its `test:coverage` passes and writes no `coverage/` folder.

The review, and the answers:

1. No spec held that `coverage()` reads `process.env` unless handed one,
   which is what every workspace relies on: with a default of `{}`, every
   spec would pass while CI went on writing HTML. Fixed: a spec stubs
   `CI` and reads `nodeTests()`'s reporters, and another holds `CI=false`
   to the HTML, pinning the rule to `"true"`.
2. A Chrome that dies at start would now cost 60 s and say it "did not
   start". Fixed: the launch loop throws as soon as Chrome has exited,
   saying so with its code. Its spec hands `withChrome()` Node as the
   Chrome, which refuses Chrome's first option and exits at once, on every
   platform. The exit check alone had taken `@fz/dev` under its 95% branch
   floor; with the spec, `chrome.ts` rises from 70% to 84% of statements,
   and the floors the figures have outgrown rise with them: statements and
   lines 93 to 96, functions 95 to 97 (now 97.5, 95.5, 98.4 and 97.7).
3. The new prose ("as text and, but where…, as HTML") read wrong. Fixed in
   both places, and `AGENTS.md` says the Solitaire Collection's config
   takes `coverage()` too.
4. The first reporter spec's name now says "off CI".

The second review, of the answers, and its answers:

1. A Chrome path that names nothing still crashed the script: `spawn()`
   emits its ENOENT as an `'error'` no one heard, before the loop's check,
   so the profile stayed behind and the layout check's server stayed open.
   Fixed: `launchChrome()` awaits the child's `'spawn'`, which rejects on
   the error, with a spec that names no such file.
2. The exit check ran before the read, so a Chrome that wrote its port
   file and then exited during the read was returned as started, and
   `withChrome()`'s wait for its exit, registered after the exit, would
   hang the step. Fixed: the check runs after the read.
3. No spec held the signal half of the check. Fixed: on every platform but
   Windows, a spec runs a shell script that kills itself as the Chrome.
4. The library's `AGENTS.md` and this log's first bullet lagged. Fixed.
