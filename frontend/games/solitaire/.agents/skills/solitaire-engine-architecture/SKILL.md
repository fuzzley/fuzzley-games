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
      [ src/games ]            Game Rules & Variants (Klondike, FreeCell, Spider)
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
   - Variant deal rules, scoring mechanics, layout setup (`games/klondike`, `games/freecell`, `games/spider`).
   - **MUST NOT** import `ui`, `@angular/*`, or `RxJS`. A game publishes through the engine's own `EventEmitter`; the Angular shell adapts to reactive types at its own boundary.

## Adding a New Solitaire Game Variant

To add a new solitaire variant (e.g. Pyramid, Yukon, TriPeaks):

1. Implement variant rules and layout setup in `src/games/<variant>/`.
2. Declare game rules, catalog entry, and deal logic in `src/ui/app/provider/game_catalog.ts`.
3. Map the game ID to a Phaser board factory in `src/ui/app/provider/board_catalog.ts`.
4. Add documentation rules page entry in `src/ui/app/provider/game_documentation_data.ts`.
