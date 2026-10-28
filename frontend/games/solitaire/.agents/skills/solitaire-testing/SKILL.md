---
name: solitaire-testing
description: How the Solitaire Collection runs and writes its specs — specs under test/, Node by default and jsdom per spec, the shell's TestBed doubles (configureUiTestBed), the engine's fixtures (fake_table, card_builder, sequence_random), its boards run on real Phaser (runFakeTableBoard, board_run, atlas_scene) and its coverage floor. Triggers on: solitaire spec, solitaire test, configureUiTestBed, fake_table, test/support, board spec, runFakeTableBoard, solitaire coverage, frontend/games/solitaire tests.
---

# Testing the Solitaire Collection

This skill covers how the Solitaire Collection runs and writes its specs, with
Vitest and the AnalogJS Vitest Angular runner. The rules every spec in the
repository follows (Arrange-Act-Assert, the public API, state over
interactions, real objects over mocks) are in `.agents/AGENTS.md`, under
"Writing Unit Tests", and the patterns the shell's specs share with every
Angular workspace's are the repository's `angular-testing` skill's. Paths are
relative to `frontend/games/solitaire/`.

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
- They run in Node. A spec that renders the Angular shell, or imports
  Phaser, even through `src/ui/app/provider/board_catalog.ts`, asks for
  jsdom with a `// @vitest-environment jsdom` comment at its top.
  `test/test-setup.ts` starts Angular's zoneless TestBed; under jsdom it
  polyfills `<dialog>` (with `@fz/ui/testing`'s `installDialogPolyfill`)
  and installs `@fz/phaser/testing`'s headless Phaser, before anything
  imports Phaser; and it gives Node an in-memory `localStorage`, cleared
  before every test.
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
- `configureUiTestBed` provides `@fz/phaser/testing`'s
  `provideFakePhaserCanvas()`, so the board's canvas loads no Phaser. A spec
  that builds its own TestBed around the routed component provides it too,
  as `test/ui/app/routes.spec.ts` does, and one that drives the canvas reads
  its hosts from `FakePhaserCanvas`, as
  `test/ui/app/component/game_canvas/game_canvas.component.spec.ts` does,
  which runs the board it was shown through `runScene()`.
- **Do NOT assert production prose**: Avoid checking exact wording of
  documentation/rules in UI specs. Use the test documentation registry
  provided by `configureUiTestBed`.

## Phaser Specs

- `src/engine/render/phaser`, and the boards `src/engine/board` builds on
  it, are specced on real Phaser, through `@fz/phaser/testing`'s headless
  harness, which the repository's `phaser-core` skill describes. Nothing
  stands in for Phaser.
- A board runs through `test/support/fake_table/scene.ts`'s
  `runFakeTableBoard()`: the fake game's board, on a canvas of its design
  size, so it lays out at a scale of 1, its atlases served from the
  workspace by `test/support/workspace_files.ts`. Its options say
  otherwise, such as a canvas for another pixel ratio (Phaser's `zoom`)
  or atlases an earlier board left loaded (`prepare`).
  `test/engine/board/table_board_scene.spec.ts` calls
  `makeTableBoardScene` itself, on grids of its own.
- `test/support/board_run.ts` plays a running board as a player does, at
  points in the canvas's pixels: it presses, double presses, drags and
  hovers, and reads a card's sprite and whether a border is drawn. Step a
  frame (`run.advance(16)`) before the first press: the first frame lays
  the board out, and Phaser takes in what was made interactive then.
- A spec of one piece of a board runs a scene of its own:
  `test/support/atlas_scene.ts`'s `runSceneWithAtlases()` has card
  atlases loaded to make sprites from, and its `loadAtlases()` leaves
  more loaded in a running game; `@fz/phaser/testing`'s `runBareScene()`
  loads nothing.
- Assert on the game objects, never on pixels: the context draws nothing.
  What a drawing leaves nothing to read of, such as a border's stroke or a
  dynamic texture's render, a call-through spy on Phaser's prototype
  records.
- An error a pointer handler throws reaches the window's `error` event,
  not the spec: read it there, capturing no stack, as
  `test/engine/render/phaser/scene/board_input_manager.spec.ts`'s
  `errorsDuring()` does, since jsdom maps the first stack through the
  source map of Phaser's whole bundle, which can outlast a spec's timeout.
