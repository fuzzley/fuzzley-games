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

| Step | #   | Change                                                              | Status  |
| ---- | --- | ------------------------------------------------------------------- | ------- |
| 1    | 3   | Margins for the specs nearest Vitest's 5 s                          | done    |
| 2    | 4   | Chrome's launch limit raised                                        | done    |
| 3    | 9   | No HTML coverage report on CI                                       | done    |
| 4    | 2   | The test phase starts the slowest suites first                      | done    |
| 5    | 8   | `tsc --incremental` for the spec, Node and scripts passes           | done    |
| 6    | 5   | Prettier's experimental CLI with its cache                          | done    |
| 7    | 6   | Yarn and its packages cached on CI                                  | done    |
| 8    | 1   | `verify` split into parallel jobs, the layout check after the build | done    |
| 9    | 7   | Lint alone for a push that changes only Markdown and `docs/`        | done    |
| 10   | 10  | Dependabot's pull requests deduped and grouped                      | done    |
| 11   | —   | The audit run again, and its report                                 | done    |
| 12   | —   | Merged into `main` and pushed                                       | pending |

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

### 2026-11-14: tsc's build info, and Prettier's cache (#8, #5)

`build: keep tsc's build info between type-checks, and check formatting with Prettier's experimental CLI and its cache`
(steps 5 and 6, one commit, both the root's and the workspaces' scripts):

- Every `tsc` pass in a `typecheck` script, the spec, Node, scripts and
  libraries' passes and the root's, runs with `--incremental` and
  `--tsBuildInfoFile tsconfig.<name>.tsbuildinfo`, beside its config. The
  file is named on the command line because the specs' and the app's
  configs share the presets, which can't name a file for each, and kept out
  of `dist/out-tsc/`, where the Angular configs' `outDir` would put it,
  since Vite's build empties `dist/`. `ngc` stays as it is.
- Measured on 4 cores: `yarn typecheck` 69 s cold, 50 s warm; Snake's spec
  pass alone on one core 5.4 s plain, 3.1 s warm. A type error added to a
  spec file after a warm run fails the warm pass, and passes again once
  removed: `tsc` keys each file on its contents, so build info from
  another commit is safe to restore on CI (step 7).
- `yarn prettier` and `yarn prettier:check` run `--experimental-cli` with
  `--cache-location frontend/node_modules/.cache/prettier/cache.json`; its
  default is a folder under the system's temp. The two CLIs check the same
  2,179 files (each listed every file it would change at
  `--print-width 20`, and the lists were the same). Its cache misses for a
  file whose contents changed with its time kept, and for changed options,
  so it too is safe to restore on CI, where each run checks out at the
  same path: the cache keys its options on the ignore and config files'
  absolute folders, so a job run at another path, as in a `container:`,
  would miss every file. Measured on 4 cores: 25.4 s cold, 1.2 s warm,
  against 31 s for the classic CLI.
- "Beside ESLint", as #5 asks, would save at most the cold 25 s; with the
  cache restored on CI it takes about a second, so it stays at the end of
  `yarn lint` rather than in a job of its own.
- Not done: ignoring the build info in `.dockerignore`. A checkout has
  none, so only a local image build would carry it, and an image change
  asks for the image built and served (the `merge-to-main` skill).

The review, and the answers:

1. `frontend/AGENTS.md` said the experimental CLI checks "the same files
   as the classic one, side by side". Side by side means in parallel
   elsewhere in that file, and it checks one file at a time; and the
   two pick the same files today only because the experimental CLI's
   extra reading, every folder's `.gitignore` and `.prettierignore`
   rather than the root's alone, finds nothing more to leave out. Fixed:
   it says what the CLI reads. Its `--parallel`, which the review
   suggested trying, was measured on 4 cores cold: 24.7 s, against 25.0 s
   without, so it isn't used.
