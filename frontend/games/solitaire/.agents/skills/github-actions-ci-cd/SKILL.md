---
name: github-actions-ci-cd
description: The deploy workflow (.github/workflows/deploy.yml), its quality gate, and the site-build release that fuzzley.games fetches the game from. Triggers on: github actions, workflow, ci/cd, deploy pipeline, quality gate, deploy.yml, site-build, release.
---

# GitHub Actions CI/CD Pipeline & Deployment

> How fSolitaire reaches the live site, and what stands between a bad commit and
> production.

The workflow is `.github/workflows/deploy.yml` ("Build and publish to
fuzzley.games"). **Read it before changing it** — it is one short file, and the
summary below is a guide to its intent, not a substitute for its contents.

## Shape of the Pipeline

Two jobs, on push to `main`, a pull request into `main`, or a manual
`workflow_dispatch`:

1. **`verify`** — checkout, Node 26, Corepack, a restore of Yarn's package
   cache, an immutable install, then `yarn lint`, `yarn tsc` and `yarn test` as
   three separate steps. Separate rather than `yarn verify`, because
   `yarn verify` also runs a build that the second job would immediately
   repeat. This is the only job a pull request runs.
2. **`build-and-publish`** — `needs: verify`, and skipped for a pull request.
   Builds with `VITE_COMMIT_SHA` set, packs `dist/` as
   `solitaire-<short sha>.tar.gz`, uploads it to the rolling `site-build`
   release, then replaces `latest.json` there (the archive's name, SHA-256,
   commit and build time) and moves the `site-build` tag to the commit. Its
   concurrency group runs one deploy at a time: a later push waits, and a
   deploy under way is never cancelled.

The game goes live from there without this repository's help:
fuzzley/fuzzley-games pins one archive in its `frontend/games.json`, and a
scheduled workflow there moves the pin to the newest build within about 15
minutes, after building and checking the site with it. Its dashboard links
each game by its hash route and shows the screenshots this build ships, so a
build that drops or renames a game the dashboard links fails there, opens a
"Game update failed" issue, and stays unpublished until the dashboard catches
up.

## Principles

1. **The gate is the point.** `build-and-publish` must keep `needs: verify`.
   Nothing reaches the release without lint, both typecheck passes and the
   full suite.
2. **`yarn install --immutable`.** CI must fail on a lockfile that does not
   match `package.json` rather than quietly resolving something else.
3. **Corepack before Yarn.** `corepack enable` has to run before any `yarn`
   command, or the runner's bundled Yarn 1 answers instead of `yarn@4.17.1`.
   That includes the step that asks Yarn for its cache folder, which is why the
   cache is restored with `actions/cache` rather than `setup-node`'s
   `cache: yarn`, which looks the folder up before Corepack runs.
4. **Pull requests never deploy.** `build-and-publish` keeps its
   `if: github.event_name != 'pull_request'`, so a branch is checked without
   being published.
5. **The archive goes up before `latest.json`,** so `latest.json` never names
   a file that isn't there.
6. **Never delete the pinned archive.** The release keeps the ten newest
   archives and the one fuzzley-games' `frontend/games.json` pins, read from
   its `main`. If that file can't be read, nothing is deleted.
7. **No cross-repository tokens.** The job uses only its own `GITHUB_TOKEN`;
   fuzzley-games pulls from the release rather than this repository pushing to
   it.

## Coverage Is Not Gated in CI

`vitest.config.ts` sets a coverage floor, but CI runs `yarn test`, not `yarn test:coverage` — **the floor is only enforced
when someone runs it locally.** Do not read a green pipeline as evidence that
coverage held. Either run `yarn test:coverage` before pushing, or change the
workflow's test step if the gate is wanted for real.

## Troubleshooting

- **Lint failures.** Reproduce with `yarn lint`. The usual cause is an
  architectural boundary violation from `@typescript-eslint/no-restricted-imports`
  — see `add-solitaire-game`. In a script under `tools/` or `.agents/`, it is
  a JSDoc type tag gone missing; AGENTS.md's "Writing Documentation" says which.
- **Typecheck failures.** `yarn tsc` already runs all three passes: `tsc` over
  the app, `yarn tsc:test` over the specs, then `yarn tsc:scripts` over the Node
  scripts, from their JSDoc, by `tsconfig.scripts.json`. A failure naming a
  `test/` file comes from the second, and one naming a `.mjs` file from the
  third.
- **The release was updated but the site wasn't.** Look for an open "Game
  update failed" issue in fuzzley/fuzzley-games, and check that its Update
  games workflow is enabled: GitHub turns scheduled workflows off after 60
  days without activity.
