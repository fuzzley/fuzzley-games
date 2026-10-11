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
- **Full Check**: `yarn verify` (type-check, test, then build), which is what
  CI runs.

## Setup

Vitest is configured in the `test` block of `frontend/vite.config.ts`: globals
on, a `jsdom` environment, `frontend/src/test-setup.ts` to start Angular's test
environment, and every `*.spec.ts` or `*.test.ts` under `src/` picked up. A
spec sits beside the file it tests, named after it.

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

- Get a service with `TestBed.inject(...)` and render a component with
  `TestBed.createComponent(...)`, setting its inputs through
  `fixture.componentRef.setInput(...)`.
- Let a change settle before asserting on it: `fixture.detectChanges()` for a
  template, `TestBed.tick()` for an effect.
- jsdom keeps one document for a whole spec file, so reset any browser state a
  test touches (`localStorage`, attributes on `document.documentElement`) in a
  `beforeEach`.

### 3. Testing Principles

- **Test via Public API**: Never access private properties or methods using `(component as any)` or bracket accessors.
- **Verify State over Interactions**: Prefer inspecting resulting object state over verifying spy call counts.
- **Real Objects over Mocks**: Use real instances rather than mock objects whenever feasible.
- **No Complex Test Logic**: Keep tests straightforward and deterministic without conditional branches (`if`/`else` inside test cases).
- **Test Helpers**: Move verbose setup into a helper function so each test's intent stays clear.
