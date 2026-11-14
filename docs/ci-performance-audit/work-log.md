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
| 4    | 2   | The test phase starts the slowest suites first                        | done    |
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

### 2026-11-14: the slowest suites first (#2)

`build(dev): run the workspaces' tests the most spec files first, as foreach starts them by name, and choose them by name for CI's test jobs`
(step 4):

- Yarn's `foreach` sorts the workspaces it runs by name, whatever its
  options (`workspace-tools`' `foreach`, in Yarn 4.18.1's bundle), and
  Yarn's shell runs a job behind `&` but has no `wait` and drops its exit
  code, so no root script alone can start the Solitaire Collection first.
  `yarn test` and `yarn test:coverage` now run `tools/run-tests.mjs`, on
  `@fz/dev/workspaces`.
- The order is by spec files, the most first: Solitaire 172, Brick Fuzz Pop
  147, Asteroid Breaker 95, Brick Breaker 77, `@fz/phaser` 60, then under
  30 each, which is the order of their times on CI's one worker but for
  Brick Fuzz Pop and Asteroid Breaker, both heavy. It needs no times kept
  between runs, so a fresh clone and CI order alike.
- Each runs `yarn run <script> --maxWorkers=<n>` through the shell, `n`
  the cores over the lanes as a number: Windows finds Yarn's `yarn.cmd`
  only through its shell, which reads a `%` as the start of a variable.
- The other half of #2, a heavy suite given every worker when it runs
  alone, is left out here: started first, the four longest end within 20 s
  of each other on the devbox, and the shorter ones fill the lanes behind
  them. On CI, each heavy suite gets a runner's four workers in its own
  test job (step 8).
- Tried first, and dropped: the four heavy suites one after another, each
  with every worker, then the rest in four lanes. Alone on 24 workers they
  took 41 to 56 s each, 185 s in all, where all fourteen took 91 s with
  `foreach`: Vitest doesn't use that many workers well.
- Measured on the devbox's 24 cores, `yarn test:coverage` took 87 s,
  against 91 s with `foreach`: the four heavy suites start together and are
  done by 64 s. The 4-core stand-in is measured with the rest in step 11.

The review, and the answers:

1. The runner started no workspace after one failed, "as Yarn's `foreach`
   does", but only a sequential `foreach` does: `--parallel` queues every
   workspace at once and stops only for an exit of 130, so the old
   `yarn test` ran all fourteen and reported every failure. Stopping would
   have hidden failures behind one flaky timeout. Fixed: every workspace
   runs, each failure is named, and the run exits 1.
2. The script's own logic (its command line, the workers, the printing and
   the code) had no spec. Fixed: it is `runTestsScript()` in
   `@fz/dev/workspaces`, taking a `Printer`, the cores and the command
   runner, as `runLayoutScript()` takes its own, with specs over a fake
   runner; `tools/run-tests.mjs` is one call.
3. `Math.floor(cores / jobs)` gave one worker fewer than Vitest's `25%` on
   6, 10, 14, 18 and 22 cores, as Vitest rounds a share. Fixed: rounded.
4. The usage named `node tools/run-tests.mjs`, which needs a `yarn` on the
   path that only a Yarn script is sure of. Fixed: it names `yarn test`
   first, which Yarn hands the options.
5. `yarn test --reporter=dot` reached every Vitest before and was refused
   now, and a script no workspace has ran nothing and passed. Fixed: what
   follows `--` reaches each Vitest, and a script, or a name, no workspace
   has stops the run with 2.
6. `script in scripts` took `toString` for a script. Fixed:
   `Object.hasOwn()`, with a spec.
7. The specs couldn't tell a folder's name from its path in the filter that
   leaves out `node_modules/`, and a helper's doc named a clock it didn't
   have. Fixed: a nested `node_modules/` in the spec, the parameter named
   `name`, and the helper's doc rewritten.
8. `workspaces.ts` sat outside the lint fence that keeps the scripts'
   helpers from loading Vite. Fixed, and `dirname()` for `join(…, "..")`.

Added with the answers, since step 8's test jobs need it: `--only` and
`--except`, which choose workspaces by name, so a CI job runs two heavy
suites one after another with every core (`--only a,b --jobs 1`) and
another the rest (`--except …`), where a workspace added later lands. On
the devbox, `yarn test` took 67 s.

The second review, of the answers, and its answers:

1. What follows `--` was joined with spaces into a shell's command line,
   so the shell split it again: `-t "deals a card"` would have reached
   Vitest as three words, and a `|` or a `*` would have been the shell's.
   `foreach` handed each as one word. Fixed: `shellQuoted()` quotes each
   for the platform's shell, single quotes outside Windows and double on
   it, and the run stops with 2 for an argument Windows' shell can't be
   handed, with a `%` or a `"`. A spec runs quoted arguments through the
   real shell and reads them back unchanged.
2. Specs passed with the summary's sort removed, the table's failure mark
   gone or the floor of one worker dropped. Fixed: a spec runs two lanes
   where the first workspace runs longest and fails, so outputs come in
   the order they end and the table in the order they started, marked;
   another hands one core to three jobs; `-j`, a list with spaces and a
   stray comma, and `--only` given twice each have one.
3. The cores were shared by `--jobs` even where fewer ran, so
   `--only solitaire` ran on a quarter of them. Fixed: they are shared by
   the workspaces that run at once.
4. A stray comma made an empty name, and `--only` given twice kept the
   last. Fixed: empty names are dropped, and both options take several.
5. `--jobs` was read by hand where `report.ts`'s `readSeeds()` reads a
   count, and `chosenOf()` returned its problem as a string. Fixed:
   `readCount()` in `@fz/dev/script` reads both, `readSeeds()` through it,
   and `chosenOf()` returns a `Stop`.
6. A command that couldn't start rejected the whole run, and the other
   workspaces' output was lost. Fixed: it counts as a failure, printed
   under its workspace's header.
7. Two `failed` of different types in one function, and the clock missing
   from `TestsScriptIo`'s doc. Fixed.
