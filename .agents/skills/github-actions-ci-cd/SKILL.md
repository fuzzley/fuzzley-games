---
name: github-actions-ci-cd
description: The Verify workflow (.github/workflows/verify.yml): its jobs and what each checks, the caches they restore, the docs-only run, and how its promote job gates the deploy by moving the live branch. Triggers on: github actions, workflow, ci/cd, verify.yml, changes-code.sh, actions/cache, dependabot, docker image check, check-image.sh, nginx headers, games.json, deploy, live branch, rollback.
---

# GitHub Actions CI

> What the workflow checks, and how a commit passes it to go live.

There is one workflow, `.github/workflows/verify.yml` ("Verify"), and the
image checks it runs, `.github/scripts/check-image.sh`. **Read the files
before changing them** — each is short, and the summary below is a guide to
their intent, not a substitute for their contents.

## Verify

On push to `main`, any pull request, or a manual `workflow_dispatch`, each
check on a runner of its own, so they run side by side, and one job that
waits for them all. A newer push to the same ref cancels a run in
progress. Each job but `changes`, `docker` and `promote` sets up the
frontend with the composite action `.github/actions/setup-frontend`, handed
the workflow's `COREPACK_VERSION`: Node from `.node-version`, that Corepack,
the Yarn it downloads and Yarn's package cache, each restored with
`actions/cache`, the lockfile deduped on a Dependabot npm pull request
(principle 6), and an immutable install in `frontend/`.

1. **`changes`** — runs `.github/scripts/changes-code.sh`, which says
   whether anything but Markdown and `docs/` changed, a moved file by both
   its paths: since `live`, the last commit of `main` that passed, for a
   push, and since the base, for a pull request, whose push to `main` is
   compared with `live` again. Where nothing else did, only `lint` runs; a
   manual run, or a base it can't compare with, checks everything.
2. **`lint`** — a check that the `Dockerfile` builds on the same major
   version of Node and installs the same Corepack as the workflow, then
   `yarn lint`, with Prettier's cache restored from the last run.
