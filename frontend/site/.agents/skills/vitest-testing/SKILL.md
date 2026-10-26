---
name: vitest-testing
description: The site's Vitest setup (the app and tools projects, jsdom, globals, the coverage floors) and its Angular patterns (Testing Library queries by role, user-event, TEST_CATALOG, zoneless change detection). Triggers on: vitest, unit test, spec, TestBed, Testing Library, coverage, test structure.
---

# Testing the site with Vitest

This skill covers how the site runs and writes its specs, with Vitest
through the AnalogJS Vite plugin. The rules every spec in the repository
follows (Arrange-Act-Assert, the public API, state over interactions, real
objects over mocks) are in `.agents/AGENTS.md`, under "Writing Unit Tests".
Paths are relative to `frontend/site/`.

## Commands and Coverage

- **Run Tests**: `yarn workspace site test` from `frontend/` runs the site's
  specs once, with coverage; `yarn test` there runs every workspace's.
  `yarn vitest run <path>`, from `frontend/site/`, runs one spec without
  coverage.
- **Coverage Floors**: the `test` block of `vite.config.ts` holds `src/` to
  a floor near 100% and `tools/` to a far lower one, since what the scripts
  download and write runs only in a real build. `yarn test`, which CI runs,
  fails below either; never let a change drop below them, and raise them as
  the real figures rise.
- **Full Check**: `yarn verify` in `frontend/` (lint, type-check, test, then
  build), which is what CI runs. Vitest strips types without checking them;
  `yarn typecheck` is what type-checks the specs.

## Setup

Vitest is configured in the `test` block of `vite.config.ts`, as two
projects:

- **`app`**: every `*.spec.ts` under `src/`, in `jsdom`, with the Angular
  plugin and `src/test-setup.ts`, which starts Angular's test environment and
  loads jest-dom's matchers.
- **`tools`**: every `*.spec.ts` under `tools/`, in Node, for the build
  scripts and Vite plugins. `yarn workspace site vitest run --project tools`
  runs only these.

A spec sits beside the file it tests, named after it.

Specs use Vitest's globals (`describe`, `it`, `expect`, `vi`) without
importing them. The globals are not optional: Angular's TestBed and Testing
Library register their teardown on the global `afterEach`, so with globals
off TestBed would never reset between tests.

## Angular Components & Services

- Render a component with `render()` from `@testing-library/angular`, passing
  its `inputs` and `providers`, and find what it shows through `screen` by
  role, label or text:
  `screen.getByRole("link", { name: "Play Klondike" })`. Never query by a CSS
  class: a role query also checks what assistive technology is told, and a
  restyle can't break it.
- Drive it as a person would, with `@testing-library/user-event`:
  `const user = userEvent.setup()`, then `await user.click(...)` or
  `await user.keyboard("{Escape}")`.
- Assert with jest-dom's matchers (`toHaveAttribute`, `toHaveFocus`,
  `toBeInTheDocument`, `toHaveTextContent`).
- Get a service with `TestBed.inject(...)`.
- A spec that touches the games provides `provideTestCatalog()` from
  `src/app/testing/catalog.ts` and asserts on `TEST_CATALOG`'s games, never
  the site's own list, so adding a game breaks no spec. Rules every real
  entry must keep (unique slugs, real dates) are checked in
  `src/app/provider/games.spec.ts`, without counting anything.
- Change detection is zoneless. `render` and user-event's actions leave the
  template up to date; an effect in a service runs on `TestBed.tick()`.
- jsdom keeps one document for a whole spec file, so reset any browser state a
  test touches (`localStorage`, attributes on `document.documentElement`) in a
  `beforeEach`.