2. Prettier's cache keys its version hash on the ignore and config files
   by their absolute folders, so a checkout at another path misses every
   file. GitHub's runners check out at the same path every run, so it
   hits there, but a job moved into a `container:` (`/__w/…`) would
   restore a cache that never hits. Noted below for step 8. `tsc`'s build
   info holds paths relative to its config, so it is restored anywhere.
3. The report says Prettier checks 2,514 files, this entry 2,179. The
   report counted the tracked files of a type Prettier formats, before
   `.prettierignore` leaves out the build output, the vendored and copied
   skills and the uplift's assets; 2,179 is what it checks. Noted here,
   and the new report says which it counts.

### 2026-11-14: Verify in jobs side by side, its caches, and the docs-only run (#1, #6, #7, #4)

`ci: run Verify's checks in jobs side by side, restore Yarn's, Prettier's and tsc's caches, and only lint a push of Markdown and docs/`

- `verify.yml`'s one job is now `changes`, `lint`, `typecheck`, three
  `test` jobs, `build` and `docker`, side by side, and `promote` once they
  pass. Every job but `changes`, `docker` and `promote` sets up with the
  composite action `.github/actions/setup-frontend`.
- #6: the action restores Corepack's Yarn, keyed on the Corepack and the
  Yarn pinned, so a run downloads it from repo.yarnpkg.com only when either
  moves (the ENETUNREACH flake of Nov 14), and Yarn's own cache, keyed on
  the lockfile, so an install downloads nothing until the lockfile
  changes.
  Both through `actions/cache`: `setup-node`'s `cache: yarn` looks up the
  cache folder before Corepack is enabled, so it asks the runner's Yarn 1.
  `lint` restores Prettier's cache and `typecheck` `tsc`'s build info, each
  keyed on the lockfile and the commit, restoring the newest under the same
  lockfile, since each keys its files on their contents (the entry above).
  The jobs run on GitHub's runners, not in a `container:`, so Prettier's
  cache is restored at the path it was written at.
- The three `test` jobs, timed on 4 cores with `CI=true`: Asteroid Breaker
  then Brick Breaker 117 s, Brick Fuzz Pop then the Solitaire Collection
  111 s, and the other ten, four at a time, 85 s. The pairs first tried,
  Solitaire with Brick Breaker and the two others, took 102 s and 128 s.
  Each pair run two at once, each on two cores (`--jobs 2`), took 110 s and
  108 s, within the noise, so each suite runs alone with all four.
- The other jobs on 4 cores: `lint` 112 s cold and 88 s with Prettier's
  cache, `typecheck` 69 s cold and 50 s with `tsc`'s build info, and
  `build` 28 s then the layout check 64 s. `lint`'s `foreach` runs two
  workspaces at a time there (half the cores); four at a time took 72 s
  against 83 s, but `lint` already ends before the tests, so it stays.
- #4's second half: the layout check runs in `build`, after the build it
  checks, rather than in a job of its own, which would have to set up again
  and download the build as an artifact, for a job of 28 s and 64 s on 4
  cores.
- #7: `changes` runs `.github/scripts/changes-code.sh`, which compares the
  commit with `live` on a push (the last commit of `main` that passed, as
  only `promote` moves it) and with the base on a pull request, and says
  `code=false` only where everything changed is Markdown or under `docs/`.
  A manual run, a base that isn't behind the commit, or nothing changed,
  checks everything. `lint` runs either way, with `skills:check` over the
  Markdown. Checked: no import, glob or read of a `.md` file in
  `frontend/`, the only Markdown under an assets folder is in `docs/`, and
  the `Dockerfile` copies only `frontend/`. Tested in a scratch repository:
  a push of `docs/` and Markdown alone (false), code moved into `docs/`
  (true), a `.ts` renamed `.md` (true), code (true), a manual run (true), a
  pull request of docs from its base (false), no `live` (true) and nothing
  changed (true).
- `promote` needs every job, and runs where `!cancelled()`, `changes` and
  `lint` passed, and either `code` is false, with the rest skipped, or all
  of them passed. A skipped job's dependants are skipped unless their `if`
  says otherwise, which `!cancelled()` does.
