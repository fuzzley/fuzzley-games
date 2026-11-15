# fuzzley-games CI performance, after the audit's changes

Nov 14, 2026 · `ci-speedup` at 4d37058f, against [the audit](report.md) of `main` at 3af8a55f

## Executive summary

The ten recommendations are built, and a push now waits about 3 minutes for its checks, down from 13. Three Verify runs on the branch took 199 s with empty caches, then 170 s and 153 s with caches, against 784 s for the `verify` job the audit timed last. A failing test now shows when its own job ends, at 2 to 3 minutes, not after 11. A push that changes only Markdown and `docs/` runs lint alone.

Where the time goes now:

1. **The longest test job, 138 to 187 s.** The tests run in three jobs side by side. Each of the four heaviest suites runs alone with all four cores, and two share a job one after the other. Asteroid Breaker and Brick Breaker end last in two of the three runs. Solitaire's suite takes 47 to 54 s, against 272 s before.
2. **Build and the layout check, 126 to 158 s.** The layout check still takes 79 to 106 s, and with the build it is now as long as the tests.
3. **Lint, 111 to 116 s.** Prettier takes under a second with its cache, against 24 s. ESLint is unchanged, its `foreach` taking 70 to 90 s.
4. **Set-up, 16 to 24 s a job,** from the job's start to its first check, against 24 s before for the one job. The install takes 3.7 to 6 s with Yarn's cache, against 7.5 to 11 s without it.
5. **Runner noise.** The same commit's jobs varied by up to half between two runs: `docker` took 51 and 78 s, the layout check 79 and 106 s. Asteroid Breaker's suite took 95, 61 and 70 s in the three runs.

Of the causes behind the audit's 8 red attempts, each now has a fix or a margin. Each test that ran near Vitest's 5 s now takes under 2.1 s, or has a timeout of its own. Chrome gets 60 s to start, and fails at once where it exits. Corepack's Yarn comes from the cache. No run has failed on a flake since, but three runs are too few to show the red rate.

Next, in order:

