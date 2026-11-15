# Local pipeline audit: lint, typecheck, tests, build and layout check

Measured on 2026-11-14 at e6740e04, on the 24-core devbox (23 GB, Node 26.13, Yarn 4.18.1), with warm caches, as a developer reruns `yarn verify` and `yarn check:layout`. The CI audit is in [`../ci-performance-audit/report-after.md`](../ci-performance-audit/report-after.md). Its findings are referred to here, not repeated. Every figure is from one run unless it says otherwise, so read it as ±10%. What was built from it, and what it measured after, is under [As built](#as-built).

## Summary

- **`yarn verify` then `yarn check:layout` takes 171 s and uses 10.6 of the 24 cores on average.** The work is 1,818 CPU-seconds, which 24 cores could finish in 76 s. The steps run one after another, and each one's tail leaves most cores idle. The layout check takes 34 s on 1.2 cores, waiting on game frames.
- **Skipping unchanged workspaces alone does less than expected.** Over the 809 commits on main since the site became a workspace of its own (2026-10-18), 44% touched one workspace and 17% touched none, but a one-game change still pays that game's own chain one step after another: lint, typecheck, tests, build, then layout. For Brick Fuzz Pop that is 87 s. Modelled over the history from each workspace's times alone, a cache that only skips workspaces would take the median commit from 171 s to 102 s, and 18.5% of commits would still pay the full time.
- **Running a game's steps side by side is what pays.** Brick Fuzz Pop's own steps, beside the root's skills, constraints, dedupe and Prettier checks, finished in 34 s side by side, against 87 s one after another without those, and 171 s for today's whole `yarn verify` and `check:layout`.
- **Two changes are cheap and measured:**
  - Opening the layout check's pages side by side cut each game's check by 19–45%. Brick Breaker went from 30 s to 20 s, and Brick Fuzz Pop from 19 s to 10 s. It helps on 4 local cores with CI's software WebGL too.
  - TypeScript 7 for the 40 plain `tsc` passes: they pass, with the three Angular libraries' configs checked as plain TypeScript too, in 10 s against 84 s on TypeScript 6. `ngc`, ESLint and Analog stay on 6, since 7 has no API for them yet. `yarn typecheck` would fall from 17 s to about 8 s (est.).
- **Running everything at once needs a budget.** Starting lint, typecheck, the tests and the build together finished in 121–124 s over two runs, with free memory down to 0.6–0.7 GB, and in the first a test timed out at 5 s. With fewer workspaces at once, the same run passed in 119–120 s, with 3–4 GB free.
- **Not worth it now:**
  - Vitest's pool and isolation settings: its `doctor` found at most 12%.
  - ESLint's `--cache`: it can report stale results with type-aware rules.
  - Oxlint: it can't lint Angular templates.
  - Running `ngc` on TypeScript 7: not supported yet.
  - Analog's `fastCompile` in tests: broken with Vitest's module cache.

## As built

Built on `local-pipeline`, one reviewed commit a step, as [work-log.md](work-log.md) records: #1, #2, #3 with the budget of #4 for the runs it starts, #6's compile cache and its notes, and #7. #4 for the full run, #5 and #8 are left, for the reasons the work log's plan gives.

Locally, warm, on the same devbox at 15c09afe, as `bench.sh` times the steps ([`data/steps-after.tsv`](data/steps-after.tsv)):

| Step                                               | At e6740e04 | At 15c09afe |
| -------------------------------------------------- | ----------: | ----------: |
| skills, constraints, `dedupe --check`, root ESLint |       3.8 s |       2.7 s |
| ESLint and Stylelint, every workspace (`foreach`)  |      31.1 s |      31.2 s |
| Prettier, cached                                   |       1.1 s |       1.2 s |
| `tsc` and `ngc`, every workspace and the root's    |      17.3 s |      11.4 s |
| `yarn test`                                        |      68.9 s |      62.8 s |
| builds: the games', then the site's                |      14.7 s |      13.8 s |
| layout check                                       |      34.2 s |      23.4 s |
| **total**                                          |   **171 s** | **146.5 s** |

- **The total fell by 14%,** and its CPU from 1,818 to 1,676 s. A run at bf297ad9, with step 6's work in the tree, took the same 146.5 s ([`data/steps-after-step-5.tsv`](data/steps-after-step-5.tsv)).
- **The typecheck took 11 s,** against the 8 s estimated.
- **The layout check took 23 s,** against the 15–20 s estimated.
- **`yarn test` took 63 s,** 6 s less, within a single run's ±10%. Step 5 timed whole runs with the compile cache off, empty and full, in 65.7–67.4 s, and couldn't tell them apart. At half a second a Vitest start, and three or four starts a lane, it would save about 2 s (est.).

`yarn verify:changed`, on the same devbox ([`data/verify-changed.tsv`](data/verify-changed.tsv)):

- **One of Brick Fuzz Pop's source files changed: 37.8–41.3 s, over three runs,** against 146.5 s for `yarn verify` and `yarn check:layout`. The game's lint alone takes about 31 s ([`data/verify-changed-one-game-times.txt`](data/verify-changed-one-game-times.txt)).
  - The rest is the other games' builds and the site's. The site's build runs whenever a game is reached, and every game is built first, so it never takes a build another branch left in a `dist/`.
  - They wait on the tests' memory. Twelve workers claimed 12 GB ([`data/verify-changed-one-game-dry-run.txt`](data/verify-changed-one-game-dry-run.txt)). The run prints no budget; when the first run's tasks started fits one of 16.5–17.0 GB, and a dry run after it found 17.3.
  - In the first run, five other games' builds, then the site's, took the last 10 s. In the third, ordered by the times the first two kept, the builds ran beside the tests, and the game's typecheck waited for them instead, ending at 35 s.
  - Yet Brick Fuzz Pop's tests took 4.1 GB on 8 workers ([`data/step-memory.tsv`](data/step-memory.tsv)), and 28.9 s alone on eight against 29.7 s in the first run on twelve. Claiming each suite's own memory per worker would let the builds run beside the tests.
- **Every workspace, as the branch's change to `frontend/package.json` reaches: 111 s,** against 146.5 s.

On CI, the Verify workflow ran fourteen times, all passing ([`data/ci-runs.tsv`](data/ci-runs.tsv), from `ci-steps.sh`):

- **Seven at 15c09afe,** three dispatched one at a time, then four each dispatched with a run of main's code.
- **Seven on main's code:** the CI audit's two runs at 4d37058f, the push of 9bba39fe, and the four paired runs at e6740e04. Those four ran from a branch of their own, `ci-control`, since a dispatch on `main` runs `promote`.
- **The three commits run the same code:** 4d37058f, 9bba39fe and e6740e04 differ only in docs.

Medians, with the range:

| Job or step              |           main |         branch |
| ------------------------ | -------------: | -------------: |
| `typecheck`'s Type-check |    57 s, 45–67 |    32 s, 25–43 |
| `typecheck`              |    79 s, 69–95 |    52 s, 43–63 |
| `build`'s layout check   |   86 s, 66–106 |   80 s, 65–106 |
| `build`                  | 136 s, 109–158 | 126 s, 109–168 |
| `lint`                   |  111 s, 89–129 |  108 s, 81–136 |

- **TypeScript 7 took 25 s off the Type-check step.** The two ranges don't overlap.
- **The layout check's two pages show no change either way.** The four pairs' layout checks took 101, 65, 80 and 106 s on the branch, against 86, 66, 101 and 78 s on main's code.
  - The check prints no page's time, so how close Brick Breaker's Cleared card, its slowest page, comes to its 60 s on a runner is estimated.
  - Step 4 timed the card at 20.1 s as CI runs, on 4 of the devbox's cores in software WebGL, where the whole check took 55.8 s.
  - CI's step took 65–106 s, 1.2–1.9 times that, which puts the card at about 23–38 s (est.).
- **No test job ran slower for the branch's code, by what the pairs and the A/B can tell.** The test jobs ran in 92–152 s on most runners and in 180–191 s on the rest, whichever code they ran.
  - The breakers' job runs code the branch leaves as it was. Only those games' `typecheck` scripts and Brick Breaker's `tools/check-layout.mjs` change, `yarn.lock` only adds TypeScript 7's packages, and `test:coverage` runs in the environment it ran in before. `runTestsScript()` was rewritten in step 6, but prints the same and runs the same commands.
  - Main's code drew the slow runners in the first and third pairs, the branch in the second, third and fourth. On them, main's code took 94.6–94.8 s for Asteroid Breaker, 66.1–67.4 s for Brick Breaker and 90.0–92.2 s for Brick Fuzz Pop, as the branch's took 92–97 s, 65–67 s and 89–91 s ([`data/ci-workspace-tests.tsv`](data/ci-workspace-tests.tsv), from `ci-workspace-tests.sh`).
  - Within a job, every workspace moved together, those the branch doesn't touch too.
- **Run as CI runs them, on 4 local cores with `CI=true`, the two big-game jobs took the same on both** ([`data/ci-tests-ab.tsv`](data/ci-tests-ab.tsv), from `ci-tests-ab.sh`). Each ran twice, swapping the order each round:
  - Asteroid Breaker and Brick Breaker took 116.9–119.1 s on the branch, against 116.9–118.7 s on main.
  - Brick Fuzz Pop and the Solitaire Collection took 112.8–113.6 s, against 113.1–117.5 s.
  - A first set, with the branch second in each round, came out the same ([`data/ci-tests-ab-first.tsv`](data/ci-tests-ab-first.tsv)).
- **So the branch's runs ended 39 s later in median, most of it in test jobs on slow runners.** A run's last check ends at the largest `end_s` of its jobs but `promote`.
  - The branch's seven ended at 169–205 s, a median of 197, against 150–205 s and 158 for main's code.
  - The branch drew a slow runner for seven test jobs of 21, and main's code for four.
  - With those jobs set aside, the branch's runs end at 139–181 s, a median of 164, against 150–170 s and 153: 11 s later, within the runs' spread.
  - In the four pairs, the branch ended first twice: at 169 s against 205, and 198 against 203. Main's code ended first at 153 s against 195, and 158 against 197.
  - Fourteen runs can't rule out a small effect.

**Left:**

- **In `yarn verify:changed`, claim each suite's own memory per worker,** so the builds run beside one game's tests.
- **Print each layout page's time,** so its margin on a runner is measured rather than estimated.
- **#4, one runner for `yarn verify` and `yarn verify:full`,** once `verify:changed` has been used for a while.
- **#5, revisited:** a pass is keyed on its workspace's files, so an edit there reruns every one of its steps anyway. It would skip a rerun with nothing changed, or a branch switched back to, and `verify:changed` already takes one game's to about 40 s. Its risk of a false pass stays, so it stays left.
- **#8, Analog's `fastCompile` for builds.**

## Where the time goes

Warm, one step after another, as `yarn verify` and `yarn check:layout` run them ([`data/steps-warm.tsv`](data/steps-warm.tsv)):

| Step                                                      |      Wall |         CPU | Cores in use |
| --------------------------------------------------------- | --------: | ----------: | -----------: |
| skills, constraints, `dedupe --check`, root ESLint        |     3.8 s |       4.0 s |          1.1 |
| ESLint and Stylelint, every workspace (`foreach`)         |    31.1 s |     305.8 s |          9.8 |
| Prettier, cached                                          |     1.1 s |       3.9 s |          3.4 |
| `tsc` and `ngc`, every workspace and the root's           |    17.3 s |     208.8 s |         12.1 |
| `yarn test` (four workspaces at a time, six workers each) |    68.9 s |   1,156.0 s |         16.8 |
| builds: the games', then the site's                       |    14.7 s |      98.5 s |          6.7 |
| layout check                                              |    34.2 s |      40.5 s |          1.2 |
| **total**                                                 | **171 s** | **1,818 s** |     **10.6** |

Each workspace's time in each step, from the same run, beside the other workspaces ([`data/workspace-times-warm.tsv`](data/workspace-times-warm.tsv), from [`scripts/workspace-times.mjs`](scripts/workspace-times.mjs)). The last column is its own chain with nothing else running, each step given the whole machine ([`data/workspace-times-alone.tsv`](data/workspace-times-alone.tsv), from [`scripts/alone.sh`](scripts/alone.sh)):

| Workspace        | lint | typecheck | tests | build | layout | own chain | own chain, alone |
| ---------------- | ---: | --------: | ----: | ----: | -----: | --------: | ---------------: |
| brick-fuzz-pop   |   28 |        13 |    48 |     8 |     23 |     121 s |             87 s |
| brick-breaker    |   23 |        13 |    40 |     8 |     34 |     118 s |             92 s |
| asteroid-breaker |   24 |        13 |    55 |     8 |     11 |     112 s |             73 s |
| solitaire        |   24 |        12 |    34 |    10 |      — |      80 s |             64 s |
| snake            |   13 |        11 |    11 |     7 |     16 |      58 s |             43 s |
| sudoku           |   10 |         8 |    13 |     6 |      4 |      41 s |             34 s |
| the other eight  | 6–16 |      4–10 |  2–14 |   0–6 |      — |   12–40 s |           8–28 s |

The four big games carry most of the time. The three Breaker games are also the most-changed workspaces, each touched by 46–51% of the commits, and Snake and Solitaire by 39–40%.

## Findings by step

### Tests: 69 s, a third of it start-up

- **Each Angular workspace pays 5–11 s before its first spec runs.** The suites spent 87 of their 266 lane-seconds outside Vitest's own `Duration` ([`data/test-startup.tsv`](data/test-startup.tsv), from [`scripts/test-startup.mjs`](scripts/test-startup.mjs)). In Sudoku alone, one spec file takes 7.3 s, of which Vitest's run is 2.9 s (`fast-compile.sh`'s run without it).
  - A CPU profile of that run, taken by hand, puts 2.8 s of the main thread in TypeScript. Analog's plugin builds and emits a program of the whole app, libraries included, on every Vitest start, even in tests, where it compiles templates just in time: `emitNextAffectedFile` took 1.5 s, reading and parsing sources 0.8 s, and the builder program 0.4 s.
  - Nothing persists between runs, so `yarn vitest run <one spec>` always pays it.
- **The heavy suites are real work.** Asteroid Breaker's 95 files add up to 125 s of file time, its nine simulation files 8–12 s each, by Vitest's own per-file times in a run by hand. On every core, alone, its suite took 29 s, where its lane of six workers took 55 s in the full run. That is twice what the files' sum over 24 workers and its start-up would come to, so something else sets its time, which this audit didn't look into.
- **Vitest's settings are close to their best.** `vitest doctor`, run by hand on `@fz/game-ui` and on Brick Breaker's `pure` project found at most 12%, from fewer workers.
  - `threads` with `isolate: false` failed a `@fz/game-ui` spec, whose `matchMedia` stub leaks between files.
  - The isolation setting has no effect on `vmThreads`.
- **Vitest 5.1 can run only what changed,** as tried by hand:
  - `--changed` reruns the specs a changed file reaches, through the import graph. It works with the games' projects: editing one Brick Fuzz Pop view file reran 23 of 147 spec files, in 18.7 s against 27.6 s.
  - `--sinceLastRun` reruns the specs whose recorded dependencies changed, and the ones that failed. It works in Sudoku: a no-op rerun took 4.3 s, and after touching one rules file 19 of 29 files reran, in 7.9 s.
    - It finds no spec files at all in Brick Fuzz Pop, whose specs are split into projects. That looks like a Vitest bug.
- **Node's compile cache** (`NODE_COMPILE_CACHE`) took 0.5 s off each Vitest start, 7.1 s down to 6.6 s, timed by hand. tsc, ESLint, Vite and Prettier already turn it on themselves; Vitest doesn't.

### Lint: 36 s, set by the four big games' ESLint

- **The rule time is type information.** Brick Fuzz Pop's ESLint takes 21.7 s, and ESLint's rule timings (`TIMING=1`, run by hand) put 12.5 s in rules, nearly all typescript-eslint's type-aware ones. The first rules to ask for types (`no-unsafe-enum-assignment` and `no-floating-promises`) absorb building the type information.
- **Fixed costs are small.** Stylelint takes 1.1 s, and loading ESLint's config 1.1 s, each timed by hand.
- **`--concurrency` halves a big game's ESLint but doubles its memory.** On Brick Fuzz Pop, each worker builds its own program ([`data/eslint-concurrency.tsv`](data/eslint-concurrency.tsv), from [`scripts/eslint-concurrency.sh`](scripts/eslint-concurrency.sh)):

  | `--concurrency` |   Wall |   CPU | Peak memory |
  | --------------- | -----: | ----: | ----------: |
  | off             | 21.7 s |  36 s |      1.8 GB |
  | 2               | 15.0 s |  48 s |      2.7 GB |
  | 4               | 11.6 s |  70 s |      4.0 GB |
  | 8               | 12.0 s | 118 s |      6.4 GB |
  | `auto`          | 11.4 s | 102 s |      5.5 GB |

  It suits one game linted alone. It doesn't suit twelve workspaces linting at once on 23 GB.

- **ESLint's `--cache` would make a rerun take 1.1 s,** but typescript-eslint advises against it. A file's result goes stale when a type it uses changes elsewhere, for example a union gaining a member that a `switch` elsewhere must now handle.

### Typecheck: 17 s, half of it the plain `tsc` passes

- **The passes:**
  - Each Angular workspace runs `ngc` over its app or library, then `tsc` over its specs, its Node configs and its scripts, one after another.
  - The other workspaces run `tsc` alone.
  - That is 51 passes in all: 11 `ngc` and 40 plain `tsc`, the root's among them.
- **Brick Fuzz Pop's four passes, warm:** `ngc` 4.3 s, specs 2.2 s, Node configs 1.4 s and scripts 1.2 s ([`data/ts7-brick-fuzz-pop.tsv`](data/ts7-brick-fuzz-pop.tsv)). `ngc` keeps no build info, so it starts cold every time.
- **TypeScript 7.0.2 checks the plain passes eight times faster, with the same results:**
  - The 40 plain passes, and the three Angular libraries' configs checked as plain TypeScript, all pass in 10.3 s run one after another with no build info, against 84.2 s on TypeScript 6 ([`data/ts7.tsv`](data/ts7.tsv), from [`scripts/ts7-compare.sh`](scripts/ts7-compare.sh)).
  - Brick Fuzz Pop's passes take 0.9 s, 0.3 s and 0.2 s.
  - It sees the same files (1,119, 605 and 497 in Brick Fuzz Pop's three configs).
  - It catches a seeded type error, and a JSDoc type error in an `.mjs` script, each tried by hand.
  - Cold on 7 is faster than warm on 6, so the `--incremental` flags and their `.tsbuildinfo` files could go.
- **What stays on TypeScript 6:** 7.0 ships no compiler API, so `ngc`, typescript-eslint and Analog stay on 6. `@angular/compiler-cli` 22.2 requires TypeScript `>=6.0 <6.1`.
  - TypeScript 7.1, now in beta, brings an API. Angular's new compiler, `ngp`, which hands its output to TypeScript 7, is in beta; Angular says builds should stay on `ngc` until a 22 minor after 7.1 ships ([InfoQ, 2026-11-11](https://infoq.com/news/2026/11/angular-compiler-rust-typescript)).
  - typescript-eslint has work in review for 7.1. Its maintainers don't expect much speed from it.
- **Both versions side by side:** the 11 `ngc` passes on TypeScript 6 and the 40 plain passes on TypeScript 7, twelve at a time, took 8.5 s, all passing. The `ngc` passes alone take 6.3 s.

### Build: 15 s, and Analog has a faster path

- **The games build seven at a time in 10.6 s,** then the site in 4.1 s. Solitaire is the longest, at 10 s.
- **Analog's `fastCompile` halves a game's build.**
  - It compiles file by file and skips template type-checking, which `ngc` already does in `yarn typecheck`.
  - Brick Breaker built in 2.8–2.9 s against 5.9–6.0 s, twice each ([`data/fast-compile.tsv`](data/fast-compile.tsv), from [`scripts/fast-compile.sh`](scripts/fast-compile.sh)).
  - The output had the same 17 files, their hashes aside, and only the main chunk differed, by 2 KB of 424 KB ([`data/fast-compile-assets.tsv`](data/fast-compile-assets.tsv)).
  - That build passed Brick Breaker's layout check at every shape and turn.
  - It is off by default, and new in Analog 2.9.
- **`fastCompile` in tests is broken:**
  - It took Sudoku's one-spec run from 7.3 s to 4.6 s the first time.
  - Once Vitest's module cache holds its output, the next run fails to resolve the components' `.scss?inline` styles.
  - Analog's `experimental.useAngularCompilationAPI` was no faster, at 7.7 s, and failed six of Sudoku's 607 specs.

### Layout check: 34 s on one core

- **`@fz/dev/layout` opens every shape and turn one page at a time,** each waiting for the game to draw: eight pages for a game drawn with Phaser, six shapes and two turns. Brick Breaker's script then checks the Cleared card at six more.
- **Opening all of a game's pages at once passed every game, and cut its check by 19–45%** ([`data/layout-pages.tsv`](data/layout-pages.tsv), from [`scripts/layout-pages.sh`](scripts/layout-pages.sh), which applies [`scripts/layout-pages.patch`](scripts/layout-pages.patch) and draws CI's software WebGL with [`scripts/chrome-swiftshader.sh`](scripts/chrome-swiftshader.sh)):

  | Game             | Cores | WebGL           | One page at a time | All at once |
  | ---------------- | ----: | --------------- | -----------------: | ----------: |
  | Brick Breaker    |    24 | devbox default  |             30.1 s |      19.7 s |
  | Brick Fuzz Pop   |    24 | devbox default  |             18.7 s |      10.2 s |
  | Snake            |    24 | devbox default  |             13.2 s |       8.0 s |
  | Asteroid Breaker |    24 | devbox default  |              9.3 s |       5.1 s |
  | Sudoku           |    24 | devbox default  |              3.2 s |       2.6 s |
  | Brick Breaker    |     4 | software (CI's) |             41.0 s |      32.5 s |
  | Brick Fuzz Pop   |     4 | software (CI's) |             21.8 s |      14.5 s |

- **Brick Breaker still trails,** because its script runs the Cleared-card check after the shared one, rather than beside it.

### The whole run side by side

- **Everything at once, at Yarn's defaults** ([`data/overlap-1.tsv`](data/overlap-1.tsv)): `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn build` then `yarn check:layout`, all started together. The run took 121 s against 171 s, and free memory fell to 0.7 GB.
  - The first run, before the review, took 124 s, with 0.6 GB free ([`data/overlap-1-first.tsv`](data/overlap-1-first.tsv)), and Brick Fuzz Pop's `src/testing/solver.spec.ts` ("finds nothing for a level no shot takes a hit off") timed out at 5 s. In the second, every spec passed.
- **Fewer workspaces at once** ([`data/overlap-3.tsv`](data/overlap-3.tsv)): lint's and typecheck's `foreach` four at a time, and the tests three at a time. Everything passed, in 120 s with 4.2 GB free, as it had in 119 s with 3.1 GB free the first time ([`data/overlap-3-first.tsv`](data/overlap-3-first.tsv)).
- **Lint's exit of 1 in both tables** is Prettier's check, its last step, finding these docs, which were being edited during the runs; every workspace's lint had passed.
- **One game's steps side by side** ([`data/one-game-brick-fuzz-pop-side-by-side.tsv`](data/one-game-brick-fuzz-pop-side-by-side.tsv)): Brick Fuzz Pop's lint, with ESLint at `--concurrency 4`, its four typecheck passes at once, its tests on every core, and its build then its layout check, all started together beside the root's skills, constraints, dedupe and Prettier checks. They took 34.4 s, set by the build and the layout check. One after another, as its own scripts run them, they took 86.5 s ([`data/one-game-brick-fuzz-pop-in-turn.tsv`](data/one-game-brick-fuzz-pop-in-turn.tsv)).
- **A scheduler could do better than either.** It would hand out cores by what each task uses rather than by process count, and start the longest tasks first. The CPU floor is 76 s.

### What a change touches

[`scripts/history.mjs`](scripts/history.mjs) classed the 809 non-merge commits on main's first-parent line from the site becoming a workspace of its own (193fc133, 2026-10-18) to e6740e04, by the workspaces a cache keyed on their inputs would recheck. That is the changed workspaces and every workspace depending on them, as e6740e04 declares them, or all of them for a change to any other file of the root's, such as `package.json`, `yarn.lock` or `.yarnrc.yml`, but its own scripts and configs ([`data/history.tsv`](data/history.tsv)). Before 193fc133 the site's files lived in `frontend/` itself, so they named no workspace.

| What the commit touched                                     | Commits |
| ----------------------------------------------------------- | ------: |
| one workspace (a game or the site)                          |   43.6% |
| two to thirteen workspaces                                  |   20.4% |
| no workspace: docs, Markdown, CI, the image or root scripts |   17.4% |
| everything: a library every workspace depends on            |   11.1% |
| everything: the root's config or the lockfile               |    7.4% |

That is 4.6 of the 14 workspaces per commit on average. But the most-touched workspaces are the heaviest: Brick Breaker 51%, Brick Fuzz Pop 49%, Asteroid Breaker 46%.

[`scripts/estimate.mjs`](scripts/estimate.mjs) modelled `yarn verify` and `check:layout` per commit with only the unchanged workspaces skipped, keeping today's order of steps, from each workspace's times alone. A commit that reaches every workspace takes the measured 171 s. Any other takes, for each step, the longest of its workspaces' times or their sum shared over the lanes that run at once, whichever is longer, plus 6 s for the root's checks and the site's 4 s build where the site or a game is in it. It leaves out the contention between workspaces, so it errs short where several run. The mean is 93 s and the median 102 s. 18.5% of commits would finish within 30 s, and 18.5% would still pay the full time: those that reach every workspace, the 11.1% and 7.4% above.

## Recommendations

Ranked by what they save for the effort. The local figures are measured unless marked "est.", and none was measured on CI until [As built](#as-built).

| #   | Change                                                                                                                                                                                  | Saves                                                                                                                                                                                                                                            | Effort       | Risk                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the layout check's pages side by side: a bounded pool in `@fz/dev/layout`'s `checkLayout()`, `checkTurns()` and `checkPhaserLayout()`, and Brick Breaker's two checks run together | Each game 19–45%. `yarn check:layout` 34 s → about 15–20 s (est.). On 4 local cores with CI's software WebGL, Brick Breaker's 41 s → 33 s                                                                                                        | Small        | More pages wait on frames together. All at once passed, even under software WebGL; a pool of about four bounds it, to keep the margin under `readyTimeoutMs`                                                                                                                                                  |
| 2   | TypeScript 7 for the 40 plain `tsc` passes, with `ngc`, ESLint and Analog left on 6; drop `--incremental` and the build-info files                                                      | `yarn typecheck` 17 s → about 8 s (est., from the passes run twelve at a time). CI's `typecheck` job should gain too: it restores TypeScript 6's build info, which the CI audit found saved nothing beyond the noise, and that cache step can go | Small–medium | Two TypeScripts can disagree in edge cases. TS 7 drops some JSDoc forms (`@enum`, `@constructor`, postfix `!`), which no script uses today                                                                                                                                                                    |
| 3   | `yarn verify:changed`, verifying what changed: the workspaces changed since `main` and their dependents, or everything for a root input, with each workspace's steps run side by side   | A one-game change 171 s → 34 s (Brick Fuzz Pop, measured before #1 and #2). 61% of commits touch one workspace or none                                                                                                                           | Medium       | It must class root inputs as "everything". Yarn's `foreach --since` ignores a change to `yarn.lock` alone                                                                                                                                                                                                     |
| 4   | One step runner for the full run, in `@fz/dev`: every workspace's steps as tasks in one pool, with a budget of cores and memory, the longest first, and layout after build              | The full run 171 s → 120 s measured with `overlap.sh`; a scheduler lands somewhere between that and the CPU floor of 76 s                                                                                                                        | Medium–large | Oversubscription runs memory low and times specs out, as seen, so the budget is the point of it                                                                                                                                                                                                               |
| 5   | Keep each passed step's input hash, and skip a step whose hash matches                                                                                                                  | A rerun after fixing one lint error skips the tests; a branch switch reuses its passes                                                                                                                                                           | Medium       | A key that misses an input gives a false pass. Key on the files git tracks plus the working tree's changes, the lockfile and the packages installed, the root's configs, `CI`, the command, and what git doesn't track: the Node that runs and, for the layout check, Chrome's version and what `dist/` holds |
| 6   | Document the edit loop: `yarn test -- --changed`, ESLint `--concurrency 4` for one game alone, and `NODE_COMPILE_CACHE` set for Vitest by `tools/run-tests.mjs`                         | Brick Fuzz Pop's specs 28 s → 19 s for one view file; its ESLint 22 s → 12 s; 0.5 s per Vitest start                                                                                                                                             | Small        | `--changed` follows static imports only, so it is a loop tool, not a gate                                                                                                                                                                                                                                     |
| 7   | Give Brick Fuzz Pop's `solver.spec.ts` case room, as Sudoku's `bank.spec.ts` got in 6b2808a0                                                                                            | A flake avoided                                                                                                                                                                                                                                  | Small        | None                                                                                                                                                                                                                                                                                                          |
| 8   | Trial Analog's `fastCompile` for builds                                                                                                                                                 | A game's build 6.0 s → 2.8 s, so `yarn build`, and the `build:games` that `yarn start` runs, about halve (est.)                                                                                                                                  | Small        | A new compile path for what ships: compare the bundles, and run the layout checks and the image, before adopting                                                                                                                                                                                              |

### 1. Layout pages side by side

- **The pool:** `checkLayout()` and `checkTurns()` would run their shapes through a small pool rather than a `for … await`. The size would be an option of the script, defaulting to about four, and `checkPhaserLayout()` would run both lists through it.
- **Brick Breaker:** its `checkBoth()` would hand its two checks to the same pool.
- **What stays the same:** each page already has its own browser context, so nothing is shared. The problems keep their shape names, so the output stays as it is.
- **The experiment:** it changed the two loops to `Promise.all`, and `checkPhaserLayout()` to run both lists together. All five games passed, and Brick Breaker and Brick Fuzz Pop passed again on 4 cores with software WebGL. That edit was reverted.

### 2. TypeScript 7 beside 6

- **How to add it:** [TypeScript's 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) shows the two side by side, with 7 under an alias such as `"@typescript/native": "npm:typescript@^7.0.2"`.
  - Not in each workspace: both packages declare a `tsc` binary. Tried in a scratch Yarn project, the alias took `node_modules/.bin/tsc` while `yarn tsc` still ran 6.
  - So `@fz/dev` depends on the alias and gives every workspace a `tsc7` binary that runs 7's, and each `typecheck` script reads `ngc -p tsconfig.app.json --noEmit && tsc7 -p tsconfig.spec.json --noEmit && …`. Tried the same way, `tsc` stayed 6 everywhere and `tsc7` ran 7.
- **What else changes:** `yarn.config.cjs` would hold the alias to one range, like every package. ESLint's project service and the editor keep TypeScript 6.
- **The path to one TypeScript:** once Angular's compiler runs on TypeScript 7, after 7.1, the `ngc` passes move too, and typescript-eslint follows when it supports 7.

### 3–5. A runner that skips what didn't change and runs the rest side by side

These are one tool, built in steps. `tools/run-tests.mjs` already orders workspaces, runs them in lanes and shares the cores out, so the runner would generalise it to `lint`, `typecheck`, `test`, `test:coverage`, `build` and `check:layout`. It starts as a script of its own, `yarn verify:changed`: while `yarn verify` is an `&&` chain, Yarn would hand a `--changed` to its last command, `yarn build`, alone. Once the runner has been used for a while, `yarn verify` and `yarn verify:full` could call it too (#4) rather than chaining `foreach`es.

1. **Affected only (#3):**
   - Choose the workspaces changed since the merge-base with `origin/main`, including uncommitted and untracked files, plus their dependents, by the `workspace:` dependencies `yarn.config.cjs` already reads.
   - Choose everything for a change to any other file of the root's, such as `package.json`, `yarn.lock` or `.yarnrc.yml`, but its own scripts and configs, which only the root's checks read, and for `.node-version`. `lib/dev`'s presets reach every workspace as its dependents.
   - Run each chosen workspace's steps side by side.
   - Keep it a script of its own, so a plain `yarn verify` still checks everything, and so does the merge-to-main skill's `yarn verify:full`.
2. **A budget of cores and memory (#4):**
   - Each task claims the cores it uses: Vitest its `--maxWorkers`, ESLint one core or its `--concurrency`, `ngc` and `tsc` one each, a build two and a layout check one.
   - It claims memory too, since memory, not cores, is what the run that timed out ran short of: 0.6–0.7 GB free, where the run that passed kept 3–4 GB. A big game's ESLint takes 1.8 GB, 4.0 GB at `--concurrency 4`; a Vitest worker's share can be measured the same way.
   - It starts the longest first, by the durations the runner recorded last time, rather than by spec-file counts.
   - It keeps a game's `check:layout` behind its `build`, and the site's build behind the games'.
   - It reports every failure, rather than stopping at lint's.
3. **Passes kept (#5):**
   - After a step passes, store a hash of its inputs. Skip it next time if the hash matches, and print that it was skipped.
   - The inputs are `git ls-files -s` over the workspace and the workspaces it depends on, the working tree's changes to them, the root's inputs above, the packages installed (`node_modules/.yarn-state.yml`) as well as the lockfile, `CI`, the step's command, the version of the Node that runs it and, for the layout check, Chrome's.
   - A build is never skipped, or the layout check and the site's build would read another branch's `dist/`; or those two key on what `dist/` holds rather than on whether the build passed.
   - Keep the store in `node_modules/.cache/`, like Prettier's.

**Turborepo instead:**

- **What it gives:** the task graph, `--affected` and a local cache, from configuration.
- **What it lacks here:**
  - Its concurrency is a count of tasks with no core budget, which is what timed the solver spec out.
  - A workspace's hash leaves out the sources of the libraries it compiles unless every task depends on a "transit" task.
  - It sends telemetry unless told not to.
- **Nx:** heavier, for the same.

So a runner of the repository's own fits better. Turborepo is the fallback if keeping one becomes a burden.

## Tried and not recommended now

- **Vitest's `threads` with `isolate: false`:**
  - `doctor` measured no gain worth the risk.
  - It failed a `@fz/game-ui` spec.
  - Angular users report TestBed's "Cannot set base providers" when files share a worker ([angular-cli#32754](https://github.com/angular/angular-cli/issues/32754)).
- **happy-dom:** not installed, so not measured. Angular supports it, but swapping it would change what every DOM spec runs against.
- **ESLint `--cache`:** stale results with type-aware rules, as [typescript-eslint's FAQ](https://typescript-eslint.io/troubleshooting/faqs/eslint) says.
- **Oxlint:**
  - Its type-aware linting is [stable on TypeScript 7](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable), and covers 59 of typescript-eslint's 61 type-aware rules. Every config here already passes TypeScript 7, as above.
  - It runs neither angular-eslint's template rules nor, beyond alpha, JS plugins such as the repository's fences.
  - So it can't replace ESLint. It could take the type-aware rules, leaving ESLint to run without type information, which is where ESLint's time goes. That is a large migration, with each rule's options to match, and worth a spike only after the changes above.
- **TypeScript 7 for `ngc`, typescript-eslint or Analog:** no compiler API in 7.0.
- **Analog's `fastCompile` in tests:** fails on the second run with Vitest's module cache, as above. Worth a report to Analog, since it would save about 2.7 s per Angular workspace's Vitest start.
- **`--sinceLastRun` for the games:** finds no specs in workspaces split into projects. Worth a report to Vitest.
- **One Vitest process for every workspace:** each workspace's Vite server and Analog's whole-app emit would run on its one main thread, one after another.

## Method

- **Machine and state:** the devbox had nothing else running, at e6740e04 with a clean tree but for these docs. After the first review, every script below but `bench.sh`, whose figures it found sound, was run again in turn, with the work that followed stashed, and the figures here are that second run's. `bench.sh` takes wall-clock and CPU from bash's `time`, CPU being the user plus system time of every process a step started; the other scripts take wall-clock from `date +%s%N`.
- **Warm:** Prettier's, `tsc`'s and Vitest's caches as an earlier run left them.
- **Scratch edits:** `fast-compile.sh` copies its configs into the games and deletes them after, putting Brick Breaker's own build back; `layout-pages.sh` applies its patch and takes it out again; `ts7-compare.sh` installs TypeScript 7.0.2 beside the logs, outside the repository.
- **The scripts, in [`scripts/`](scripts/),** each sourcing `env.sh`, which finds the repository through git and Yarn where Corepack keeps the version `package.json` pins, unless `YARN` is set, and writes the raw logs outside the repository, under `local-pipeline-audit-2026-11-14/logs/` beside the checkout, unless `LOGS` is set:
  - `bench.sh <label> [cold]` times each step of `yarn verify` and `yarn check:layout` ([`data/steps-warm.tsv`](data/steps-warm.tsv)), and `workspace-times.mjs` reads each workspace's times from its logs.
  - `alone.sh [workspace...]` times each workspace's steps with nothing else running.
  - `overlap.sh <label> [test options...]` runs the steps side by side.
  - `one-game.sh <game> [concurrency]` times one game's steps side by side, then one after another.
  - `ts7-compare.sh`, `eslint-concurrency.sh`, `fast-compile.sh` and `layout-pages.sh` time what their names say.
  - `history.mjs [since] [until]` classes the commits, and `estimate.mjs` models them.
  - `test-startup.mjs` reads each suite's start-up from `bench.sh`'s test log.
  - `step-memory.sh`, from step 6 of the work log, measures the memory each kind of step takes alone, for the claims `yarn verify:changed` makes.
  - For As built:
    - `verify-changed.sh <label> [branch | one-game]` times `yarn verify:changed` on the branch, or with a line added to one of Brick Fuzz Pop's files.
    - `ci-steps.sh <run-id>...` reads the Verify workflow's jobs and steps: how long each took, and when each job started and ended from the run's start.
    - `ci-workspace-tests.sh <run-id>...` reads each workspace's suite time from the test jobs' logs.
    - `ci-tests-ab.sh <label> <checkout-a> <checkout-b> <rounds> <options...>` runs one of CI's test jobs on 4 cores with `CI=true` in two checkouts, in turn.
- **By hand, not scripted:** the CPU profile of a Vitest start, `vitest doctor`, `--changed` and `--sinceLastRun`, Node's compile cache, Asteroid Breaker's per-file times, ESLint's rule timings, Stylelint's and ESLint's config's load, and TypeScript 7 catching seeded errors. Each was a one-off command, and the report says so where it cites one.
- **Read off the raw logs:** the six of Sudoku's 607 specs that the compilation API failed, from `fast-compile.sh`'s log of that run, and Sudoku's Vitest `Duration` of 2.9 s, from its run without `fastCompile`.
- **Not measured:**
  - Cold runs. The CI audit's are in its report.
  - CI runs of any of the changes, until As built.
  - `yarn verify:full`'s coverage runs.
  - The Docker image.