- The `github-actions-ci-cd` skill describes the jobs, the caches, the
  docs-only run and the new condition, with a principle on caches: each
  keyed on content, so a stale entry is a miss, never a pass, and ESLint's
  `--cache`, which isn't, kept off CI. `frontend/AGENTS.md` says how CI runs
  the tests and the layout check.

The review, and the answers:

1. `git diff --name-only` names a moved file by its new path alone, so
   code moved into `docs/`, or a `.ts` renamed `.md`, read as docs, and
   `promote` would have moved `live` on lint alone. Fixed: `--no-renames`
   lists both paths, which also spares fetching blobs to find renames in
   the partial clone; both cases are among the tests above.
2. Yarn 4 keeps a global cache it never prunes, so restoring the last
   lockfile's cache under `restore-keys` and saving it under the new key
   would have saved every package any lockfile ever named. Fixed: no
   `restore-keys`, so a new lockfile downloads its packages afresh, once
   per job, about 10 s.
3. `frontend/*/*/tsconfig.*.tsbuildinfo` also matched the games' and the
   site's links in `frontend/node_modules/`, archiving their build info
   twice and walking every package. Fixed: `lib/*` and `games/*` by name.
4. The action read the caller's `COREPACK_VERSION` without saying so, and
   a workflow without it would install the latest Corepack. Fixed: a
   `corepack-version` input every job passes, and the install step stops
   for an empty one, as GitHub doesn't hold a caller to a required input.
5. Wording: a pull request's base is `main`'s tip, not the last commit that
   passed, which the script, the workflow and the skill now say, with the
   push to `main` compared with `live` again; the skill says `promote`
   doesn't set up the frontend either, and rules ESLint's `--cache` out by
   what its rules read, whatever its strategy, as Prettier's and `tsc`'s
   caches key on all they read; and the script says so where there is no
   `live`. Fixed. A comment over the `test` matrix says `--except` must
   leave out exactly the four the pairs run.
6. Six jobs race to save a new Corepack or Yarn cache, and all but one log
   that another job is saving it. Left: it is a line of noise in a log,
   and splitting restore from save would take a second action or an input
   for one job to save.

### 2026-11-14: Dependabot's pull requests deduped and grouped (#10)

`ci: check Dependabot's npm pull requests on their lockfile deduped, and group every other package's update in one`

- `setup-frontend` runs `yarn dedupe --mode=update-lockfile` before the
  install on a pull request Dependabot opened from its npm branch
  (`dependabot/npm_and_yarn/`), with immutable installs off for that step
  alone. Each job but `docker` then checks the update as it would land, so
  lint's `yarn dedupe --check` passes and the tests say whether the update
  works; `docker` builds the image from the lockfile as Dependabot wrote
  it, which an install still accepts. Nothing is pushed back, so it needs
  no token beyond the read-only one Dependabot's runs get; the report's
  App token was for pushing the deduped lockfile.
- Where the dedupe changed the lockfile, `lint` warns that merging the pull
  request would fail lint on `main`, whose push run checks the lockfile as
  committed, and that the update lands by hand.
- Tested on Dependabot's own lockfiles of Nov 14, each in a scratch
  worktree with `CI=true`: #24's (lint and test, 6 updates) and #27's
  (Angular, 13) failed `yarn dedupe --check` with 7 and 3 packages to
  merge, and passed once deduped; #26's (Sass) needed none.
- `dependabot.yml` gains a third npm group, `everything-else` (`*`), after
  Angular's and the lint and test tools', which take theirs first, so a
  week's npm version updates come as three pull requests rather than one a
  package, as Sass's and Vite's came on their own on Nov 14. Security
  updates still come one at a time, and are deduped too.
- The `github-actions-ci-cd` skill says so, and that an update still lands
  by hand, deduped, in one commit on `main`.

The review, and the answers:

