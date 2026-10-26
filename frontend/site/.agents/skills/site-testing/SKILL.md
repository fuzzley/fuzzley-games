---
name: site-testing
description: How the site runs and writes its specs — its two Vitest projects (the app in jsdom, the tools in Node), its coverage floors, and TEST_CATALOG, the small catalog its specs play on. Triggers on: site spec, site test, site coverage, TEST_CATALOG, provideTestCatalog, vite-plugins spec, frontend/site tests.
---

# Testing the site

This skill covers how the site runs its specs and what they share. The
patterns every Angular workspace's specs follow (Testing Library by role,
user-event, jest-dom, zoneless change detection, what jsdom keeps) are the
repository's `angular-testing` skill's, and the rules every spec follows are
in `.agents/AGENTS.md`, under "Writing Unit Tests". Paths are relative to
`frontend/site/`.

## Commands and Coverage

- **Run Tests**: `yarn workspace site test` from `frontend/` runs the site's
  specs once, with coverage; `yarn test` there runs every workspace's.
  `yarn vitest run <path>`, from `frontend/site/`, runs one spec without
  coverage.
- **Coverage Floors**: the `test` block of `vite.config.ts` holds `src/` to
  a floor near 100% and `tools/` to a far lower one, since what the scripts
  download and write, and what the Vite plugins' hooks do, runs only in a
  real build. `yarn test`, which CI runs, fails below either; never let a
  change drop below them, and raise them as the real figures rise.
- **Full Check**: `yarn verify` in `frontend/` (lint, type-check, test, then
  build), which is what CI runs.

## Setup

Vitest is configured in the `test` block of `vite.config.ts`, as two
projects, built from `@fz/dev/vitest`'s pieces: `angularSpecs()` and
`nodeSpecs()` say where each runs, and `coverage()` what the floors cover:

- **`app`**: every `*.spec.ts` under `src/`, in `jsdom`, with the Angular
  plugin and `src/test-setup.ts`, which starts Angular's test environment and
  loads jest-dom's matchers.
- **`tools`**: every `*.spec.ts` under `tools/`, in Node, for the build
  scripts and Vite plugins. `yarn workspace site vitest run --project tools`
  runs only these. A plugin's logic is a function the spec calls, such as
  `manifestProblems()` beside `checkGameManifests()`, and a script's
  dependencies, such as `fetch`, are parameters with the real ones as
  defaults.

A spec sits beside the file it tests, named after it.

## The Catalog

- A spec that touches the games provides `provideTestCatalog()` from
  `src/app/testing/catalog.ts` and asserts on `TEST_CATALOG`'s games, never
  the site's own list, so adding a game breaks no spec.
- Rules every real entry must keep (unique slugs, real dates) are checked
  in `src/app/provider/games.spec.ts`, without counting anything.
