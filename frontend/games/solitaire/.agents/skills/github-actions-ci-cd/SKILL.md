---
name: github-actions-ci-cd
description: The deploy workflow (.github/workflows/deploy.yml), its quality gate, and the cross-repository asset sync that publishes fSolitaire onto the main website. Triggers on: github actions, workflow, ci/cd, deploy pipeline, quality gate, deploy.yml.
---

# GitHub Actions CI/CD Pipeline & Deployment

> How fSolitaire reaches the live site, and what stands between a bad commit and
> production.

The workflow is `.github/workflows/deploy.yml` ("Build and Sync to Main
Website"). **Read it before changing it** — it is one short file, and the
summary below is a guide to its intent, not a substitute for its contents.

## Shape of the Pipeline

Two jobs, on push to `main` or a manual `workflow_dispatch`:

1. **`verify`** — checkout, Node 26, Corepack, an immutable install, then
   `yarn lint`, `yarn tsc` and `yarn test` as three separate steps. Separate
   rather than `yarn verify`, because `yarn verify` also runs a build that the
   second job would immediately repeat.
2. **`build-and-sync`** — `needs: verify`. Builds, clones `fuzzley/fuzzley` with
   a PAT, replaces `main-website/frontend/public/project/solitaire` with
   `dist/*`, and commits only if something changed.

`workflow_dispatch` takes a `force` boolean. Without it the sync step ends at
`git diff-index --quiet HEAD` and skips the commit when the build is
byte-identical to what is already published; `force` pushes an empty commit
anyway, which is the escape hatch when the website repo has drifted.

## Principles

1. **The gate is the point.** `build-and-sync` must keep `needs: verify`.
   Nothing reaches the live site without lint, both typecheck passes and the
   full suite.
2. **`yarn install --immutable`.** CI must fail on a lockfile that does not
   match `package.json` rather than quietly resolving something else.
3. **Corepack before Yarn.** `corepack enable` has to run before any `yarn`
   command, or the runner's bundled Yarn 1 answers instead of `yarn@4.17.1`.
4. **The destination is wiped, not merged.** The sync `rm -rf`s the destination
   directory before copying, so a file that stops being produced stops being
   served. Anything hand-added under that path in the website repo is lost on
   the next deploy.
5. **No secrets in logs.** `MAIN_REPO_DEPLOY_PAT` is interpolated into a clone
   URL. Never echo it, and never `set -x` a step that handles it.

## Coverage Is Not Gated in CI

`vitest.config.ts` sets a floor (90% statements/functions/lines, 80% branches),
but CI runs `yarn test`, not `yarn test:coverage` — **the floor is only enforced
when someone runs it locally.** Do not read a green pipeline as evidence that
coverage held. Either run `yarn test:coverage` before pushing, or change the
workflow's test step if the gate is wanted for real.

## Troubleshooting

- **Lint failures.** Reproduce with `yarn lint`. The usual cause is an
  architectural boundary violation from `@typescript-eslint/no-restricted-imports`
  — see `add-solitaire-game`. (`register.cjs` in the lint script is
  only a `util.styleText` polyfill for older Node; it is not lint config.)
- **Typecheck failures.** `yarn tsc` already runs both passes: `tsc` over the
  app, then `yarn tsc:test` over the specs. A failure naming a `test/` file
  comes from the second.
- **Sync step failures.** Almost always the PAT — expired, or missing push
  rights on `fuzzley/fuzzley`. The clone is the first thing to fail.
