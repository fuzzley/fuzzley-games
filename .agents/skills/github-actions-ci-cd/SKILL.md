---
name: github-actions-ci-cd
description: The Verify workflow (.github/workflows/verify.yml), what it checks in the frontend and the Docker image, and how its promote job gates the Cloud Run deploy by moving the live branch. Triggers on: github actions, workflow, ci/cd, quality gate, verify.yml, check-image.sh, docker check, games.json, deploy, live branch, rollback.
---

# GitHub Actions CI

> What the workflow checks, and how a commit passes it to go live.

There is one workflow, `.github/workflows/verify.yml` ("Verify"), and the
image checks it runs, `.github/scripts/check-image.sh`. **Read the files
before changing them** — each is short, and the summary below is a guide to
their intent, not a substitute for their contents.

## Verify

Two independent jobs and one that waits for both, on push to `main`, any pull
request, or a manual `workflow_dispatch`. A newer push to the same ref cancels
a run in progress.

1. **`verify`** — checkout, Node from `.node-version`, a check that the
   `Dockerfile` builds on the same major version and installs the same
   Corepack as the job's `COREPACK_VERSION`, that Corepack, an immutable
   install in `frontend/`, then `yarn verify` (lint, type-check, test,
   build). The build builds the games in `frontend/games/` and copies the
   ones `frontend/site/games.json` lists into the site. Then
   `yarn check:layout` opens each game's build that has a layout check in
   the runner's Chrome, at a roomy window and a large and a small phone,
   upright and on its side (`@fz/dev/layout`).
2. **`docker`** — builds the `Dockerfile` with `COMMIT_SHA` and runs
   `check-image.sh` on it, which serves the image with a placeholder analytics
   ID and requests its pages: the Angular routes answer with `index.html`, a
   missing file under `/assets/` is a 404, the `Cache-Control` and security
   headers match `nginx.conf.template` and `nginx/`, the site's pages carry
   the Content Security Policy and the games don't, `theme.js` sets the
   palette, `env.js` carries the ID, and `version.json` names the commit. For each game in `frontend/site/games.json` it checks `/play/<slug>/` is
   the game's own page with the analytics tags, never the site's
   `index.html`, with its own fingerprinted assets and the site's icons,
   and that `version.json` names its build: its workspace and the image's
   commit.
3. **`promote`** — on `main` only (a push or a dispatch), once both jobs pass:
   moves `live`, the branch Cloud Run deploys, to the run's commit with a
   plain push. It only moves `live` forward: a run that finishes after a newer
   one leaves `live` alone, and it fails if `live` holds commits `main`
   doesn't.

The build fails when the catalog links a game a build lacks, or names one
differently (the `checkGameImages` and `checkGameManifests` plugins in
`frontend/site/tools/vite-plugins.ts`), so a game renamed or removed in its
workspace fails `verify` rather than shipping a broken link.

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
   match `package.json` rather than quietly resolving something else.
2. **Corepack before Yarn.** `corepack enable` has to run before any `yarn`
   command, or the runner's bundled Yarn 1 answers instead of the version
   `frontend/package.json` pins. Node 26 no longer bundles Corepack, so the
   job installs the version the `Dockerfile` does; move both together. If
   you add dependency caching, restore it with `actions/cache` rather than
   `setup-node`'s `cache: yarn`, which looks up Yarn's cache folder before
   Corepack runs.
3. **The image checks follow the server.** A new route in
   `frontend/site/src/app/routes.ts`, a changed header in `nginx.conf.template`
   or a new variable in `docker-entrypoint.d/40-generate-env-config.sh` gets a
   matching expectation in `check-image.sh`.
4. **One Node version.** The workflow takes Node from `.node-version`. The
   `Dockerfile` pins its own image, by version and digest, so `verify` checks
   that its major version is the same; move both together.
5. **Updates come as pull requests.** Dependabot (`.github/dependabot.yml`)
   proposes npm, GitHub Actions and Docker image updates weekly, a day after
   their release, and `verify.yml` checks each pull request. A merge to
   `main` deploys once it passes, so none merges on its own.
6. **No secrets in CI.** The workflows use a made-up measurement ID; the real
   one lives in Secret Manager and reaches only Cloud Run. It needs no
   token beyond its own `GITHUB_TOKEN`. Never echo a secret, and never
   `set -x` a step that handles one.

## Troubleshooting

- **`verify` failures.** Reproduce with `yarn verify` in `frontend/`, and
  a layout check's with `yarn check:layout` after it, which needs Chrome
  (`CHROME_PATH`, or the usual install location).
  `yarn typecheck` runs `tsc` over `frontend/tsconfig.scripts.json` (the
  `.agents` scripts), then each workspace's, such as the site's: `ngc`
  over `frontend/site/tsconfig.app.json`, then `tsc` over
  `frontend/site/tsconfig.spec.json`, `frontend/site/tsconfig.node.json` and
  `frontend/site/tsconfig.scripts.json`. A formatting failure in `yarn lint`
  is fixed by `yarn prettier`.
- **Install failures.** Usually a stale `frontend/yarn.lock`: run
  `yarn install` in `frontend/` and commit the lockfile.
- **`docker` failures.** The script prints the container's logs when a check
  fails. Reproduce with the build and run steps in `docs/operations.md`, then
  request the failing path with `curl -i`. The script itself needs `curl` and
  `jq`.
