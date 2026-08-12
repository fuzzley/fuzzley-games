---
name: typescript-strict-patterns
description: How fSolitaire models cards and moves in TypeScript — the core enums, readonly identity, the move/undo shape, and Google TypeScript style compliance. Triggers on: typescript, type safety, strict mode, immutable state, card primitives, readonly, google ts style.
---

# TypeScript Strict Patterns & Type Safety

> The type conventions this codebase actually uses. Match them; do not import
> patterns from other card-game projects.

## Card Primitives Are Numeric Enums (`src/engine/core`)

`src/engine/core/card/playing_card.ts` defines:

```ts
export enum Suit {
  SPADE,
  HEART,
  DIAMOND,
  CLUB,
}

export enum Rank {
  ACE,
  TWO,
  THREE,
  // ... through KING
}
```

**Not string literal unions.** `Rank`'s members are ordered and consecutive on
purpose — the build rules compare them arithmetically, so `ACE + 1 === TWO` and
a descending run is a subtraction rather than a lookup table. Changing these to
strings would silently break every rank comparison in the games.

## Identity: `id` vs `faceKey`

`Card` (`src/engine/core/card/card.ts`) carries two identifiers, and the
distinction matters:

- **`readonly id`** — this one card, uniquely across the whole game.
- **`readonly faceKey`** — the artwork. Cards that look alike share one.

Two-deck games hold two Queens of Hearts: the same card to look at, two
different cards to move. **Use `id` for anything positional and `faceKey` for
anything visual or set-like.** Hashing a board position on `id` when you meant
`faceKey` produces a key that never collides where it should.

On `PlayingCard`, identity is fixed at construction (`id`, `suit`, `rank`,
`faceKey` are all `readonly`) so a card can never exist half-built; only
`faceUp` changes over its lifetime.

## Moves Are Applied, Not Reduced

The engine is **not** a reducer over an action union. `TableGame`
(`src/engine/tableau/table_game.ts`) is an abstract class that mutates piles and
records history:

- `canMoveCardToPile(cardId, targetPileId): boolean` — ask the rules.
- `resolveMove(...)` → `ResolvedMove` (`movingStack`, `sourcePile`, `targetPile`).
- `moveCardToPile(cardId, targetPileId): boolean` — perform it.
- `applyMoveEffects(move): MoveEffects` — the variant's hook for score changes,
  cards it flipped, and `followUpTransfers` for consequences of the move (Spider
  sending a completed run to a foundation). Recording those here rather than as
  a separate action is what makes one `undo()` take the whole thing back.
- `undo()` reverses an `AppliedMove` off the history.

Where immutability lives here is in the **shape of these records** —
`ResolvedMove` and `MoveEffects` are fully `readonly`, with `readonly
PlayingCard[]` and `readonly string[]` members — not in replacing the board on
every move. Follow that: new engine types describing something that happened are
`readonly` throughout.

## Architectural Import Boundaries

Enforced as hard ESLint errors in `eslint.config.cjs`. The canonical table lives
in `.agents/AGENTS.md` and is explained in the `add-solitaire-game` skill —
**read it there rather than keeping a fourth copy in sync.**

Two points that are easy to get wrong:

- `rxjs` is restricted in every engine tier _and_ in `src/games/*`. A game
  publishes through the engine's own `EventEmitter`
  (`src/engine/core/common/event_emitter.ts`); the Angular shell adapts to
  reactive types at its own boundary.
- `src/engine/render/phaser` may import Phaser, but not
  `@/engine/tableau/view/table_view_builder` — the adapter draws whatever it is
  handed and must not reach up for the thing that builds the view.

## Style

- **No `as any`.** Use generics, or `unknown` plus a type guard. `instance as
unknown as Target` is a last resort worth a comment explaining why.
- **Explicit return types** on exported functions and public methods.
- **`readonly` collections** on anything describing state that already happened.
- Follow the [Google TypeScript style guide](https://google.github.io/styleguide/tsguide.html).
