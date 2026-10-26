---
name: github-actions-ci-cd
description: The verify and update-games workflows (.github/workflows/verify.yml, update-games.yml), what they check in the frontend and the Docker image, how the games' pins move, and how Verify's promote job gates the Cloud Run deploy by moving the live branch. Triggers on: github actions, workflow, ci/cd, quality gate, verify.yml, update-games.yml, docker check, games.json, game update failed, deploy, live branch, rollback.
---

# GitHub Actions CI

> What the workflows check, and how a commit passes them to go live.

There are two workflows: `.github/workflows/verify.yml` ("Verify") and
`.github/workflows/update-games.yml` ("Update games"). Both run the same image
checks, `.github/scripts/check-image.sh`. **Read the files before changing
them** — each is short, and the summary below is a guide to their intent, not
a substitute for their contents.

## Verify

Two independent jobs and one that waits for both, on push to `main`, any pull
request, or a manual `workflow_dispatch`. A newer push to the same ref cancels
a run in progress.

1. **`verify`** — checkout, Node from `.node-version`, a check that the
   `Dockerfile` builds on the same major version, Corepack, an immutable
   install in `frontend/`, then `yarn verify` (lint, type-check, test,
   build). The build
   builds the games in `frontend/games/` and fetches the ones pinned in
   `frontend/site/games.json` from their releases.
2. **`docker`** — builds the `Dockerfile` with `COMMIT_SHA` and runs
   `check-image.sh` on it, which serves the image with a placeholder analytics
   ID and requests its pages: the Angular routes answer with `index.html`, a
   missing file under `/assets/` is a 404, the `Cache-Control` and security
   headers match `nginx.conf.template` and `nginx/`, the site's pages carry
   the Content Security Policy and the games don't, `theme.js` sets the
   palette, `env.js` carries the ID, and `version.json` names the commit. For each game in `frontend/site/games.json` it checks `/play/<slug>/` is
   the game's own page with the analytics tags, never the site's
   `index.html`, with its own fingerprinted assets, and that `version.json`
   names its build: the pinned archive, or for a game built here, its
   workspace and the image's commit.
3. **`promote`** — on `main` only (a push or a dispatch), once both jobs pass:
   moves `live`, the branch Cloud Run deploys, to the run's commit with a
   plain push. It only moves `live` forward: a run that finishes after a newer
   one leaves `live` alone, and it fails if `live` holds commits `main`
   doesn't.

## Update games

Both games are built here now, so no game is pinned and the workflow is
turned off under Actions; it matters again only if a game built elsewhere is
pinned. Every 15 minutes, `frontend/site/tools/update-games.mjs` moves each pin in
`frontend/site/games.json` to the newest build its game's release names in
`latest.json`. A game built here, under `frontend/games/`, has no pin and is
skipped: every push to `main` builds it. When a pin moves, the job commits,
builds the image, runs `check-image.sh`, and pushes to `main` only if both
pass. A failure opens a "Game update failed: <archive>" issue and pushes
nothing, and later runs skip that archive while the issue is open. Pushes made
with `GITHUB_TOKEN` start no other workflow, so after pushing, the job runs
`verify.yml` on `main` with `gh workflow run` (a dispatch is the exception to
that rule), and Verify's `promote` job deploys it.

The build fails when the catalog links a game the fetched build lacks (the
`checkGameImages` plugin in `frontend/site/tools/vite-plugins.ts`), so a game
renamed or removed upstream shows up as one of these issues, not as a broken
link.

## Deployment Waits for Verify

Cloud Run builds and deploys the `Dockerfile` from every push to `live`,
through its own Cloud Build trigger (see `docs/operations.md`), and only
`promote` moves `live`. So **a red run on `main` means the commit never went
live**: the site stays on the last commit that passed, and the next commit
that passes takes everything before it live with it. Pushes made with
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
   `frontend/package.json` pins. If you add dependency caching, restore it
   with `actions/cache` rather than `setup-node`'s `cache: yarn`, which looks
   up Yarn's cache folder before Corepack runs.
3. **The image checks follow the server.** A new route in
   `frontend/site/src/app/routes.ts`, a changed header in `nginx.conf.template`
   or a new variable in `docker-entrypoint.d/40-generate-env-config.sh` gets a
   matching expectation in `check-image.sh`.
4. **One Node version.** Both workflows take Node from `.node-version`. The
   `Dockerfile` pins its own image, by version and digest, so `verify` checks
   that its major version is the same; move both together.
5. **Updates come as pull requests.** Dependabot (`.github/dependabot.yml`)
   proposes npm, GitHub Actions and Docker image updates weekly, a day after
   their release, and `verify.yml` checks each pull request. A merge to
   `main` deploys once it passes, so none merges on its own.
6. **No secrets in CI.** The workflows use a made-up measurement ID; the real
   one lives in Secret Manager and reaches only Cloud Run. Neither needs a
   token beyond its own `GITHUB_TOKEN`. Never echo a secret, and never
   `set -x` a step that handles one.

## Troubleshooting

- **`verify` failures.** Reproduce with `yarn verify` in `frontend/`.
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
- **"Game update failed" issues.** Pin that archive locally in
  `frontend/site/games.json` (its name, commit and SHA-256 are in the release's
  `latest.json`) and run `yarn build` to see the failure.
- **A game's update never arrives.** GitHub turns scheduled workflows off
  after 60 days without activity; check that Update games is enabled under
  Actions.