1. Plain `yarn dedupe` installs and links too, so every job installed
   twice, and it wasn't the command tested. Fixed:
   `--mode=update-lockfile`, as tested, which only rewrites the lockfile;
   the install that follows links once.
2. The pull request now passes while its own lockfile isn't deduped, so a
   merge would turn `main` red, with only a notice in each job to say so.
   Fixed: `lint` alone warns, titled "Land by hand", that merging it would
   fail lint on `main`.
3. "Each job checks the update as it would land" wasn't true of `docker`,
   which builds from Dependabot's lockfile. Fixed in the skill and here;
   the `Dockerfile` stays as it is, and the commit that lands the update is
   built deduped before anything goes live.
4. The branch name alone would dedupe any pull request from a branch named
   so, a fork's among them. Fixed: the step also asks that
   `dependabot[bot]` opened it. A manual run on a Dependabot branch isn't
   deduped and fails lint, as it would on `main`.
5. With immutable installs off, the dedupe would also resolve a lockfile
   that didn't match `package.json`, which principle 1 says CI must fail
   on. `--immutable` can't be combined with `--mode=update-lockfile`, and
   checking first would take an install that links, so the skill names the
   exception in principle 1 and in what `setup-frontend` does; the commit
   that lands the update is checked with `--immutable` on `main`.

### 2026-11-14: The audit run again (step 11)

`docs(ci-performance-audit): time the split Verify workflow and the local pipeline again, with the next recommendations`

- `ci-speedup` was pushed to `origin`, and the Verify workflow dispatched
  on it one run at a time, which `promote` passes over. The first,
  43654599384 at 83b23e28, failed in six jobs' "Set up the frontend", with
  `changes` and `docker` passing: the Corepack guard's message,
  `${COREPACK_VERSION:?…Dockerfile's…}`, opened a quote in bash. Its review
  fix hadn't been run. Fixed by amending that commit, now a02e63af, and the
  branch pushed again with a lease. The audit's `scripts/check-runs.cjs`
  then ran `bash -n` once over every `run:` block of the workflow and the
  action, and found nothing else; nothing runs it on each change yet, which
  the report recommends.
- Runs 43655116933 (a02e63af, every cache empty), 43655417436 and
  43655725239 (4d37058f, caches restored): the checks ended at 199 s,
  170 s and 153 s, against 784 s. Their jobs, steps and logs are in the
  audit's `data/after/` and `logs/after/`.
- The test pairs weren't changed again: Asteroid Breaker's suite took 95,
  61 and 70 s in the three runs, so no pairing is better than the noise.
- Locally, with the caches emptied, `verify:full` and `check:layout` took
  203 s natively (232 s before) and 577 s on 4 cores with `CI=true` (686 s).
- [report-after.md](report-after.md) is the new report, with the next five
  recommendations; [report.md](report.md) links to it, and now says
  Asteroid Breaker's strays test had a timeout of its own too.
- Not yet measured: a push to `main` and its `promote`, and a push of docs
  alone, which follow the merge (step 12).

The review, and the answers:

1. The report said actionlint would have caught the bug, untried, and the
   bug was in a composite action, which actionlint doesn't lint; it said
   the first run failed in every job, where `changes` and `docker` passed;
   and "every `run:` block is now checked" read as a check on each change.
   Fixed: the first recommendation is `bash -n` over every `run:` block in
   `yarn lint`, as the audit's script did once, and the report and this
   entry say six jobs failed, and that the check ran once.
2. "Pass only because of their own timeouts" was false of the two
   autopilot tests, at 4,733 and 4,775 ms, under 5,000. Fixed: they came
   within 0.3 s of it, and their 20 s timeouts are their margin.
3. `@fz/phaser` and Sudoku didn't set the length of the other ten's job,
   which Minesweeper ends, from 343 to 425 s of suites over four lanes; and
   "seven test jobs" didn't match one per heavy suite and the rest. Fixed:
   the job is described from its table, and #2 gives the heavy suites a job
   each and the other ten two, six jobs, estimated from those sums.