1. Check every `run:` block of the workflow and the composite action with `bash -n` in `yarn lint`, which would have caught the one bug the branch shipped (#1 below).
2. Split the tests further and run each game's layout check in a job of its own, together (#2, #3). Either alone leaves the other as the longest job.
3. Run ESLint four workspaces at a time on CI (#4), as `lint` is among the longest jobs once #2 and #3 land.

## What was built

| #   | Recommendation                                                    | Built in                                                                                                                                                                                                                                                                                                                           | Commit   |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Split `verify` into parallel jobs                                 | `changes`, `lint`, `typecheck`, three `test` jobs, `build` (with the layout check) and `docker`, then `promote`. The test pairs were chosen from 4-core timings: Asteroid Breaker with Brick Breaker, Brick Fuzz Pop with Solitaire, and the other ten four at a time.                                                             | a02e63af |
| 2   | Start Solitaire first, and give a suite alone all the workers     | `tools/run-tests.mjs` (`@fz/dev/workspaces`) starts the workspaces with the most spec files first and shares the cores among those running at once; `--only`, `--except` and `--jobs` choose each CI job's.                                                                                                                        | d4282887 |
| 3   | Timeouts of their own for the near-limit tests, cheaper specs     | `eslint.spec` lints once before its tests; Sudoku's hint test runs in quarters; Brick Breaker's "behind steel" test has 20 s. Asteroid Breaker's strays test already had 20 s, since Nov 3, which the audit missed.                                                                                                                | 6b2808a0 |
| 4   | Raise Chrome's launch limit, the layout check in a job of its own | 60 s, failing at once where Chrome exits or can't run. The layout check runs in `build`, after the build it checks, rather than in a job that would set up again and download the build.                                                                                                                                           | aec28878 |
| 5   | Prettier with `--experimental-cli` and its cache                  | It checks the same 2,432 tracked files as the classic CLI, its cache keyed on content and options; `lint` restores the cache. It stays at the end of `yarn lint`, as it takes under a second with the cache.                                                                                                                       | 741c8d26 |
| 6   | Cache Yarn and its packages with `actions/cache`                  | `.github/actions/setup-frontend` restores Corepack's Yarn, keyed on the Corepack and Yarn pinned, and Yarn's cache, keyed on the lockfile.                                                                                                                                                                                         | a02e63af |
| 7   | Lint alone for a push of Markdown and `docs/`                     | `.github/scripts/changes-code.sh` compares with `live`, the last commit of `main` that passed, counting a moved file by both its paths; `promote` moves `live` on lint alone where nothing else changed.                                                                                                                           | a02e63af |
| 8   | `tsc --incremental`, its build info cached                        | Every `tsc` pass keeps `tsconfig.<name>.tsbuildinfo` beside its config; `typecheck` restores them.                                                                                                                                                                                                                                 | 741c8d26 |
| 9   | No HTML coverage report on CI                                     | `@fz/dev/vitest`'s `coverage()` writes text alone where `CI` is `true`.                                                                                                                                                                                                                                                            | aec28878 |
| 10  | Dependabot's pull requests                                        | `setup-frontend` dedupes the lockfile of an npm pull request Dependabot opened, so its checks run on the update as it would land, and `lint` warns that it lands by hand. A third group takes every other npm package, so a week's version updates come as three pull requests. No token was needed, since nothing is pushed back. | 4d37058f |

The first report's 2,514 files for Prettier were the tracked files of the types it formats, before `.prettierignore`; Prettier checks 2,432, counted with its own `getFileInfo()`. The work log's 2,179 was the files that change at a print width of 20, fewer than it checks. The work log, [work-log.md](work-log.md), has each step's measurements, its review and the answers.

## Scope and method

- **CI:** three runs of the Verify workflow, dispatched on `ci-speedup` one after another, on GitHub's standard 4-vCPU `ubuntu-latest` runners. The first ran with every cache empty; the second and third restored the caches the runs before them saved. Job and step times come from the Actions API, and per-workspace and per-test times from the jobs' logs. A run before them, 43654599384, failed on a bug of the branch's own (below) and isn't counted.
- **Local:** the same 24-core devbox, Node 26.13.0 and Yarn 4.18.1, at 741c8d26 with the workflow staged. Each phase of `yarn verify:full` and `yarn check:layout` was timed with Prettier's and `tsc`'s caches emptied first, natively and held to 4 cores with `CI=true` (`taskset -c 0-3`) and Chrome drawing in software, as the audit timed them. Each CI job's own command was also timed on 4 cores.

Since the merge:

- **The push to `main`,** 9bba39fe, run [43657595375](https://github.com/fuzzley/fuzzley-games/actions/runs/43657595375), checked everything with `main`'s caches empty, as caches saved on a branch don't reach `main`. Its checks ended at 150 s, and `promote` moved `live` at 161 s.
- **Dependabot's first pull requests since,** [#29](https://github.com/fuzzley/fuzzley-games/pull/29) (ESLint, in `lint-and-test`) and [#30](https://github.com/fuzzley/fuzzley-games/pull/30) (PostCSS, in the new `everything-else`), each needed its lockfile deduped. Both passed every check, each but `docker` on the lockfile deduped, ending at 216 s and 201 s, and `lint` warned on each that it lands by hand.
- **A push of docs alone,** not measured yet: the commit that adds this list changes only `docs/`, so its run should check lint alone and move `live` on it.

## Pipeline map

```
push or pull request
├── changes · 7–10 s: Markdown and docs/ only, since live?
├── lint · 111–116 s
│     set up → yarn lint 84–94 s (ESLint's foreach 70–90 s, Prettier under 1 s with its cache)
├── typecheck · 69–93 s, only where code changed
│     set up → yarn typecheck 49–64 s
├── test × 3 · 120–187 s, only where code changed
│     asteroid-breaker, then brick-breaker, 4 workers each · tests 102–162 s
│     solitaire, then brick-fuzz-pop, the same way · tests 101–122 s
│     the other ten, 4 at a time, 1 worker each · tests 92–115 s
├── build · 126–158 s, only where code changed
│     set up → yarn build 23–33 s → check:layout 79–106 s
├── docker · 51–78 s, only where code changed
└── promote · main only, once every job passes, or lint alone where only docs changed → live → Cloud Run
```

Each job that sets up the frontend takes 16 to 24 s to reach its first check. `typecheck`, `test`, `build` and `docker` wait for `changes`, starting 12 to 15 s in; `lint` starts at once.

## GitHub Actions timings

Each job's length in seconds, and when the last check ended, from the run's start:

| Job                                    | Before, 3af8a55f | Run 1, empty caches |   Run 2 |   Run 3 |
| -------------------------------------- | ---------------: | ------------------: | ------: | ------: |
| changes                                |                — |                   8 |       7 |      10 |
| lint                                   |                — |                 115 |     116 |     111 |
| typecheck                              |                — |                  93 |      85 |      69 |
| test (Asteroid Breaker, Brick Breaker) |                — |                 187 |     120 |     139 |
| test (Brick Fuzz Pop, Solitaire)       |                — |                 150 |     120 |     124 |
| test (the rest)                        |                — |                 126 |     138 |     120 |
| build                                  |                — |                 126 |     158 |     128 |
| docker                                 |               65 |                  55 |      78 |      51 |
| verify                                 |              784 |                   — |       — |       — |
| **the last check ends**                |          **784** |             **199** | **170** | **153** |

Runs: 1 is [43655116933](https://github.com/fuzzley/fuzzley-games/actions/runs/43655116933) at a02e63af; 2 is [43655417436](https://github.com/fuzzley/fuzzley-games/actions/runs/43655417436) and 3 is [43655725239](https://github.com/fuzzley/fuzzley-games/actions/runs/43655725239), both at 4d37058f, which differs from a02e63af only in Dependabot's set-up.

The phases the audit timed, in seconds:

| Phase                      |      Before | Run 1 | Run 2 | Run 3 |
| -------------------------- | ----------: | ----: | ----: | ----: |
| Set-up, to the first check |          24 | 20–24 | 16–18 | 16–22 |
| Lint                       |         109 |    84 |    94 |    85 |
| of which Prettier          |          24 |    13 |   0.8 |   0.6 |
| Typecheck                  |          66 |    59 |    64 |    49 |
| Tests                      | 462, in one |   162 |   115 |   119 |
| Build                      |          27 |    23 |    33 |    27 |
| Layout check               |          92 |    79 |   106 |    79 |

Since the split, the set-up is each job's range, and the tests' figure the longest of the three jobs' test steps.

- **The four heaviest suites run three to five times faster,** each now with all four cores of its runner:

  | Suite            | Before, 1 worker | Run 1 | Run 2 | Run 3 |
  | ---------------- | ---------------: | ----: | ----: | ----: |
  | Asteroid Breaker |              257 |    95 |    61 |    70 |
  | Brick Fuzz Pop   |              238 |    68 |    54 |    55 |
  | Brick Breaker    |              167 |    66 |    42 |    49 |
  | Solitaire        |              272 |    54 |    47 |    48 |
  | `@fz/phaser`     |               70 |    82 |    91 |    75 |
  | Sudoku           |               58 |    69 |    85 |    67 |

  The other ten run four at a time on one worker each, 343 to 425 s of suites over four lanes. `@fz/phaser` and Sudoku are the longest of them, and Minesweeper, started 65 to 82 s in, ends the job at 92 to 115 s.

- **The caches hit as intended.** Run 1 saved each cache, and runs 2 and 3 restored it. Prettier's check fell from 13 s to under a second. On CI, `tsc`'s build info made no difference beyond the noise: `typecheck` took 59 s cold, then 64 s and 49 s. Locally on 4 cores, it saved 19 of `yarn typecheck`'s 69 s. Corepack's Yarn came from the cache in runs 2 and 3.
- **Runner noise is larger than the audit's 15 to 20%.** Run 2 was slower than run 3 in most jobs, `docker` by 53% and the layout check by 34%, but faster in the two pair test jobs. Read single-run figures as ±25%.
- **More runners, fewer minutes.** A push now runs 8 jobs before `promote`, where it ran 2: about 750 runner-seconds in run 3, against about 850. Minutes are free for a public repository.
- **The branch shipped one bug.** In run 43654599384, six jobs failed in "Set up the frontend", while `changes` and `docker` passed: an apostrophe inside `${COREPACK_VERSION:?…}` opened a quote in bash. It was fixed in the same commit before the runs above, and the audit's `scripts/check-runs.cjs` then ran `bash -n` over every `run:` block once, finding nothing else. Nothing checks them on each change yet (#1 below).

## Local timings

| Phase              | 24 cores, before | 24 cores, after | 4 cores `CI=true`, before | 4 cores `CI=true`, after |
| ------------------ | ---------------: | --------------: | ------------------------: | -----------------------: |
| tests              |             91 s |            88 s |                     408 s |                    303 s |
| lint, but Prettier |             34 s |            34 s |                      88 s |                     89 s |
| Prettier           |             33 s |             8 s |                      33 s |                     26 s |
| typecheck          |             23 s |            24 s |                      66 s |                     68 s |
| build              |             14 s |            14 s |                      27 s |                     27 s |
| layout check       |             34 s |            34 s |                      63 s |                     63 s |
| install            |              2 s |             2 s |                       2 s |                      2 s |
| **total**          |        **232 s** |       **203 s** |                 **686 s** |                **577 s** |

Every "after" figure was measured with Prettier's and `tsc`'s caches emptied. "Lint, but Prettier" is the skills' and constraints' checks, `yarn dedupe --check` and ESLint.

- **With the caches, as a developer runs it again:** natively, Prettier takes 1.1 s and `yarn typecheck` 17 s, and `yarn verify:full` then `yarn check:layout` took 159 s and 35 s, 194 s against 232 s before.
- **Prettier's experimental CLI is faster even cold:** 8 s against 33 s natively, 26 s against 33 s on 4 cores.
- **The test phase on 4 cores is set by Solitaire on one worker,** started first: 291 s of the 303 s. The CI split runs it alone on 4 workers in about 50 s.
- **The CI jobs' own commands on 4 cores:** `lint` 112 s cold and 88 s with Prettier's cache; `typecheck` 69 s and 50 s; the test jobs 117 s, 111 s and 85 s; `build` 28 s and the layout check 64 s. CI's runners ran them from a quarter faster to two-thirds slower, as runners vary.

## The red-run causes

| Cause in the audit                                                   | Red attempts | Now                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tests past Vitest's 5,000 ms                                         |            4 | The four heaviest suites run with four workers each. `eslint.spec` lints once before its tests and Sudoku's hint test runs in quarters, so no one test carries the cost, and Brick Breaker's test has 20 s. Snake's board spec and `@fz/phaser`'s `viewport_scaler.spec` were fixed before the audit, in 72ecbcf4. |
| Layout check: Chrome didn't start in 15 s, two launched side by side |            1 | 60 s to start, and an exit or a missing Chrome fails at once rather than waiting. The check still starts two Chromes side by side on 4 vCPU, as it did.                                                                                                                                                            |
| Layout check: Brick Breaker's Cleared card                           |            2 | Fixed before the audit, in 21dbcad2.                                                                                                                                                                                                                                                                               |
| Corepack's download of Yarn failed with `ENETUNREACH`                |            1 | Corepack's Yarn is restored from the cache, so it is downloaded only when Corepack or the pinned Yarn changes.                                                                                                                                                                                                     |
| Dependabot's pull requests stopped at `yarn dedupe --check`          |   13 PR runs | Their checks run on the lockfile deduped. Two of Nov 14's, #24 and #27, failed the check as written and pass once deduped; #26 needed nothing.                                                                                                                                                                     |

The tests the audit found nearest the limit, slowest in the three runs:

| Test                                                 |  Before, slowest green |      Now | Timeout |
| ---------------------------------------------------- | ---------------------: | -------: | ------: |
| `@fz/dev` `eslint.spec`'s slowest test               |               4,729 ms | < 300 ms |     5 s |
| Sudoku `bank.spec`, the hints (now in quarters)      |               4,624 ms | 1,289 ms |     5 s |
| Sudoku `bank.spec`'s slowest test                    |                      — | 2,032 ms |     5 s |
| Snake's board spec                                   |  5,501 ms (red, Nov 9) | 1,173 ms |     5 s |
| Asteroid Breaker `autopilot.spec`, the strays        |               4,774 ms | 4,733 ms |    20 s |
| Brick Breaker `autopilot.spec`, a brick behind steel | 5,297 ms (red, Nov 14) | 4,775 ms |    20 s |
| Brick Fuzz Pop's `flight/benchmarks/guide.spec.ts`   |                      — | 9,514 ms |    60 s |

The two autopilot tests came within 0.3 s of Vitest's default in run 1; their 20 s timeouts are their margin.

## Recommendations

The wait is now set by whichever of four jobs runs longest that time: the three test jobs and `build`, 120 to 187 s each. Shortening one of them alone saves little, since the next ended 10 to 36 s after it. The estimates below add 16 to 24 s of set-up to each job, and scale a figure from the devbox held to 4 cores by that phase's own range on CI.

| #   | Change                                                                                                                                              | What it saves                                                                                                                                                                                                                                             | Effort | Note                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Check every `run:` block of `.github/workflows/` and `.github/actions/` with `bash -n` in `yarn lint`, as the audit's `scripts/check-runs.cjs` does | A `run:` block bash can't parse fails in `yarn lint` before it is pushed, rather than in a run's jobs                                                                                                                                                     | Small  | The branch's one bug, an unbalanced quote in the composite action, failed six jobs of its first run. actionlint lints workflow files, and this one was in an action's                                                                  |
| 2   | Give each of the four heaviest suites a test job of its own, and the other ten two jobs                                                             | The longest test job from 138–187 s to about 80–120 s: Asteroid Breaker's suite alone took 61 to 95 s. The other ten, 343 to 425 s of suites, would take about 45 to 55 s a job over eight lanes, but at least `@fz/phaser`'s 75 to 91 s on one worker    | Small  | Six test jobs, a matrix entry each. Vitest's `isolate: false` for the simulation projects would save another 9 to 14 s each, as the audit found                                                                                        |
| 3   | Run each game's layout check in a job of its own that builds only that game, and `build` without it                                                 | `build`, which still builds every game for the site to copy and check, from 126–158 s to about 40–60 s; the slowest layout job, Brick Breaker's, at about 90–125 s: its check took 54 s alone on 4 cores, so 66 to 90 s on CI, its build 7 s, plus set-up | Medium | Five layout jobs. Downloading one build into each instead would wait for `build` first, ending them near today's 126–158 s                                                                                                             |
| 4   | Run ESLint four workspaces at a time on CI                                                                                                          | Measured on 4 cores: the lint `foreach` from 83 s to 72 s, so `lint` from 111–116 s to about 100 s                                                                                                                                                        | Small  | `yarn lint`'s `foreach` sets no `--jobs`, so Yarn runs half the cores, two on a runner. Yarn's shell expands `${LINT_JOBS:+--jobs $LINT_JOBS}` (tried), so `lint` can take `LINT_JOBS: 4` from the job and keep Yarn's default locally |
| 5   | Watch the red rate for two weeks, then make the two autopilot tests cheaper or keep their margins                                                   | —                                                                                                                                                                                                                                                         | Small  | Both came within 0.3 s of Vitest's 5 s on a slow runner                                                                                                                                                                                |

With #2, #3 and #4 together, the longest jobs would be the tests and the layout checks at about 80 to 125 s, each starting 12 to 15 s in, after `changes`, and `lint` at about 100 s: a wait of about 2 minutes, 1.7 to 2.3 estimated, not measured. Each adds runners, which cost nothing for a public repository.

## Appendix

Everything behind the figures is on the devbox in `/home/dev/Projects/personal/ci-audit-2026-11-14/`, outside the repository, beside the audit's own data.

- `data/after/`: each run and its jobs with their steps, from the Actions API, for runs 43654599384, 43655116933, 43655417436 and 43655725239 on the branch, 43657595375 on `main`, and Dependabot's 43657771606 and 43657815452.
- `logs/after/`: each job's log; `logs/after-clean/` the test jobs' with the colour codes taken out, for `scripts/slow-tests.mjs`.
- `logs/local/after-native-24/`, `logs/local/after-ci-4core/`: the local runs with the caches emptied, each phase's output. `logs/local/after-native-24-warm/`: Prettier, `yarn typecheck`, `yarn verify:full` and `yarn check:layout` run again with the caches. `logs/local/jobs-4core/`, `jobs-4core-tests/` and `jobs-4core-pairs/`: each CI job's command on 4 cores, and the pairs tried. `logs/local/lint-jobs-4core/`: the lint `foreach` two and four at a time.
- `scripts/fetch-after.sh` and `scripts/summarize-after.mjs` fetch and summarize a run; `scripts/check-runs.cjs` runs `bash -n` over every `run:` block.

```bash
scripts/fetch-after.sh 43655116933 43655417436 43655725239 43657595375 43657771606 43657815452
node scripts/summarize-after.mjs 43655116933 43655417436 43655725239 43657595375 43657771606 43657815452
scripts/local-bench-after.sh after-native-24
CI=true CHROME_PATH=$PWD/scripts/chrome-swiftshader.sh taskset -c 0-3 scripts/local-bench-after.sh after-ci-4core
CI=true taskset -c 0-3 scripts/local-bench-jobs.sh jobs-4core
```
