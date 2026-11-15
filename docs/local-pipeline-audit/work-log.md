# Work log: acting on the local pipeline audit

The log of the work that acts on [report.md](report.md), the audit of Nov 14, 2026 at `main` e6740e04. It records each change built, each commit, what each review found and how it was answered, and what was measured. It is written as the work goes, so a session that picks it up starts from the last entry.

- **Branch:** `local-pipeline`, from `main` at e6740e04. It is not merged until the user asks.
- **Commits:** each goes through the `commit-review-process` skill.
- **CI:** no change may slow down or weaken the Verify workflow. Each change that reaches a CI job is timed there by dispatching the workflow on the branch (`gh workflow run verify.yml --ref local-pipeline`), one run at a time, and compared with main's runs. What helps only locally is turned on only where `CI` isn't `true`.
- **Measuring:** with the report's scripts, in [`scripts/`](scripts/), one at a time on a quiet devbox.

## Plan

The changes, in the order they are committed, with the report's numbers. TypeScript 7 comes before the layout check's pages because it was built first; the two touch different files.

| Step | #   | Change                                                                                                                               | Status |
| ---- | --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1    | —   | The audit's report, scripts and data                                                                                                 |        |
| 2    | 2   | TypeScript 7 for the plain `tsc` passes, with `ngc`, ESLint and Analog left on TypeScript 6                                          |        |
| 3    | 7   | Room for Brick Fuzz Pop's solver spec, which timed out under load                                                                    |        |
| 4    | 1   | The layout check's pages side by side, a few at a time                                                                               |        |
| 5    | 6   | Node's compile cache for the Vitest runs `yarn test` starts, locally                                                                 |        |
| 6    | 3   | `yarn verify:changed`: only the workspaces a change reaches, each workspace's steps side by side, under a budget of cores and memory |        |
| 7    | —   | The pipeline timed again, locally and on CI, and the report brought up to date                                                       |        |

What the plan leaves out, and why:

- **#4, one scheduler for the full run.** Step 6 builds the budget of cores and memory, but only for the runs `yarn verify:changed` starts. Plain `yarn verify`, and the `yarn verify:full` that merging into `main` runs, keep their `foreach` chain. Moving them is worth doing once step 6's runner has been used for a while, since the merge gate should run on a tool that has been tried.
- **#5, keeping each passed step's hash.** A key that misses an input passes what it shouldn't. With step 6, a rerun after a one-game change is already short, so the cache would save less than the report's model assumed. It is worth revisiting after step 7's timings.
- **#6, the rest of it.** Step 5 builds the compile cache. `yarn test -- --changed` and ESLint's `--concurrency` for one game alone are documented with step 6, not built.
- **#8, Analog's `fastCompile` for builds.** It is a new compile path for what ships, so trying it means comparing the bundles and checking the image. That is a separate change, and the user asked for the largest gains now.

## Log

### 2026-11-14: the audit's report, scripts and data (step 1)

`docs(local-pipeline-audit): add the audit of the local pipeline, its scripts and its data`
(step 1): `report.md`, this log, the scripts each figure came from in [`scripts/`](scripts/), and their tables in [`data/`](data/). The raw logs stay outside the repository, under `local-pipeline-audit-2026-11-14/logs/`, beside the checkout.

The first review, and the answers. Every figure it touched was measured again at e6740e04 with the scripts as committed, one script at a time on a quiet devbox, with this branch's later changes stashed:

1. **The model of skipping unchanged workspaces used each workspace's times from the full run, contended by twelve others, so its median was Brick Fuzz Pop's chain at 131 s where the report measured 85 s.** Fixed. [`scripts/alone.sh`](scripts/alone.sh) times each workspace's steps with nothing else running ([`data/workspace-times-alone.tsv`](data/workspace-times-alone.tsv)), and `estimate.mjs` reads those, takes the measured 171 s for a commit that reaches every workspace, and adds the site's build where the site itself is in the set, not only a game. The median commit now models at 102 s, and the report says the model errs short where several workspaces run, since it leaves out their contention.
2. **`history.mjs` counted the commits from before the site became a workspace (193fc133) as reaching everything, and `.prettier*` as a root input.** Fixed: it starts at 193fc133, 809 commits, and classes `.prettier*` as formatting, which runs every time. The shares are 44% one workspace, 20% two to thirteen, 17% none, 11% a library every workspace depends on and 7% the root's config or lockfile, 4.6 workspaces a commit on average.
3. **`one-game.sh` printed `date`'s exit code, not the step's.** Fixed: `timed`, in [`scripts/env.sh`](scripts/env.sh), which every shell script sources, takes `rc=$?` straight after the command. Its logs go under `$LOGS/one-game-<game>/`, and its two tables are in `data/`. In the re-run, the side-by-side run's root check exited 1 because Prettier found `report.md` unformatted while it was being edited. Prettier is the check's last part, and every part before it passed, so its time stands; the same goes for lint's exit in both overlap runs.
4. **Recommendation #2 said CI's typecheck runs cold, which it doesn't, and left the `tsc7` design open.** Fixed: the report says CI restores TypeScript 6's build info, which the CI audit found saved nothing, so that cache step can go. It chooses the design: `@fz/dev` gives every workspace a `tsc7` binary, which a scratch Yarn project showed leaves `tsc` on 6. Rewriting `frontend/AGENTS.md`'s Type Checking entry and removing the cache step belong to step 2, which makes the change.
5. **Several figures had no script or data behind them, and the shell scripts hardcoded their paths.** Fixed. These scripts were added, each re-run with its table in `data/`:
   - `ts7-compare.sh`, for TypeScript 7 against 6;
   - `eslint-concurrency.sh`, for ESLint's `--concurrency`;
   - `fast-compile.sh`, with its two configs in `fast-compile/`;
   - `layout-pages.sh`, with the experiment's `layout-pages.patch` and `chrome-swiftshader.sh`, CI's software WebGL;
   - `workspace-times.mjs`, which writes `workspace-times-warm.tsv` from the bench logs.

   `overlap.sh` writes the comment row, the `whole` row and the least free memory that its tables held, and both of its runs were measured again with it: 121 s with 0.7 GB free at Yarn's defaults, where the solver spec's timeout didn't recur, and 120 s with 4.2 GB free with fewer at once. The shell scripts find the repository through git, and take `YARN` and `LOGS` from the environment where given.

