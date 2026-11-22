# fuzzley-games build, test and CI performance audit

Nov 14, 2026 · `main` at 51738832

The recommendations were built and timed again the same day: [report-after.md](report-after.md).

## Executive summary

Every push to `main` now waits 13 minutes for CI, up from 6 on Oct 27. In the week to Nov 14, 7 of 27 pushes went red at least once before going live, and none of them for a bug in a game. The wait comes from one job that runs every step in sequence on a 4-vCPU runner. Splitting it into parallel jobs should bring the wait to about 3 minutes. That figure is estimated from local runs, not measured on GitHub.

Where the 780 s of the latest run go, largest first:

1. **Tests, 462 s.** Yarn starts workspaces in alphabetical order, so Solitaire starts 13th of 14 and runs on one worker for 272 s. For the last 158 s, three of the four lanes (the slots tests run in side by side) sit idle. Starting Solitaire first measured 100 s faster. Alone with 4 workers it takes 51 s.
2. **Lint, 109 s.** ESLint, with its type-aware rules, runs two workspaces at a time. Prettier runs single-threaded after it, for 24 s.
3. **Layout check, 92 s, up from 13 s.** It makes 59 page loads of games drawn in software WebGL, two games at a time.
4. **Typecheck, 66 s.** Each Angular workspace runs four compiler passes, and every app type-checks the libraries again.
5. **Red runs.** Of 8 failed attempts, 4 were tests near the 5 s timeout, 3 were the layout check and 1 was Corepack's download of Yarn. Each costs a 13-minute re-run. The worst held a push back 9.9 hours, overnight.

Suggested order:

