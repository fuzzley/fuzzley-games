---
name: vitest-testing
description: Unit testing guidelines, AAA structure, Vitest v4 runner patterns, Angular TestBed doubles (configureUiTestBed), and coverage floor enforcement for fSolitaire.
---

# Vitest & Unit Testing Best Practices Skill

This skill defines the testing standard for fSolitaire using Vitest (v4) and AnalogJS Vitest Angular runner.

## Coverage Floors & Commands

- **Run Tests**: `yarn test` (single pass) or `yarn test:watch` (watch mode).
- **Check Coverage**: `yarn test:coverage`.
- **Enforced Floor**:
  - Statements, Functions, Lines: **90%**
  - Branches: **80%**
  - *Never allow code changes to drop coverage below these thresholds.*

## Test Architecture & Rules

### 1. AAA (Arrange-Act-Assert) Pattern
Structure every test case into distinct sections:
```ts
it('moves card from tableau to foundation when valid', () => {
  // Arrange
  const game = createTestGame();
  
  // Act
  const result = game.executeMove(validMove);
  
  // Assert
  expect(result.success).toBe(true);
  expect(game.foundation.count).toBe(1);
});
```
- Avoid multiple AAA cycles within a single test case; split into focused, single-purpose test cases.

### 2. Angular UI Testing with `configureUiTestBed`
- Use `configureUiTestBed` from `test/support/ui` to wire Angular UI component tests.
- Use UI test doubles provided in `test/support/ui` (game, catalog, presentation, and documentation mocks).
- **Do NOT assert production prose**: Avoid checking exact wording of documentation/rules in UI specs. Use the test documentation registry provided by `configureUiTestBed`.

### 3. Testing Principles
- **Test via Public API**: Never access private properties or methods using `(component as any)` or bracket accessors.
- **Verify State over Interactions**: Prefer inspecting resulting object state over verifying spy call counts.
- **Real Objects over Mocks**: Use real engine primitives (`Card`, `Pile`, `Deck`) rather than mock objects whenever feasible.
- **No Complex Test Logic**: Keep tests straightforward and deterministic without conditional branches (`if`/`else` inside test cases).
