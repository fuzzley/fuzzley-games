---
name: vitest-testing
description: Unit testing guidelines, AAA structure, Vitest runner setup, and Angular TestBed patterns for the frontend. Triggers on: vitest, unit test, spec, TestBed, test structure.
---

# Vitest & Unit Testing Best Practices Skill

This skill defines the testing standard for the frontend, which runs its specs
with Vitest through the AnalogJS Vite plugin.

## Commands

Run from `frontend/`:

- **Run Tests**: `yarn test` (a single pass).
- **Full Check**: `yarn verify` (lint, type-check, test, then build), which is
  what CI runs. Vitest strips types without checking them; `yarn typecheck`
  is what type-checks the specs.

## Setup

Vitest is configured in the `test` block of `frontend/vite.config.ts`, as two
projects:

- **`app`**: every `*.spec.ts` under `src/`, in `jsdom`, with the Angular
  plugin and `frontend/src/test-setup.ts`, which starts Angular's test
  environment and loads jest-dom's matchers.
- **`tools`**: every `*.spec.ts` under `tools/`, in Node, for the build
  scripts and Vite plugins. `yarn vitest run --project tools` runs only
  these.

A spec sits beside the file it tests, named after it.

Specs use Vitest's globals (`describe`, `it`, `expect`, `vi`) without
importing them. The globals are not optional: Angular's TestBed and Testing
Library register their teardown on the global `afterEach`, so with globals
off TestBed would never reset between tests.

## Test Architecture & Rules

### 1. AAA (Arrange-Act-Assert) Pattern

Structure every test case into distinct sections:

```ts
it("hides the items that do not match a search", () => {
  // Arrange
  const list = createList(["Apple", "Banana"]);

  // Act
  list.search("ban");

  // Assert
  expect(list.visible()).toEqual(["Banana"]);
});
```

- Avoid multiple AAA cycles within a single test case; split into focused, single-purpose test cases.

### 2. Angular Components & Services

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
  `frontend/src/app/testing/catalog.ts` and asserts on `TEST_CATALOG`'s
  games, never the site's own list, so adding a game breaks no spec. Rules
  every real entry must keep (unique slugs, real dates) are checked in
  `frontend/src/app/provider/games.spec.ts`, without counting anything.
- Change detection is zoneless. `render` and user-event's actions leave the
  template up to date; an effect in a service runs on `TestBed.tick()`.
- jsdom keeps one document for a whole spec file, so reset any browser state a
  test touches (`localStorage`, attributes on `document.documentElement`) in a
  `beforeEach`.

### 3. Testing Principles

- **Test via Public API**: Never access private properties or methods using `(component as any)` or bracket accessors.
- **Verify State over Interactions**: Prefer inspecting resulting object state over verifying spy call counts.
- **Real Objects over Mocks**: Use real instances rather than mock objects whenever feasible.
- **No Complex Test Logic**: Keep tests straightforward and deterministic without conditional branches (`if`/`else` inside test cases).
- **Test Helpers**: Move verbose setup into a helper function so each test's intent stays clear.