1. Split the job (#1 in the recommendations).
2. Start Solitaire first (#2). This also helps the local `yarn test`.
3. Give the near-limit tests and Chrome's launch more room (#3, #4).
4. Cache Prettier and Yarn (#5, #6).

## Scope and method

The audit covers fuzzley-games at `main` 51738832: 15 Yarn workspaces (7 games, 6 libraries, the site) and its one workflow, `.github/workflows/verify.yml`, with its `verify`, `docker` and `promote` jobs.

- **CI history:** the last 100 Actions runs, Oct 27 to Nov 14, 2026.
  - That is 71 Verify runs: 44 pushes and 22 pull requests that finished, plus 5 cancelled.
  - Those runs made 222 job attempts. The other 29 runs were Dependabot's own update jobs.
  - Job and step times come from the Actions API.
  - Logs were read for every failed attempt and for 13 green runs spread over the period.
- **Runner:** GitHub's standard `ubuntu-latest` for a public repository, 4 vCPU and 16 GB.
- **Local:** the 24-core WSL2 devbox, Node 26.13.0 and Yarn 4.18.1.
  - Each phase of `yarn verify:full` and `yarn check:layout` was timed on its own, with per-workspace times from `foreach -vv`.
  - The same run was repeated on 4 cores with `CI=true` (`taskset -c 0-3`) to match the runner's core count.
- **Code:** the root and workspace scripts, `@fz/dev`'s Vitest, ESLint and layout-check presets, each workspace's Vitest config, the Dockerfile and `check-image.sh`.

Not covered: Cloud Build's own build after `promote` moves `live`, and the cost of Actions minutes. The repository is public, so minutes are free.

## Pipeline map

One workflow runs on every push and pull request. Its `verify` job runs every step in sequence on one 4-vCPU runner, so every push waits its 13 minutes.

```
push or pull request
├── verify job · 784 s, the critical path
│     set up 12 s → install 12 s → yarn verify:full 664 s → check:layout 92 s
│                                  (lint, typecheck, tests, build)
├── docker job · 65 s, beside it
│     build the image 56 s → check its pages 2 s
└── promote · main only, 11 s, once both pass → live branch → Cloud Run deploys
```

Inside `yarn verify:full`, each phase is a `yarn workspaces foreach` over the 15 workspaces.

- **Lint, typecheck and the game builds:** `--parallel` defaults to half the cores, so on the runner these run 2 workspaces at a time.
- **Tests:** 4 workspaces at a time (`--jobs 4`), each Vitest on one worker (`--maxWorkers=25%`).
- **`check:layout`:** 2 games at a time.
- **The `docker` job:** it builds the frontend a second time inside the image, but finishes 12 minutes earlier, so it never sets the wait.

## Local timings

On all 24 cores the devbox runs `verify:full` and `check:layout` in 232 s, under 4 minutes. Held to 4 cores with `CI=true` and Chrome drawing in software, it takes 686 s, within 11% of CI's 768 s. That makes it a reliable stand-in for the runner when testing a CI change.

| Phase        | Devbox, 24 cores | Devbox, 4 cores, `CI=true` | CI runner, 4 vCPU |
| ------------ | ---------------: | -------------------------: | ----------------: |
| tests        |             91 s |                      408 s |             462 s |
| lint         |             67 s |                      120 s |             109 s |
| layout check |             34 s |                       63 s |              92 s |
| typecheck    |             23 s |                       66 s |              66 s |
| build        |             14 s |                       27 s |              27 s |
| install      |              2 s |                        2 s |              12 s |
| **total**    |        **232 s** |                  **686 s** |         **768 s** |

The local install ran with a warm cache.

- **Tests take the longest on both machines.** On 24 cores, the slowest suites are Brick Breaker (62 s), Asteroid Breaker (61 s) and Brick Fuzz Pop (56 s). On 4 cores, Solitaire takes 263 s, as on CI.
- **Prettier takes as long as all of ESLint locally:** 33 s against 32 s on 24 cores. It is single-threaded, so more cores don't help, and it runs after ESLint rather than beside it. The devbox runs single-threaded work slower than the runner does, so on CI Prettier takes 24 s.
- **The developer loop pays the same cost.** The `merge-to-main` skill asks for `yarn verify:full` and `yarn check:layout` before each push, about 4 minutes here. CI then takes 13 more before the push goes live.

## GitHub Actions timings

The `verify` job went from 347 s on Oct 27 to 780 s on Nov 14. Of the 433 s it gained, tests account for 297 s, the layout check 79 s, lint 30 s, typecheck 16 s and the build 7 s.

Seconds per phase in 13 green push runs:

| Date   | Commit   | Tests | Lint | Typecheck | Build | Layout | Job |
| ------ | -------- | ----: | ---: | --------: | ----: | -----: | --: |
| Oct 27 | 94a5d2ab |   165 |   79 |        50 |    20 |     13 | 347 |
| Oct 30 | 0d4e25f9 |   254 |  115 |        76 |    31 |     32 | 529 |
| Nov 2  | 2330fa2e |   251 |   99 |        65 |    27 |     26 | 490 |
| Nov 8  | 33429cca |   313 |   87 |        56 |    23 |     39 | 536 |
| Nov 8  | 5521dce9 |   402 |   77 |        48 |    21 |     40 | 609 |
| Nov 9  | f662d02a |   352 |   79 |        55 |    21 |     32 | 559 |
| Nov 10 | 6d5e3bd9 |   463 |  109 |        74 |    28 |     47 | 743 |
| Nov 11 | cb43a4d2 |   329 |   76 |        50 |    20 |     40 | 535 |
| Nov 11 | afac7880 |   328 |   84 |        56 |    21 |     49 | 556 |
| Nov 14 | 8087deef |   375 |   92 |        57 |    22 |     52 | 618 |
| Nov 14 | 3c5aff52 |   376 |   81 |        54 |    23 |     83 | 633 |
| Nov 14 | 11567498 |   460 |  105 |        66 |    26 |     92 | 770 |
| Nov 14 | 51738832 |   462 |  109 |        66 |    27 |     92 | 780 |

8cfe800e landed between the two Nov 8 runs.

- **Running the tests in parallel made CI slower.**
  - 8cfe800e (Nov 8) ran 4 workspaces at a time with one Vitest worker each.
  - Locally it cut tests from about 392 s to 97 s.
  - On CI, summed Vitest time went from 280 s to 989 s, and the test phase from 313 s to 402 s.
  - Solitaire alone went from 46 s to 227 s, because its 172 spec files now share one worker.
- **New games account for the rest.** Brick Breaker (Oct 29) and Asteroid Breaker (Oct 31) added most of the growth before Nov 8. Brick Fuzz Pop (Nov 11) and the Brick Breaker uplift (Nov 14) mostly made Solitaire's tests start later.
- **The layout check grew from 13 s to 92 s.** Brick Breaker's and Asteroid Breaker's checks came first, then Brick Fuzz Pop's on Nov 11. The Brick Breaker uplift and its 60 s wait for the Cleared card came on Nov 14.
- **Runner noise is 15 to 20%.**
  - The same commit, 67f71c6c, took 498 s and then 590 s for `verify:full`.
  - The last two runs on Nov 14 were 15 to 25% slower in every phase at once, which points at the runner.
  - The runner image moved from Ubuntu 24.04 to 26.04 on Nov 11.
- **Nothing is cached.**
  - Each run downloads Yarn through Corepack and about 490 MiB of packages (8 to 12 s).
  - ESLint, Prettier, tsc and Vitest all start cold.
  - The Docker image is built with no layer cache.
  - Queueing is not a factor: jobs start within 1 to 3 s.
- **The docker job takes 45 to 80 s.** It installs and builds the frontend again (`yarn install` 13 s, `yarn build` 31 s), but never sets the wait.

## Recent CI failures

In the last 7 days, 7 of 27 pushes to `main` had a red attempt (26%). From Oct 27 to Nov 8 there were none. None of the failures was a bug in a game:

- 4 were tests that ran past Vitest's 5,000 ms default timeout on the 4-vCPU runner.
- 3 were the browser layout check.
- 1 was a network error.

A red run skips `promote`, so each one held the push back from going live.

| Date   | Commit                | Step    | Cause                                                                                                 | What made it green        | Delay to live    |
| ------ | --------------------- | ------- | ----------------------------------------------------------------------------------------------------- | ------------------------- | ---------------- |
| Nov 14 | 11567498              | Install | Corepack's download of Yarn failed with `ENETUNREACH`, trying only IPv6 addresses                     | Re-run                    | 15 min           |
| Nov 14 | 1ba33047              | Tests   | Brick Breaker `autopilot.spec` "aims only at a brick it can see" took 5,297 ms, on a docs-only commit | Next push, unchanged test | 36 min           |
| Nov 14 | a3db2abd (2 attempts) | Layout  | Brick Breaker's Cleared card didn't show within 10 s; software WebGL draws a few frames a second      | Fix 3c5aff52, a 60 s wait | 46 min           |
| Nov 14 | 67f71c6c              | Layout  | "Chrome did not start within 15000 ms" for Asteroid Breaker and Brick Breaker, launched side by side  | Re-run                    | 23 min           |
| Nov 11 | 0f5d7360              | Tests   | `@fz/dev` `eslint.spec` ran out of heap under `CI=true`; Sudoku `bank.spec` took 5,492 ms             | Fix cb43a4d2              | 34 min           |
| Nov 9  | cafce1b7              | Tests   | Snake board spec took 5,501 ms, waiting on Phaser's first load                                        | Fix 0da2f763              | 9.5 h            |
| Nov 9  | 8c0d9087              | Tests   | Snake board spec 5,399 ms; `@fz/phaser` `viewport_scaler.spec` 5,229 ms                               | Fix 0da2f763              | 9.9 h, overnight |

- **Tests near the 5,000 ms limit in green runs:**
  - Asteroid Breaker `autopilot.spec` "brings most of the strays that cross home" reached 4,774 ms.
  - `@fz/dev` `eslint.spec` "keeps a library's testing helpers out of what isn't a test" reached 4,729 ms. It was still at 4,639 ms on Nov 14, after its fix.
  - Sudoku `bank.spec` reached 4,624 ms.
  - Brick Breaker's "aims only at a brick it can see" reached 3,579 ms.
  - Brick Fuzz Pop's simulations set a longer timeout (`SIM_TIMEOUT_MS`, 60 s). So did Asteroid Breaker's strays test, 20 s since Nov 3, which this audit first missed.
- **Late signal:** a test timeout only shows about 11 minutes into the job. Lint and typecheck run first, and the test step waits for every workspace to finish.
- **Dependabot:** all 13 failed Dependabot PR runs stopped at `yarn dedupe --check`, about 30 s in. Nine others passed in 578 to 896 s, but their updates were then applied by hand anyway. That is about 106 runner-minutes spent on PRs that are never merged.
- **Runner time lost:** 85 min in failed jobs, 24 min in the `docker` jobs beside them, and 14 min in 3 runs cancelled by a newer push. Minutes are free for a public repository, so the real cost is the delay to live and the manual re-runs.

## Hotspots in detail

The test phase is 60% of the job, and a third of it is a scheduling tail. Yarn starts workspaces in alphabetical order, so Solitaire, the slowest suite on CI, starts 13th.

Run 51738832, seconds after the test phase began, 4 lanes of one Vitest worker each:

| Workspace        | Start | End | Duration |
| ---------------- | ----: | --: | -------: |
| lib/dev          |     1 |  31 |       29 |
| lib/core         |     2 |   7 |        4 |
| lib/game-ui      |     6 |  42 |       35 |
| lib/style        |     8 |  24 |       15 |
| lib/phaser       |     9 |  80 |       70 |
| lib/ui           |    28 |  54 |       25 |
| asteroid-breaker |    42 | 299 |      257 |
| brick-breaker    |    52 | 219 |      167 |
| brick-fuzz-pop   |    66 | 304 |      238 |
| minesweeper      |    85 | 117 |       32 |
| site             |   122 | 143 |       21 |
| snake            |   150 | 177 |       27 |
| **solitaire**    |   190 | 462 |  **272** |
| sudoku           |   224 | 282 |       58 |

After 304 s only Solitaire runs, for 158 s. With the same work spread evenly over 4 lanes, the phase would end near 313 s.

Ranked by seconds on CI's critical path, latest run:

1. **Test phase, 462 s.**
   - **Order:** `foreach --jobs 4` starts the 6 libraries first and Solitaire 13th. Three of the four lanes sit idle for the last 158 s.
   - **Solitaire on one worker, 272 s:** `--maxWorkers=25%` is one worker on 4 vCPU. Its 172 spec files spend 46% of their time starting workers and 19% in setup. The tests themselves add up to about 56 s.
   - **Arcade suites:**
     - Asteroid Breaker: 128 s with coverage, plus 126 s of simulations.
     - Brick Fuzz Pop: 163 s plus 72 s.
     - Brick Breaker: 131 s plus 34 s.
     - The single slowest file is Brick Breaker's `bricks_scene.spec`, 32 to 40 s.
     - Vitest reports that `isolate: false` would save 9 to 14 s in each of these three.
   - **Coverage:** every run writes an HTML report (Solitaire also JSON) that nothing uploads.
2. **Lint, 109 s.** The lint `foreach` takes 83 s: ESLint's type-aware rules (through `projectService`), two workspaces at a time, no `--cache`. Then Prettier takes 24 s, single-threaded over 2,514 files, after ESLint rather than beside it.
3. **Layout check, 92 s.**
   - It runs two games at a time on 4 vCPU, each Chrome drawing WebGL in software.
   - At 2×, Asteroid Breaker loads 8 pages, Brick Breaker 14 (8, then 6 more for its Cleared card), Snake and Brick Fuzz Pop 16 each, and Sudoku 5: 59 page loads in all.
   - Brick Breaker ends last, at 87 s. Its Cleared pass waits up to 60 s per shape.
   - Chrome has 15 s to start, and two Chromes starting together on 4 vCPU missed that once.
4. **Typecheck, 66 s.**
   - Each Angular workspace runs four compiler passes: `ngc` on the app, then `tsc` on the specs (all of `src/` again), the Node configs and the scripts.
   - Every app compiles the libraries' sources into its own program, so a library is checked again in each app that uses it, up to 8 times.
   - Nothing is incremental, and it runs two workspaces at a time.
5. **Build, 27 s.** Two games at a time; Solitaire's Vite build finishes last. Small, but it repeats in the `docker` job.
6. **Set-up and install, 24 s.** No Yarn or Corepack cache. The Corepack download is the step that failed with `ENETUNREACH`.

All six share one cause: a single job runs them in sequence on one 4-vCPU runner. The job's time is their sum, and a test failure shows only after lint and typecheck have finished.

## Recommendations

Splitting `verify` into parallel jobs is the one change that cuts the wait from 13 minutes to about 3. The other changes each save seconds or remove a cause of red runs. Savings marked "Measured" come from the devbox held to 4 cores with `CI=true`; the rest are estimated from CI's logs.

| #   | Change                                                                                                                                                                                               | What it saves                                                                                                                                                                                                 | Effort | Note                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Split `verify` into parallel jobs: lint, typecheck, 3 test shards (Solitaire and Brick Breaker; Asteroid Breaker and Brick Fuzz Pop; the other 10), and build plus layout. `promote` needs them all. | Wait from 13 min to about 3. The longest shard should take about 128 s on 4 cores (the two suites run alone took 68 s and 60 s), plus about 35 s of set-up. A failing test would show at about 3 min, not 11. | Medium | 6 runners per push plus `docker`. Free for a public repository, under the 20-job limit. Each workspace's suite stays whole, so coverage floors are unchanged. |
| 2   | In the test phase, start Solitaire first, and give a heavy suite all 4 workers when it runs alone                                                                                                    | Measured: test phase 408 s to 308 s. Solitaire alone took 51 s with 4 workers, against 263 s with 1.                                                                                                          | Small  | Helps whether or not #1 lands, and helps local `yarn test`. Yarn starts workspaces in alphabetical order today.                                               |
| 3   | Give the four tests at 3.5 to 4.8 s a timeout of their own with a reason, as Brick Fuzz Pop's `SIM_TIMEOUT_MS` does. Cut the cost of `eslint.spec` and Sudoku's `bank.spec`.                         | Half of the 8 failed attempts were these timeouts                                                                                                                                                             | Small  | A raised limit can hide a real slowdown, so keep each in a named constant. More CPU per suite (#1, #2) also widens the margin.                                |
| 4   | Layout check: raise Chrome's 15 s launch limit and give it its own job. Split it one game per runner if it becomes the longest job.                                                                  | Removes the launch failure. Estimated 92 s to about 55 s per runner, since Brick Breaker alone took 54 s on 4 cores.                                                                                          | Small  | `LAUNCH_TIMEOUT_MS` in `lib/dev/src/chrome.ts`                                                                                                                |
| 5   | Run Prettier beside ESLint, with `--experimental-cli` and its cache kept by `actions/cache`                                                                                                          | 24 s on CI. Measured on 4 cores: 25 s cold, 0.8 s with the cache, against 33 s.                                                                                                                               | Small  | The CLI is experimental, so check it reports the same problems as the classic one first                                                                       |
| 6   | Cache Yarn's packages and the Yarn binary, or vendor Yarn through `yarnPath`                                                                                                                         | 5 to 10 s per job, and no more `ENETUNREACH` from Corepack                                                                                                                                                    | Small  | Restore with `actions/cache`, not `setup-node`'s `cache: yarn`, as the `github-actions-ci-cd` skill says                                                      |
| 7   | Run only lint for pushes that change nothing but `docs/` and Markdown                                                                                                                                | 12 min on each of 6 of the last 48 pushes; also keeps flaky tests off docs commits such as 1ba33047                                                                                                           | Medium | `promote` must still run. Compare with the last green commit, not the previous push.                                                                          |
| 8   | `tsc --incremental` with `.tsbuildinfo` cached, for the spec, Node and scripts passes                                                                                                                | 10 to 20 s of typecheck. Measured Nov 7: 2.1 s warm against 5.1 s cold per pass.                                                                                                                              | Medium | `ngc` gains nothing. Off the critical path once #1 lands.                                                                                                     |
| 9   | Drop the HTML coverage report on CI                                                                                                                                                                  | A few seconds per workspace                                                                                                                                                                                   | Small  | Keep it locally, where it is read                                                                                                                             |
| 10  | Dependabot PRs: run `yarn dedupe` on them in a workflow, or limit Dependabot to security updates                                                                                                     | 13 red PRs, and about 106 runner-minutes a weekly cycle on PRs whose updates are applied by hand                                                                                                              | Medium | A push with `GITHUB_TOKEN` doesn't trigger workflows, so this needs a GitHub App token                                                                        |

Not recommended: ESLint's `--cache` on CI. Its cache keys on each file alone, but the type-aware rules read other files' types, so a file whose imports changed could pass unchecked. It is safe for local runs.

## Appendix

Everything behind the figures is on the devbox in `/home/dev/Projects/personal/ci-audit-2026-11-14/`, outside the repository. CI times vary 15 to 20% between runs of the same commit, so read single-run figures as ±10%.

- `data/runs.json`, `data/jobs-<run>.json`, `data/jobs-flat.json`: the 100 runs and every job attempt, from the Actions API.
- `data/ci-phases.csv`, `data/ci-workspace-tests.csv`, `data/ci-slow-tests.csv`: phases, per-workspace test times and slow tests, parsed from the 26 job logs in `logs/success/`.
- `data/failures.json`, `data/failures.md`: every failed or cancelled attempt, with logs in `logs/failures/`.
- `logs/local/native-24/`, `logs/local/ci-4core/`, `logs/local/experiments/`: the local runs, each phase's full output.
- `scripts/`: the scripts that fetch the runs, parse the logs and run the benchmarks, and `chrome-swiftshader.sh`, which starts Chrome drawing WebGL in software as the runner's does.

```bash
scripts/local-bench.sh native-24
CI=true CHROME_PATH=$PWD/scripts/chrome-swiftshader.sh taskset -c 0-3 scripts/local-bench.sh ci-4core
CI=true taskset -c 0-3 scripts/experiments.sh
```

Test-phase experiments on 4 cores with `CI=true`, compared with 408 s for the test phase as CI runs it:

| Variant                                                       | Seconds |
| ------------------------------------------------------------- | ------: |
| Solitaire first on a lane of its own, the other 13 on 3 lanes |     308 |
| Asteroid Breaker alone, 4 workers                             |      68 |
| Brick Fuzz Pop alone, 4 workers                               |      60 |
| Solitaire alone, 4 workers                                    |      51 |
| Brick Breaker alone, 4 workers                                |      50 |
| The other 10 workspaces, 4 lanes of 1 worker                  |     100 |

Runs cited, newest first:

| Commit   | Date   | Run                                                                              | Cited for                                                |
| -------- | ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 51738832 | Nov 14 | [43636815179](https://github.com/fuzzley/fuzzley-games/actions/runs/43636815179) | Latest green run: the pipeline map and the test timeline |
| 11567498 | Nov 14 | [43635076641](https://github.com/fuzzley/fuzzley-games/actions/runs/43635076641) | Corepack `ENETUNREACH`, green on attempt 2               |
| 1ba33047 | Nov 14 | [43633226652](https://github.com/fuzzley/fuzzley-games/actions/runs/43633226652) | Brick Breaker autopilot timeout                          |
| 3c5aff52 | Nov 14 | [43629753240](https://github.com/fuzzley/fuzzley-games/actions/runs/43629753240) | The 60 s Cleared wait, layout check 83 s                 |
| a3db2abd | Nov 14 | [43626533027](https://github.com/fuzzley/fuzzley-games/actions/runs/43626533027) | Cleared card not shown, 2 attempts                       |
| 67f71c6c | Nov 14 | [43571829430](https://github.com/fuzzley/fuzzley-games/actions/runs/43571829430) | Chrome launch timeout, green on attempt 2                |
| 0f5d7360 | Nov 11 | [43105446129](https://github.com/fuzzley/fuzzley-games/actions/runs/43105446129) | `eslint.spec` out of heap                                |
| 6d5e3bd9 | Nov 10 | [42867689271](https://github.com/fuzzley/fuzzley-games/actions/runs/42867689271) | First `verify:full` run                                  |
| cafce1b7 | Nov 9  | [42568328536](https://github.com/fuzzley/fuzzley-games/actions/runs/42568328536) | Snake board timeout                                      |
| 8c0d9087 | Nov 9  | [42566091575](https://github.com/fuzzley/fuzzley-games/actions/runs/42566091575) | Snake board and `viewport_scaler` timeouts               |
| 5521dce9 | Nov 8  | [42451470682](https://github.com/fuzzley/fuzzley-games/actions/runs/42451470682) | First run after 8cfe800e                                 |
| 33429cca | Nov 8  | [42428590351](https://github.com/fuzzley/fuzzley-games/actions/runs/42428590351) | Last run before 8cfe800e                                 |
| 94a5d2ab | Oct 27 | [40588683688](https://github.com/fuzzley/fuzzley-games/actions/runs/40588683688) | Baseline, 347 s                                          |
