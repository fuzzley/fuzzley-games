---
name: github-actions-ci-cd
description: The verify and update-games workflows (.github/workflows/verify.yml, update-games.yml), what they check in the frontend and the Docker image, how the games' pins move, and how both relate to the Cloud Run deploy that does not wait for them. Triggers on: github actions, workflow, ci/cd, quality gate, verify.yml, update-games.yml, docker check, games.json, game update failed.
---

# GitHub Actions CI

> What the workflows check, and what they do not stand between.

There are two workflows: `.github/workflows/verify.yml` ("Verify") and
`.github/workflows/update-games.yml` ("Update games"). Both run the same image
checks, `.github/scripts/check-image.sh`. **Read the files before changing
them** — each is short, and the summary below is a guide to their intent, not
a substitute for their contents.

## Verify

Two independent jobs, on push to `main`, any pull request, or a manual
`workflow_dispatch`. A newer push to the same ref cancels a run in progress.

1. **`verify`** — checkout, Node from `.node-version`, a check that the
   `Dockerfile` builds on the same major version, Corepack, an immutable
   install in `frontend/`, then `yarn verify` (lint, type-check, test,
   build). The build
   builds the games in `frontend/apps/` and fetches the ones pinned in
   `frontend/games.json` from their releases.
2. **`docker`** — builds the `Dockerfile` with `COMMIT_SHA` and runs
   `check-image.sh` on it, which serves the image with a placeholder analytics
   ID and requests its pages: the Angular routes answer with `index.html`, a
   missing file under `/assets/` is a 404, the `Cache-Control` and security
   headers match `nginx.conf.template` and `nginx/`, the site's pages carry
   the Content Security Policy and the games don't, `theme.js` sets the
   palette, `env.js` carries the ID, and `version.json` names the commit. For each game in `frontend/games.json` it checks `/play/<slug>/` is
   the game's own page with the analytics tags, never the site's
   `index.html`, with its own fingerprinted assets, and that `version.json`
   names its build: the pinned archive, or for a game built here, its
   workspace and the image's commit.

## Update games

Every 15 minutes, `frontend/tools/update-games.mjs` moves each pin in
`frontend/games.json` to the newest build its game's release names in
`latest.json`. A game built here, under `frontend/apps/`, has no pin and is
skipped: every push to `main` builds it. When a pin moves, the job commits, builds the image, runs
`check-image.sh`, and pushes to `main` only if both pass; Cloud Run deploys the
push. A failure opens a "Game update failed: <archive>" issue and pushes
nothing, and later runs skip that archive while the issue is open. Pushes made
with `GITHUB_TOKEN` start no other workflow, so `verify.yml` doesn't run on
them.

The build fails when the catalog links a game the fetched build lacks (the
`checkGameImages` plugin in `frontend/tools/vite-plugins.ts`), so a game
renamed or removed upstream shows up as one of these issues, not as a broken
link.

## Deployment Does Not Wait for Them

Cloud Run builds and deploys the `Dockerfile` from every push to `main` through
its own Cloud Build trigger (see `docs/operations.md`). Nothing in
`verify.yml` gates that, so **a red run on `main` means the broken commit is
already live**. Run
`yarn verify` in `frontend/` before pushing to `main`, or go through a pull
request.

## Principles

1. **`yarn install --immutable`.** CI must fail on a lockfile that does not
   match `package.json` rather than quietly resolving something else.
2. **Corepack before Yarn.** `corepack enable` has to run before any `yarn`
   command, or the runner's bundled Yarn 1 answers instead of the version
   `frontend/package.json` pins. If you add dependency caching, restore it
   with `actions/cache` rather than `setup-node`'s `cache: yarn`, which looks
   up Yarn's cache folder before Corepack runs.
3. **The image checks follow the server.** A new route in
   `frontend/src/app/routes.ts`, a changed header in `nginx.conf.template`
   or a new variable in `docker-entrypoint.d/40-generate-env-config.sh` gets a
   matching expectation in `check-image.sh`.
4. **One Node version.** Both workflows take Node from `.node-version`. The
   `Dockerfile` pins its own image, by version and digest, so `verify` checks
   that its major version is the same; move both together.
5. **Updates come as pull requests.** Dependabot (`.github/dependabot.yml`)
   proposes npm, GitHub Actions and Docker image updates weekly, a day after
   their release, and `verify.yml` checks each pull request. A merge to
   `main` deploys, so none merges on its own.
6. **No secrets in CI.** The workflows use a made-up measurement ID; the real
   one lives in Secret Manager and reaches only Cloud Run. Neither needs a
   token beyond its own `GITHUB_TOKEN`. Never echo a secret, and never
   `set -x` a step that handles one.

## Troubleshooting

- **`verify` failures.** Reproduce with `yarn verify` in `frontend/`.
  `yarn typecheck` runs `ngc` over `frontend/tsconfig.app.json`, then `tsc`
  over `frontend/tsconfig.spec.json`, `frontend/tsconfig.node.json` and
  `frontend/tsconfig.scripts.json`. A formatting failure in `yarn lint` is
  fixed by `yarn prettier`.
- **Install failures.** Usually a stale `frontend/yarn.lock`: run
  `yarn install` in `frontend/` and commit the lockfile.
- **`docker` failures.** The script prints the container's logs when a check
  fails. Reproduce with the build and run steps in `docs/operations.md`, then
  request the failing path with `curl -i`. The script itself needs `curl` and
  `jq`.
- **"Game update failed" issues.** Pin that archive locally in
  `frontend/games.json` (its name, commit and SHA-256 are in the release's
  `latest.json`) and run `yarn build` to see the failure.
- **A game's update never arrives.** GitHub turns scheduled workflows off
  after 60 days without activity; check that Update games is enabled under
  Actions.
