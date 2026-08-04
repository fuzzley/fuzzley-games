---
name: solitaire-engine-architecture
description: Solitaire engine layer hierarchy, pure card primitives, renderer-agnostic math, generic tableau runtime, variant implementation rules, and ESLint architectural boundaries.
---

# Solitaire Engine Architecture & Boundaries Skill

This skill defines the decoupled 6-tier architecture for fSolitaire. Each tier may depend only on the tiers strictly below it.

## Architecture Layer Breakdown

```
       [ src/ui ]              Angular Application Shell (Header, Navigation, UI Controls)
           |
      [ src/games ]            Game Rules & Variants (one directory per game)
           |
  +--------+--------+
  |                 |
  v                 v
[ engine/tableau ] [ engine/render/phaser ]   Solitaire Runtime & Phaser Canvas Adapter
  |                 |
  +--------+--------+
           |
           v
   [ engine/render ]           Layout Math, View Contracts, Drag Mathematics (Phaser-free)
           |
           v
    [ engine/core ]            Cards, Piles, Decks, Suits, Ranks, RNG (Framework-free)
```

## Layer Constraints & ESLint Boundary Rules

Architectural boundaries are strictly enforced as build errors via ESLint (`@typescript-eslint/no-restricted-imports`):

1. **`src/engine/core`** _(Framework-Free Core)_
   - Pure card, suit, rank, deck, pile, and RNG primitives.
   - **MUST NOT** import `Phaser`, `Angular`, `RxJS`, `engine/render`, `engine/tableau`, `games`, or `ui`.
2. **`src/engine/render`** _(Renderer-Agnostic Layout Math)_
   - Pure view contracts, layout mathematics, drag bounds, and pile bounds.
   - **MUST NOT** import `Phaser`, `engine/tableau`, `games`, `ui`, `Angular`, or `RxJS`.
3. **`src/engine/render/phaser`** _(Phaser 4 Adapter)_
   - Canvas card rendering, sprites, scenes, and texture management.
   - **MUST NOT** import `games`, `ui`, `Angular`, or `RxJS`.
4. **`src/engine/tableau`** _(Solitaire Generic Runtime)_
   - Generic solitaire runtime engine (tableau rules, zones, moves, undo/redo stack, table view builder).
   - **MUST NOT** import `Phaser`, `games`, `ui`, `Angular`, or `RxJS`.
5. **`src/games/*`** _(Variant Extensions)_
   - Per-game rules, zones, deal, layout, board and gestures — one directory per
     game (`games/klondike`, `games/freecell`, `games/montana`, …). Code shared
     between games lives in `games/common`: `completed_runs.ts` collects
     King-to-Ace runs, `stock_pile.ts` draws and recycles, `row_deal.ts` deals a
     card to every column, `stockless_gestures.ts` is the gesture map for a game
     with no stock, and `board_scene_factory.ts` builds any game's scene.
   - **MUST NOT** import `ui`, `@angular/*`, or `RxJS`. A game publishes through the engine's own `EventEmitter`; the Angular shell adapts to reactive types at its own boundary.

## Adding a New Solitaire Game

A game is six files in `src/games/<game>/` — `*_rules.ts`, `*_zones.ts`,
`*_deal.ts`, `*_game.ts`, `*_layout.ts`, `*_board.ts` — plus a `*_gestures.ts`
when it has a stock, and three provider edits:

1. Implement the rules, zones, deal and layout in `src/games/<game>/`.
2. Declare the catalog entry in `src/ui/app/provider/game_catalog.ts`.
3. Map the game id to a Phaser board factory in `src/ui/app/provider/board_catalog.ts`.
4. Add a documentation page in `src/ui/app/provider/game_documentation_data.ts`,
   and capture its hero screenshot to `public/docs/screenshots/<id>/overview.png`.
   A spec requires the page; the screenshot is what the page shows.

Routes and the game rail need no edit — both are derived from the catalog.

### A variant or a game of its own?

The line the existing games draw: **a different board grid means a different
catalog entry; the same grid with different rules means a variant option** on an
existing one. Baker's Game is `FreeCellGame` under different column rules, and
Alaska, Whitehead, Josephine and Will o' the Wisp are options on the games they
share a board with — while Maria and Limited are entries of their own, because
nine and twelve columns are not ten.

Pair a variant's build rule with its grab rule in one table, as
`freecell_rules.ts` and `forty_thieves_rules.ts` do. A run that can be lifted
under one and not landed under the other is a bug that only appears mid-drag.
