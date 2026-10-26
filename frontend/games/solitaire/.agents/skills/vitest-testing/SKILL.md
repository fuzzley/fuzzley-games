---
name: vitest-testing
description: The Solitaire Collection's Vitest setup (specs under test/, Node by default and jsdom per spec, the AnalogJS runner), its Angular TestBed doubles (configureUiTestBed), its engine fixtures and its coverage floor. Triggers on: vitest, unit test, spec, TestBed, coverage, test structure.
---

# Testing the Solitaire Collection with Vitest

This skill covers how the Solitaire Collection runs and writes its specs, with
Vitest (v5) and the AnalogJS Vitest Angular runner. The rules every spec in
the repository follows (Arrange-Act-Assert, the public API, state over
interactions, real objects over mocks) are in `.agents/AGENTS.md`, under
"Writing Unit Tests". Paths are relative to `frontend/games/solitaire/`.

## Commands and Coverage Floors

Run these from `frontend/games/solitaire/`, or as
`yarn workspace solitaire <script>` from `frontend/`.

- **Run Tests**: `yarn test` (single pass, with coverage) or `yarn test:watch`
  (watch mode). `yarn vitest run <path>` runs one spec without coverage.
- **Enforced Floor**: the `thresholds` in `vitest.config.ts`, set a little under
  the suite's real figures, which `yarn test`, and so CI, checks. _Never allow
  code changes to drop coverage below them_, and raise them as the real
  figures rise.

## Setup

- Specs live under `test/`, in a tree that mirrors `src/`
  (`test/games/<game>/<game>_game.spec.ts` tests `src/games/<game>/`), and
  import the code under test through the `@/` alias, their helpers through
  `@test/`.
- They run in Node. A spec that renders the Angular shell asks for jsdom with
  a `// @vitest-environment jsdom` comment at its top. `test/test-setup.ts`
  starts Angular's zoneless TestBed, polyfills `<dialog>` under jsdom (with
  `@fz/ui/testing`'s `installDialogPolyfill`), and
  gives Node an in-memory `localStorage`, cleared before every test.
- Specs use Vitest's globals (`describe`, `it`, `expect`, `vi`).

## Engine Specs

- Drive a rule or a game with real engine primitives (`Card`, `Pile`,
  `Deck`): `test/support/card_builder.ts` builds cards, and
  `test/support/test_tabletop.ts` wraps a real tabletop whose piles take any
  card.
- An engine spec never names a game: it plays on `test/support/fake_table`,
  which ESLint enforces for `test/engine/`. Extend the fixture when it cannot
  express what you need.
- Pass a game a fixed `random` (`test/support/sequence_random.ts`) and, where
  it sharpens the test, a short deck, so a deal is the same every run.

## Angular UI Testing with `configureUiTestBed`

- Use `configureUiTestBed` from `test/support/ui/testbed.ts` to wire Angular
  UI component tests.
- Use the UI test doubles beside it in `test/support/ui` (game, catalog,
  presentation, and documentation mocks). The catalog mock is typed as a
  `Pick` of the real service, so it cannot drift out of shape unnoticed.
- **Do NOT assert production prose**: Avoid checking exact wording of
  documentation/rules in UI specs. Use the test documentation registry
  provided by `configureUiTestBed`.