6. **Recommendation #5's cache key missed the inputs git doesn't track.** Fixed: the key adds the Node that runs and, for the layout check, Chrome's version, in the table and the design.
7. **The plan didn't say what it leaves out.** Fixed, under the plan above. Step 6 says it takes #4's budget for its own runs only.
8. **Smaller points.** All fixed:
   - `history.mjs` imports `node:fs` once.
   - The `.prettier*` test replaces the two it made redundant.
   - Every function of the `.mjs` scripts has its JSDoc types.
   - Method says `bench.sh` times with bash's `time` and the other scripts with `date`.
   - Recommendation #1 says "on 4 local cores with CI's software WebGL".
   - The big games' share reads 39–51%.
   - The Sudoku spec is named: `bank.spec.ts`, split into quarters in 6b2808a0.
   - The InfoQ article, the TypeScript 7.0 announcement, typescript-eslint's FAQ and Oxlint's post are linked.

The second review, and the answers. It found the first review's points 1–4 and 7 answered, and 5, 6 and 8 partly open:

1. **`layout-pages.sh` timed "all at once" whether or not its patch applied,** which, once step 4 rewrites those loops, would record the shipped code as the experiment. Fixed: it stops, saying so, where the patch doesn't apply.
2. **Recommendation #5's key still missed what `dist/` holds and what is installed.** A branch switch could skip a build and leave the layout check and the site's build reading another branch's `dist/`, and a pass made before `yarn install` would be kept under the new lockfile. Fixed in the table and the design: a build is never skipped, or the layout check and the site's build key on `dist/`'s contents, and the key takes `node_modules/.yarn-state.yml` as well as the lockfile.
3. **Recommendation #4 budgets cores, but its own evidence is about memory.** Fixed: the design gives each task a memory claim as well, citing the free memory of the runs that timed out and passed and ESLint's 1.8 and 4.0 GB. Step 6 takes the same budget, as the plan now says.
4. **The summary still said "a 4-core runner".** Fixed: "on 4 local cores with CI's software WebGL".
5. **Figures labelled measured that weren't.** Fixed: `yarn typecheck`'s 8 s is marked est., from the passes run twelve at a time; #4's 120 s is "measured with `overlap.sh`"; and its "about 100 s" is dropped for "between that and the CPU floor of 76 s", which is all the report can stand behind.
6. **Figures with no data behind them.** Fixed:
   - `test-startup.mjs` reads each suite's start-up from `bench.sh`'s test log ([`data/test-startup.tsv`](data/test-startup.tsv)), giving the 87 of 266 lane-seconds; the Angular workspaces' range reads 5–11 s, as it shows.
   - Sudoku's 7.3 s and 2.9 s come from `fast-compile.sh`'s run without `fastCompile`.
   - `fast-compile.sh` lists both builds' files side by side ([`data/fast-compile-assets.tsv`](data/fast-compile-assets.tsv)): the same 17 files, only the main chunk 2 KB apart. That part was run on the builds the re-run kept.
   - The first overlap runs' tables are kept as `overlap-1-first.tsv` and `overlap-3-first.tsv`, from the stash that held them.
   - Asteroid Breaker's per-file times are listed under Method's "By hand", and the compilation API's six failures under "Read off the raw logs".
7. **An estimate of Asteroid Breaker's tests on 24 workers contradicted the alone run's 29 s.** Fixed: the report cites the 29 s, and says something beyond the files' sum sets its time, which the audit didn't look into.
8. **`history.mjs` read the working tree and ran to `main`, so it would count other commits once this branch merges.** Fixed: it takes `[since] [until]`, 193fc133 and e6740e04 unless given, and reads the workspaces as `until` declares them; its output is the same rows, only the names in a row in git's order. Its header says "all" is any other file of `frontend/`'s but the root's own scripts and configs.
9. **The report called the changed-only run `yarn verify --changed`.** Fixed: `yarn verify:changed`, as a script of its own, since Yarn would hand `--changed` to `yarn verify`'s last command alone; plain `yarn verify` keeps its chain until #4.

The smaller points, all fixed: the most-changed workspaces are the three Breaker games, at 46–51%, with Snake and Solitaire at 39–40%; the model's shares have a decimal, 18.5% within 30 s and 18.5% at the full time, the 11.1% and 7.4% that reach every workspace; and `one-game.sh`, the summary and the side-by-side finding name the root's checks it runs, its skills, constraints, dedupe and Prettier checks, not its ESLint or `tsc`.
