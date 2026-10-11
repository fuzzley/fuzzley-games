---
name: github-actions-ci-cd
description: The verify workflow (.github/workflows/verify.yml), what it checks in the frontend and the Docker image, and how it relates to the Cloud Run deploy that does not wait for it. Triggers on: github actions, workflow, ci/cd, quality gate, verify.yml, docker check.
---

# GitHub Actions CI

> What the workflow checks, and what it does not stand between.

The workflow is `.github/workflows/verify.yml` ("Verify"). **Read it before
changing it** — it is one short file, and the summary below is a guide to its
intent, not a substitute for its contents.

## Shape of the Pipeline

Two independent jobs, on push to `main`, any pull request, or a manual
`workflow_dispatch`. A newer push to the same ref cancels a run in progress.

1. **`verify`** — checkout, Node 26, Corepack, an immutable install in
   `frontend/`, then `yarn verify` (type-check, test, build).
2. **`docker`** — builds the `Dockerfile` with `COMMIT_SHA`, runs the image
   with a placeholder analytics ID, and requests its pages: the Angular routes
   answer with `index.html`, a missing file under `/assets/` is a 404, the
   `Cache-Control` headers match `nginx.conf.template`, `env.js` carries the
   ID, and `version.json` names the commit.

## Deployment Does Not Wait for It

Cloud Run builds and deploys the `Dockerfile` from every push to `main` through
its own Cloud Build trigger (see `README.md`). Nothing in this workflow gates
that, so **a red run on `main` means the broken commit is already live**. Run
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
3. **The Docker checks follow the server.** A new route in
   `frontend/src/app/app.routes.ts`, a changed header in `nginx.conf.template`
   or a new variable in `docker-entrypoint.d/40-generate-env-config.sh` gets a
   matching expectation in the `docker` job.
4. **No secrets in CI.** The workflow uses a made-up measurement ID; the real
   one lives in Secret Manager and reaches only Cloud Run. Never echo a secret,
   and never `set -x` a step that handles one.

## Troubleshooting

- **`verify` failures.** Reproduce with `yarn verify` in `frontend/`.
  `yarn typecheck` runs `ngc` over `frontend/tsconfig.app.json`.
- **Install failures.** Usually a stale `frontend/yarn.lock`: run
  `yarn install` in `frontend/` and commit the lockfile.
- **`docker` failures.** The job prints the container's logs when a check
  fails. Reproduce with the build and run steps in `README.md`, then request
  the failing path with `curl -i`.