3. **`typecheck`** — `yarn typecheck`: `ngc` on TypeScript 6 over each
   Angular workspace's app or library, and every other pass on TypeScript
   7 (`@fz/dev`'s `tsc7`), which checks the whole of each cold faster than
   TypeScript 6 checked what changed, so nothing is cached.
4. **`test`** — the tests with each workspace's coverage floors
   (`test:coverage`), through `frontend/tools/run-tests.mjs`, in three
   jobs of about the same length: Asteroid Breaker and Brick Breaker, then
   Brick Fuzz Pop and the Solitaire Collection, each pair one suite after
   the other with all four cores (`--only … --jobs 1`), and every other
   workspace four at a time (`--except …`), where a workspace added later
   lands.
5. **`build`** — `yarn build`, which builds the games in
   `frontend/games/` and copies the ones `frontend/site/games.json` lists
   into the site, then `yarn check:layout`, which opens each game's build
   that has a layout check in the runner's Chrome, at a roomy window and a
   large and a small phone, upright and on its side (`@fz/dev/layout`).
6. **`docker`** — builds the `Dockerfile` with `COMMIT_SHA` and runs
   `check-image.sh` on it, which serves the image with a placeholder
   analytics ID and requests its pages: the Angular routes answer with
   `index.html`, a missing file under `/assets/` is a 404, the
   `Cache-Control` and security headers match `nginx.conf.template` and
   `nginx/`, the site's pages carry the Content Security Policy and the
   games don't, `theme.js` sets the palette, `env.js` carries the ID,
   `version.json` names the commit, and neither nginx's 404 nor its
   `Server` header names its version. For each game in
   `frontend/site/games.json` it checks `/play/<slug>/` is the game's own
   page with the analytics tags, never the site's `index.html`, with its
   own fingerprinted assets and the site's icons, and that `version.json`
   names its build: its workspace and the image's commit.
7. **`promote`** — on `main` only (a push or a dispatch), once every check
   passes, or `lint` alone where `changes` found only Markdown and `docs/`:
   moves `live`, the branch Cloud Run deploys, to the run's commit with a
   plain push. It only moves `live` forward: a run that finishes after a
   newer one leaves `live` alone, and it fails if `live` holds commits
   `main` doesn't.

The build fails when the catalog links a game a build lacks, or names one
differently (the `checkGameImages` and `checkGameManifests` plugins in
`frontend/site/tools/vite-plugins.ts`), so a game renamed or removed in its
workspace fails `build` rather than shipping a broken link.

`yarn verify:full` and `yarn check:layout` run the same checks on one
machine, one after another.

## Deployment Waits for Verify

Cloud Run builds and deploys the `Dockerfile` from every push to `live`,
through its own Cloud Build trigger (see `docs/operations.md`), and only
`promote` moves `live`. So **a red run on `main` means the commit never went
live**: the site stays on the last commit that passed, and the next commit
that passes takes everything before it live with it. The games are built in
the same commit, so they go live with it too. Pushes made with
`GITHUB_TOKEN` start Cloud Build's trigger, which listens to GitHub's push
events, though not other workflows.

To roll back, revert on `main`. Moving `live` back by hand
(`git push --force origin <commit>:live`) is faster, but the next run that
passes on `main` moves it forward again.

## Principles

1. **`yarn install --immutable`.** CI must fail on a lockfile that does not
   match `package.json` rather than quietly resolving something else. The
   one exception is a Dependabot npm pull request's lockfile, deduped
   before the install (principle 6); the commit that lands the update is
   checked on `main` with `--immutable` like any other.
2. **Corepack before Yarn.** `corepack enable` has to run before any `yarn`
   command, or the runner's bundled Yarn 1 answers instead of the version
   `frontend/package.json` pins. Node 26 no longer bundles Corepack, so
   each job installs the version the `Dockerfile` does; move both together.
   Caches are restored with `actions/cache`, never `setup-node`'s
   `cache: yarn`, which looks up Yarn's cache folder before Corepack runs.
3. **A cache only saves time.** Each one the jobs restore is keyed on
   everything its result reads: Corepack's Yarn on its version, Yarn's
   packages on the lockfile, Prettier's on each file's contents and
   Prettier's options, so the last run's serves any commit and a stale
   entry is a miss, never a pass. ESLint's `--cache` keys a file's result
   on that file alone, whatever its strategy, while the type-aware rules
   read the files it imports, so it doesn't belong on CI.
4. **The image checks follow the server.** A new route in
   `frontend/site/src/app/routes.ts`, a changed header in `nginx.conf.template`
   or a new variable in `docker-entrypoint.d/40-generate-env-config.sh` gets a
   matching expectation in `check-image.sh`.
5. **One Node version.** The workflow takes Node from `.node-version`. The
   `Dockerfile` pins its own image, by version and digest, so `lint` checks
   that its major version is the same; move both together.
6. **Updates come as pull requests.** Dependabot (`.github/dependabot.yml`)
   proposes npm, GitHub Actions and Docker image updates weekly, a day after
   their release, its npm updates in three pull requests (Angular's
   packages, the lint and test tools, and every other package), and
   `verify.yml` checks each pull request. Dependabot doesn't run
   `yarn dedupe`, so `setup-frontend` dedupes the lockfile of an npm pull
   request Dependabot opened before it installs, and each job but `docker`,
   which builds the image from the lockfile as Dependabot wrote it, checks
   the update as it would land. The pull request keeps Dependabot's
   lockfile, so where the dedupe changed it, `lint` warns that merging it
   would fail lint on `main`, and the update lands by hand, deduped, in one
   commit on `main`. A merge to `main` deploys once it passes, so none
   merges on its own.
7. **No secrets in CI.** The workflows use a made-up measurement ID; the real
   one lives in Secret Manager and reaches only Cloud Run. It needs no
   token beyond its own `GITHUB_TOKEN`. Never echo a secret, and never
   `set -x` a step that handles one.

## Troubleshooting

- **A check's failure.** Reproduce it in `frontend/` with the job's own
  command (`yarn lint`, `yarn typecheck`, the `test` job's
  `node tools/run-tests.mjs test:coverage …`, or `yarn build` and then
  `yarn check:layout`, which needs Chrome: `CHROME_PATH`, or the usual
  install location), or all of them with `yarn verify:full` and
  `yarn check:layout`. CI's runner has four cores, so
  `CI=true taskset -c 0-3 <command>` on Linux comes closest to it. CI's
  Chrome draws WebGL in software, so a layout check that fails there and
  passes here wants a Chrome that does too: a script that runs it with
  `--disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader`,
  handed over as `CHROME_PATH`, and `taskset -c 0` standing in for a slow
  runner.
  `yarn typecheck` runs `tsc7` over `frontend/tsconfig.scripts.json` (the
  `.agents` scripts), then each workspace's, such as the site's: `ngc`
  over `frontend/site/tsconfig.app.json`, then `tsc7` over
  `frontend/site/tsconfig.spec.json`, `frontend/site/tsconfig.node.json` and
  `frontend/site/tsconfig.scripts.json`. A formatting failure in `yarn lint`
  is fixed by `yarn prettier`.
- **Install failures.** Usually a stale `frontend/yarn.lock`: run
  `yarn install` in `frontend/` and commit the lockfile.
- **`docker` failures.** The script prints the container's logs when a check
  fails. Reproduce with the build and run steps in `docs/operations.md`, then
  request the failing path with `curl -i`. The script itself needs `curl` and
  `jq`.