4. The layout recommendation's "about 90 s" left out that jobs downloading
   one build wait for `build`, and used the devbox's 54 s for CI. Fixed:
   each layout job builds its own game, the estimate takes CI's runners to
   be from a quarter faster to two-thirds slower than the devbox, and the
   download design is named and why it doesn't pay.
5. The noise claims didn't hold: run 2 was faster in three jobs, the
   spread was larger than "15 to 25%", and the CI-against-devbox range was
   a quarter faster to two-thirds slower. Fixed, and `typecheck`'s
   cache now says it made no difference on CI beyond the noise.
6. "Each suite runs with four workers" was false of `eslint.spec`,
   `bank.spec` and Snake's spec, which run among the other ten. Fixed:
   what changed for each is named.
7. The layout check didn't gain a runner free of tests, and still starts two
   Chromes side by side. Fixed: only the 60 s and failing at once are
   credited.
8. The set-up figures compared the whole of before's with only the
   action's after, and the install ranges were off. Fixed: each job's
   set-up up to its first check, 20 to 24 s, then 16 to 22 s, and the
   install 7.5 to 11 s without Yarn's cache and 3.7 to 6 s with it, read
   from the steps' own durations.
9. "The next within 20 s" failed in run 1, and the longest test job's range
   began at the shortest. Fixed: 0 to 40 s, and 138 to 187 s.
10. Figures with nothing behind them: the warm native Prettier and
    `typecheck` and the lint `foreach` four at a time were measured, but
    their logs were in `/tmp`. Fixed: copied into the audit's
    `logs/local/after-native-24-warm/`, with the `yarn verify:full` and
    `yarn check:layout` run for the merge, and `logs/local/lint-jobs-4core/`,
    each with a `meta.txt` saying how it was measured, and the appendix names
    them; the lint script gets Yarn's default of half the cores, which the
    recommendation now says.
11. Clarity: the jobs table's caption, the suites' abbreviations, the 2,514
    files against 2,179, 780 against 784, which `guide.spec`, that `lint`
    becomes the longest job after #2 and #3, and what the local table's
    lint row holds. Fixed, each.

The second review, of the answers, and its answers:

1. The Prettier count didn't add up, and 2,179, the files that change at a
   print width of 20 (the entry for steps 5 and 6), is a lower bound, not
   what Prettier checks. Fixed: Prettier's own `getFileInfo()` over every
   tracked file, with the root's `.gitignore` and `.prettierignore`, counts
   2,432 checked, which the report gives, and why it differs from 2,514 and
   2,179. The steps 5 and 6 entry's "check the same 2,179 files" stands as
   a comparison of those lists, not a count of what each CI checks.
2. "`--jobs` can't follow an environment variable" was false: Yarn's shell
   expands `${LINT_JOBS:+--jobs $LINT_JOBS}`, tried with `yarn exec`, to
   nothing unset and to `--jobs 4` set. Fixed: #4 recommends it.
3. `lint` would be among the longest jobs after #2 and #3, not the longest,
   as the layout and test jobs also wait 12 to 15 s for `changes`. Fixed,
   and the estimate is 1.7 to 2.3 minutes.
4. "Made cheaper" contradicted the step 1 entry: their cost is spread, not
   cut. Fixed: no one test carries it; and `viewport_scaler.spec`, which
   72ecbcf4 fixed too, is named beside Snake's.
5. The estimates said they scale by one CI range, while #3 used the layout
   check's own. Fixed: each scales by its phase's own range; and the next
   job ended 10 to 36 s after the longest, not 0 to 40.
6. Minor, each fixed: `@fz/phaser`'s 75 to 91 s is the floor of a job of
   the other ten; `build` still builds every game; Brick Breaker's build
   took 7.0 s on 4 cores; #1 catches a `run:` block bash can't parse; the
   cause given for `typecheck`'s CI times was untested, and is gone; the
   two hand-written `phases.tsv` have a `meta.txt` each; and the unclear
   sentence above is rewritten.
